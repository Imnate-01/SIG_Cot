import { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '../config/supabase'
import { contextoAuth } from '../middlewares/requireAuth'
import { ErrorHttp, responderError } from '../utils/http'
import { formatearFolio } from './cotizaciones.controller'
import {
  BUCKET_EVIDENCIAS, MAX_BYTES_EVIDENCIA, MIMES_PERMITIDOS, carpetaEvidencia, rutaEvidencia, validarArchivo,
} from '../domain/pmEvidencias'

/**
 * Evidencias del módulo PM: archivos/fotos (bucket privado `pm-evidencias`) y
 * cotizaciones ligadas a una tarea. Migración: 20261023_02_pm_evidencias.sql.
 *
 * Subida en dos pasos, directo del navegador a Storage (el archivo no pasa por
 * este servidor):
 *   1. POST .../evidencias/subida  → valida y devuelve un token de subida de un solo uso
 *   2. el navegador sube el archivo con ese token
 *   3. POST .../evidencias         → comprueba que el archivo exista y registra la evidencia
 * El bucket es privado: para verlo se piden enlaces temporales (GET .../url).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEGUNDOS_ENLACE = 300

function uuid(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorHttp(400, `Invalid ${campo}`)
  return valor
}

const MOTIVOS: Record<string, string> = {
  vacio: 'The file is empty.',
  muy_grande: `The file is too large (maximum ${MAX_BYTES_EVIDENCIA / (1024 * 1024)} MB).`,
  tipo_no_permitido: 'File type not allowed. Use photos (JPG, PNG, WEBP, HEIC), PDF, Word, Excel, PowerPoint, CSV or TXT.',
}

/** Crea el bucket privado la primera vez (una vez por proceso). */
let bucketListo = false
async function asegurarBucket() {
  if (bucketListo) return
  const { data, error } = await supabaseAdmin.storage.listBuckets()
  if (error) throw error
  if (!data?.some((b) => b.name === BUCKET_EVIDENCIAS)) {
    const { error: errCrear } = await supabaseAdmin.storage.createBucket(BUCKET_EVIDENCIAS, {
      public: false,
      fileSizeLimit: MAX_BYTES_EVIDENCIA,
      allowedMimeTypes: MIMES_PERMITIDOS,
    })
    if (errCrear && !/already exists/i.test(errCrear.message)) throw errCrear
  }
  bucketListo = true
}

async function exigirTarea(supabase: SupabaseClient, expedienteId: string, tareaId: string) {
  const { data, error } = await supabase
    .from('pm_tareas').select('id, completada, evidencia').eq('id', tareaId).eq('expediente_id', expedienteId).single()
  if (error) throw error
  return data as { id: string; completada: boolean; evidencia: 'none' | 'optional' | 'required' }
}

async function historial(supabase: SupabaseClient, tareaId: string, usuarioId: string, accion: string, detalle: unknown) {
  const { error } = await supabase.from('pm_tarea_historial').insert({ tarea_id: tareaId, usuario_id: usuarioId, accion, detalle })
  if (error) throw error
}

export class PmEvidenciasController {

  // POST /api/pm/:id/tareas/:tareaId/evidencias/subida   { nombre, mime, tamano }
  async prepararSubida(req: Request, res: Response) {
    try {
      const { supabase } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')
      const nombre = String(req.body?.nombre || '')
      const v = validarArchivo({ nombre, mime: req.body?.mime, tamano: Number(req.body?.tamano) })
      if (!v.ok) throw new ErrorHttp(400, MOTIVOS[v.motivo])
      await exigirTarea(supabase, expedienteId, tareaId)

      await asegurarBucket()
      const path = rutaEvidencia(expedienteId, tareaId, randomUUID(), nombre)
      const { data, error } = await supabaseAdmin.storage.from(BUCKET_EVIDENCIAS).createSignedUploadUrl(path)
      if (error) throw error
      res.json({ success: true, data: { bucket: BUCKET_EVIDENCIAS, path: data.path, token: data.token, mime: v.mime } })
    } catch (error) {
      responderError(res, error)
    }
  }

  // POST /api/pm/:id/tareas/:tareaId/evidencias   { path, nombre }
  async registrar(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')
      const path = String(req.body?.path || '')
      const nombre = String(req.body?.nombre || '').slice(0, 200)
      const carpeta = carpetaEvidencia(expedienteId, tareaId)
      if (!path.startsWith(carpeta) || path.includes('..') || path.slice(carpeta.length).includes('/')) {
        throw new ErrorHttp(400, 'Invalid file path')
      }
      await exigirTarea(supabase, expedienteId, tareaId)

      // El archivo debe existir de verdad; tamaño y tipo se toman de Storage, no del cliente.
      const archivo = path.slice(carpeta.length)
      const { data: lista, error: errLista } = await supabaseAdmin.storage
        .from(BUCKET_EVIDENCIAS).list(carpeta.slice(0, -1), { search: archivo, limit: 5 })
      if (errLista) throw errLista
      const objeto = (lista || []).find((o) => o.name === archivo)
      if (!objeto) throw new ErrorHttp(400, 'The file was not uploaded. Try again.')
      const meta = (objeto.metadata || {}) as { size?: number; mimetype?: string }

      const { data, error } = await supabase
        .from('pm_evidencias')
        .insert({
          tarea_id: tareaId, expediente_id: expedienteId, tipo: 'file',
          nombre: nombre || archivo, storage_path: path,
          mime: meta.mimetype ?? null, tamano: meta.size ?? null, subido_por: user.id,
        })
        .select().single()
      if (error) throw error
      await historial(supabase, tareaId, user.id, 'evidence_added', { nombre: data.nombre })
      res.status(201).json({ success: true, data })
    } catch (error) {
      responderError(res, error)
    }
  }

  // POST /api/pm/:id/tareas/:tareaId/evidencias/cotizacion   { cotizacion_id }
  async ligarCotizacion(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const tareaId = uuid(req.params.tareaId, 'tareaId')
      const cotizacionId = Number(req.body?.cotizacion_id)
      if (!Number.isInteger(cotizacionId) || cotizacionId <= 0) throw new ErrorHttp(400, 'Select a quotation')
      await exigirTarea(supabase, expedienteId, tareaId)

      const { data: cot, error: errCot } = await supabase
        // La tabla no guarda el folio: se arma igual que en el resto de la app (SIG-<entidad>-<id>)
        .from('cotizaciones').select('id, condiciones').eq('id', cotizacionId).single()
      if (errCot) throw errCot

      const { data, error } = await supabase
        .from('pm_evidencias')
        .insert({
          tarea_id: tareaId, expediente_id: expedienteId, tipo: 'quote',
          nombre: formatearFolio(cot), cotizacion_id: cot.id, subido_por: user.id,
        })
        .select().single()
      if (error) {
        if ((error as { code?: string }).code === '23505') throw new ErrorHttp(409, 'That quotation is already linked to this task.')
        throw error
      }
      await historial(supabase, tareaId, user.id, 'evidence_added', { nombre: data.nombre })
      res.status(201).json({ success: true, data })
    } catch (error) {
      responderError(res, error)
    }
  }

  // GET /api/pm/:id/evidencias/:evId/url  → enlace temporal (5 min) para ver o descargar
  async enlace(req: Request, res: Response) {
    try {
      const { supabase } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const evId = uuid(req.params.evId, 'evId')
      const { data: ev, error } = await supabase
        .from('pm_evidencias').select('*').eq('id', evId).eq('expediente_id', expedienteId).single()
      if (error) throw error
      if (ev.tipo === 'quote') return res.json({ success: true, data: { tipo: 'quote', cotizacion_id: ev.cotizacion_id } })

      const { data, error: errUrl } = await supabaseAdmin.storage
        .from(BUCKET_EVIDENCIAS).createSignedUrl(ev.storage_path, SEGUNDOS_ENLACE)
      if (errUrl) throw errUrl
      res.json({ success: true, data: { tipo: 'file', url: data.signedUrl, nombre: ev.nombre, mime: ev.mime, expira_en: SEGUNDOS_ENLACE } })
    } catch (error) {
      responderError(res, error)
    }
  }

  // DELETE /api/pm/:id/evidencias/:evId
  async eliminar(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const evId = uuid(req.params.evId, 'evId')
      const { data: ev, error } = await supabase
        .from('pm_evidencias').select('*').eq('id', evId).eq('expediente_id', expedienteId).single()
      if (error) throw error

      // No dejar una tarea completada con evidencia obligatoria sin evidencia
      const tarea = await exigirTarea(supabase, expedienteId, ev.tarea_id)
      if (tarea.completada && tarea.evidencia === 'required') {
        const { count, error: errCount } = await supabase
          .from('pm_evidencias').select('id', { count: 'exact', head: true }).eq('tarea_id', ev.tarea_id)
        if (errCount) throw errCount
        if ((count ?? 0) <= 1) throw new ErrorHttp(400, 'This is the only evidence of a completed task that requires it. Reopen the task first.')
      }

      const { error: errDel } = await supabase.from('pm_evidencias').delete().eq('id', evId)
      if (errDel) throw errDel
      if (ev.tipo === 'file' && ev.storage_path) {
        const { error: errStorage } = await supabaseAdmin.storage.from(BUCKET_EVIDENCIAS).remove([ev.storage_path])
        if (errStorage) console.error('[pm-evidencias] No se pudo borrar el archivo de Storage:', ev.storage_path, errStorage.message)
      }
      await historial(supabase, ev.tarea_id, user.id, 'evidence_removed', { nombre: ev.nombre })
      res.json({ success: true })
    } catch (error) {
      responderError(res, error)
    }
  }
}

export default new PmEvidenciasController()
