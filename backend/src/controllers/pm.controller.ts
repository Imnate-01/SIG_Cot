import { Request, Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { contextoAuth } from '../middlewares/requireAuth'
import { ErrorHttp, responderError } from '../utils/http'
import { pickFields } from '../utils/pickFields'

/**
 * Módulo PM (Preventive Maintenance): checklist de actividades por cliente.
 * Tablas y funciones: supabase/migrations/20261023_01_modulo_pm.sql
 *
 * Todo el acceso usa el cliente del usuario (RLS). Cualquier usuario con
 * sesión puede ver y trabajar los PM; cada cambio queda con su autor.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FECHA = /^\d{4}-\d{2}-\d{2}$/

function uuid(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorHttp(400, `Invalid ${campo}`)
  return valor
}

function fecha(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !FECHA.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw new ErrorHttp(400, `${campo} must use the format YYYY-MM-DD`)
  }
  return valor
}

/** Datos del encabezado del PM que el usuario puede capturar/editar. */
const CAMPOS_ENCABEZADO = [
  'planta', 'linea', 'contacto_nombre', 'contacto_telefono', 'contacto_correo',
  'sam', 'po_numero', 'fse_filler', 'fse_downline', 'fecha_fin', 'notas_abiertas',
] as const

const ESTADOS_MANUALES = ['active', 'cancelled'] as const

type UsuarioBasico = { id: string; nombre: string | null; email: string | null }

/** Nombres de los usuarios mencionados (responsables, colaboradores, creador). */
async function nombresDeUsuarios(supabase: SupabaseClient, ids: Array<string | null | undefined>) {
  const unicos = [...new Set(ids.filter((x): x is string => !!x))]
  if (unicos.length === 0) return {} as Record<string, UsuarioBasico>
  const { data, error } = await supabase.from('usuarios').select('id, nombre, email').in('id', unicos)
  if (error) throw error
  return Object.fromEntries((data || []).map((u: UsuarioBasico) => [u.id, u]))
}

async function registrarHistorial(
  supabase: SupabaseClient, tareaId: string, usuarioId: string, accion: string, detalle?: unknown,
) {
  const { error } = await supabase
    .from('pm_tarea_historial')
    .insert({ tarea_id: tareaId, usuario_id: usuarioId, accion, detalle: detalle ?? null })
  if (error) throw error
}

/** El PM queda "completed" cuando todas sus tareas están hechas y vuelve a "active" si se reabre una. */
async function sincronizarEstado(supabase: SupabaseClient, expedienteId: string) {
  const { data: exp, error } = await supabase
    .from('pm_expedientes').select('estado').eq('id', expedienteId).single()
  if (error) throw error
  if (exp.estado === 'cancelled') return exp.estado

  const { count, error: errCount } = await supabase
    .from('pm_tareas').select('id', { count: 'exact', head: true })
    .eq('expediente_id', expedienteId).eq('completada', false)
  if (errCount) throw errCount

  const nuevo = (count ?? 0) === 0 ? 'completed' : 'active'
  if (nuevo !== exp.estado) {
    const { error: errUpd } = await supabase
      .from('pm_expedientes').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', expedienteId)
    if (errUpd) throw errUpd
  }
  return nuevo
}

export class PmController {

  // GET /api/pm?estado=active|completed|cancelled&cliente_id=
  async listar(req: Request, res: Response) {
    try {
      const { supabase } = contextoAuth(req)
      let consulta = supabase
        .from('pm_expedientes')
        .select('*, clientes(id, nombre, empresa), pm_tareas(id, completada, fecha_limite)')
        .order('fecha_inicio', { ascending: true })

      const estado = req.query.estado
      if (typeof estado === 'string' && estado) consulta = consulta.eq('estado', estado)
      const cliente = req.query.cliente_id
      if (typeof cliente === 'string' && /^\d+$/.test(cliente)) consulta = consulta.eq('cliente_id', Number(cliente))

      const { data, error } = await consulta
      if (error) throw error

      const hoy = new Date().toISOString().slice(0, 10)
      const lista = (data || []).map((e: any) => {
        const tareas: Array<{ completada: boolean; fecha_limite: string | null }> = e.pm_tareas || []
        const pendientes = tareas.filter((t) => !t.completada)
        const fechas = pendientes.map((t) => t.fecha_limite).filter((f): f is string => !!f).sort()
        const { pm_tareas: _omitido, ...resto } = e
        return {
          ...resto,
          progreso: {
            total: tareas.length,
            completadas: tareas.length - pendientes.length,
            vencidas: fechas.filter((f) => f < hoy).length,
            proxima_fecha: fechas.find((f) => f >= hoy) ?? null,
          },
        }
      })
      res.json({ success: true, data: lista })
    } catch (error) {
      responderError(res, error)
    }
  }

  // POST /api/pm   { cliente_id, fecha_inicio, planta?, linea?, ... }
  async crear(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const clienteId = Number(req.body?.cliente_id)
      if (!Number.isInteger(clienteId) || clienteId <= 0) throw new ErrorHttp(400, 'Select a customer')
      const inicio = fecha(req.body?.fecha_inicio, 'fecha_inicio')
      const fin = req.body?.fecha_fin ? fecha(req.body.fecha_fin, 'fecha_fin') : null
      if (fin && fin < inicio) throw new ErrorHttp(400, 'The end date cannot be before the start date')

      const datos = {
        ...pickFields(req.body, CAMPOS_ENCABEZADO),
        cliente_id: clienteId,
        fecha_inicio: inicio,
        fecha_fin: fin,
        creado_por: user.id,
      }
      const { data, error } = await supabase.rpc('pm_crear_expediente', { p_datos: datos })
      if (error) throw error
      res.status(201).json({ success: true, data })
    } catch (error) {
      responderError(res, error)
    }
  }

  // GET /api/pm/:id  → PM + cliente + tareas (con colaboradores) + nombres de usuarios
  async obtener(req: Request, res: Response) {
    try {
      const { supabase } = contextoAuth(req)
      const id = uuid(req.params.id, 'id')

      const { data: exp, error } = await supabase
        .from('pm_expedientes')
        .select('*, clientes(id, nombre, empresa)')
        .eq('id', id).single()
      if (error) throw error

      // Con las evidencias (migración 20261023_02). Si esa migración aún no está
      // aplicada, el detalle sigue funcionando sin ellas: el orden de despliegue no importa.
      const BASE = '*, pm_tarea_colaboradores(usuario_id)'
      const CON_EVIDENCIAS = `${BASE}, pm_evidencias(id, tipo, nombre, mime, tamano, cotizacion_id, subido_por, created_at)`
      let { data: tareas, error: errTareas } = await supabase
        .from('pm_tareas').select(CON_EVIDENCIAS).eq('expediente_id', id).order('orden', { ascending: true })
      if (errTareas && /pm_evidencias/.test(`${errTareas.message} ${errTareas.details ?? ''}`)) {
        console.warn('[migración pendiente] pm_evidencias: aplica 20261023_02_pm_evidencias.sql')
        ;({ data: tareas, error: errTareas } = await supabase
          .from('pm_tareas').select(BASE).eq('expediente_id', id).order('orden', { ascending: true }))
      }
      if (errTareas) throw errTareas

      const lista = (tareas || []).map((t: any) => {
        const { pm_tarea_colaboradores: colab, pm_evidencias: evid, ...resto } = t
        const evidencias = [...((evid as any[]) || [])].sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
        return { ...resto, colaboradores: (colab || []).map((c: { usuario_id: string }) => c.usuario_id), evidencias }
      })
      const usuarios = await nombresDeUsuarios(supabase, [
        exp.creado_por,
        ...lista.flatMap((t: any) => [t.asignado_a, t.completada_por, ...t.colaboradores, ...t.evidencias.map((e: any) => e.subido_por)]),
      ])
      res.json({ success: true, data: { ...exp, tareas: lista, usuarios } })
    } catch (error) {
      responderError(res, error)
    }
  }

  // PATCH /api/pm/:id   { fecha_inicio?, estado?, planta?, ... }
  async actualizar(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const id = uuid(req.params.id, 'id')

      const cambios: Record<string, unknown> = { ...pickFields(req.body, CAMPOS_ENCABEZADO) }
      for (const k of Object.keys(cambios)) {
        if (typeof cambios[k] === 'string') cambios[k] = (cambios[k] as string).trim() || null
      }
      if (cambios.fecha_fin) cambios.fecha_fin = fecha(cambios.fecha_fin, 'fecha_fin')
      if (req.body?.estado !== undefined) {
        if (!ESTADOS_MANUALES.includes(req.body.estado)) throw new ErrorHttp(400, 'Invalid status')
        cambios.estado = req.body.estado
      }

      if (req.body?.fecha_inicio !== undefined) {
        const nueva = fecha(req.body.fecha_inicio, 'fecha_inicio')
        const { error } = await supabase.rpc('pm_cambiar_fecha_inicio', {
          p_expediente: id, p_fecha: nueva, p_usuario: user.id,
        })
        if (error) throw error
      }
      if (Object.keys(cambios).length > 0) {
        const { error } = await supabase
          .from('pm_expedientes').update({ ...cambios, updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
      }
      if (req.body?.estado === 'active') await sincronizarEstado(supabase, id)

      const { data, error } = await supabase.from('pm_expedientes').select('*').eq('id', id).single()
      if (error) throw error
      res.json({ success: true, data })
    } catch (error) {
      responderError(res, error)
    }
  }

  // PATCH /api/pm/:id/tareas/:tareaId   { completada?, notas?, asignado_a? }
  async actualizarTarea(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')

      const { data: actual, error: errActual } = await supabase
        .from('pm_tareas').select('*').eq('id', tareaId).eq('expediente_id', expedienteId).single()
      if (errActual) throw errActual

      const ahora = new Date().toISOString()
      const cambios: Record<string, unknown> = { updated_by: user.id, updated_at: ahora }
      const bitacora: Array<[string, unknown]> = []

      if (req.body?.completada !== undefined) {
        const completada = req.body.completada === true
        if (completada && !actual.completada && actual.evidencia === 'required') {
          const { count, error: errEv } = await supabase
            .from('pm_evidencias').select('id', { count: 'exact', head: true }).eq('tarea_id', tareaId)
          // Sin la migración 20261023_02 no existe pm_evidencias: no se puede exigir
          if (errEv && !/pm_evidencias/.test(errEv.message || '')) throw errEv
          if (!errEv && (count ?? 0) === 0) throw new ErrorHttp(400, 'This task requires at least one piece of evidence before it can be completed.')
        }
        if (completada !== actual.completada) {
          cambios.completada = completada
          cambios.completada_por = completada ? user.id : null
          cambios.completada_en = completada ? ahora : null
          bitacora.push([completada ? 'completed' : 'reopened', null])
        }
      }
      if (req.body?.notas !== undefined) {
        if (req.body.notas !== null && typeof req.body.notas !== 'string') throw new ErrorHttp(400, 'Invalid notes')
        const notas = (req.body.notas || '').toString().slice(0, 4000)
        if (notas !== (actual.notas || '')) {
          cambios.notas = notas || null
          bitacora.push(['note', { notas: notas || null }])
        }
      }
      if (req.body?.asignado_a !== undefined) {
        const asignado = req.body.asignado_a === null ? null : uuid(req.body.asignado_a, 'asignado_a')
        if (asignado !== actual.asignado_a) {
          cambios.asignado_a = asignado
          bitacora.push(['assigned', { usuario_id: asignado }])
        }
      }

      const { error } = await supabase.from('pm_tareas').update(cambios).eq('id', tareaId)
      if (error) throw error
      for (const [accion, detalle] of bitacora) await registrarHistorial(supabase, tareaId, user.id, accion, detalle)

      const estadoPm = await sincronizarEstado(supabase, expedienteId)
      const { data, error: errFinal } = await supabase.from('pm_tareas').select('*').eq('id', tareaId).single()
      if (errFinal) throw errFinal
      res.json({ success: true, data, estado_pm: estadoPm })
    } catch (error) {
      responderError(res, error)
    }
  }

  // POST /api/pm/:id/tareas/:tareaId/colaboradores   { usuario_id }
  async agregarColaborador(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')
      const usuarioId = uuid(req.body?.usuario_id, 'usuario_id')

      const { error: errTarea } = await supabase
        .from('pm_tareas').select('id').eq('id', tareaId).eq('expediente_id', expedienteId).single()
      if (errTarea) throw errTarea

      const { error } = await supabase
        .from('pm_tarea_colaboradores')
        .upsert({ tarea_id: tareaId, usuario_id: usuarioId, agregado_por: user.id }, { onConflict: 'tarea_id,usuario_id', ignoreDuplicates: true })
      if (error) throw error
      await registrarHistorial(supabase, tareaId, user.id, 'collaborator_added', { usuario_id: usuarioId })
      res.status(201).json({ success: true })
    } catch (error) {
      responderError(res, error)
    }
  }

  // DELETE /api/pm/:id/tareas/:tareaId/colaboradores/:usuarioId
  async quitarColaborador(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')
      const usuarioId = uuid(req.params.usuarioId, 'usuarioId')

      const { error: errTarea } = await supabase
        .from('pm_tareas').select('id').eq('id', tareaId).eq('expediente_id', expedienteId).single()
      if (errTarea) throw errTarea

      const { error } = await supabase
        .from('pm_tarea_colaboradores').delete().eq('tarea_id', tareaId).eq('usuario_id', usuarioId)
      if (error) throw error
      await registrarHistorial(supabase, tareaId, user.id, 'collaborator_removed', { usuario_id: usuarioId })
      res.json({ success: true })
    } catch (error) {
      responderError(res, error)
    }
  }

  // GET /api/pm/:id/tareas/:tareaId/historial
  async historial(req: Request, res: Response) {
    try {
      const { supabase } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')

      const { error: errTarea } = await supabase
        .from('pm_tareas').select('id').eq('id', tareaId).eq('expediente_id', expedienteId).single()
      if (errTarea) throw errTarea

      const { data, error } = await supabase
        .from('pm_tarea_historial').select('*').eq('tarea_id', tareaId).order('created_at', { ascending: false })
      if (error) throw error
      const usuarios = await nombresDeUsuarios(supabase, (data || []).flatMap((h: any) => [h.usuario_id, h.detalle?.usuario_id]))
      res.json({ success: true, data, usuarios })
    } catch (error) {
      responderError(res, error)
    }
  }
}

export default new PmController()
