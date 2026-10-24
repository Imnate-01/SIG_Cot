import { Request, Response } from 'express'
import { contextoAuth } from '../middlewares/requireAuth'
import { ErrorHttp, responderError } from '../utils/http'
import { DIAS_AVISO, compararAlertas, esFechaValida, evaluarAlerta, sumarDiasISO } from '../domain/pmAlertas'

/**
 * Alertas del módulo PM (sin procesos programados: se calculan con las fechas
 * límite al consultar). Reglas en domain/pmAlertas.ts.
 *
 * GET /api/pm/alertas?hoy=AAAA-MM-DD&alcance=mias|todas
 *   hoy      fecha local del usuario (el servidor corre en UTC; en la tarde de
 *            México ya sería "mañana"). Si falta, se usa la fecha UTC.
 *   alcance  mias (por defecto): solo las que le tocan al usuario
 *            todas: todas las tareas vencidas/por vencer de los PM activos
 */
export class PmAlertasController {
  async listar(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const hoy = req.query.hoy === undefined ? new Date().toISOString().slice(0, 10) : req.query.hoy
      if (!esFechaValida(hoy)) throw new ErrorHttp(400, 'hoy must use the format YYYY-MM-DD')
      const alcance = req.query.alcance === 'todas' ? 'todas' : 'mias'

      const { data, error } = await supabase
        .from('pm_tareas')
        .select('id, codigo, titulo, etapa, fecha_limite, asignado_a, completada, expediente_id, pm_tarea_colaboradores(usuario_id), pm_expedientes!inner(id, estado, creado_por, planta, linea, clientes(nombre, empresa))')
        .eq('completada', false)
        .eq('pm_expedientes.estado', 'active')
        .not('fecha_limite', 'is', null)
        .lte('fecha_limite', sumarDiasISO(hoy, DIAS_AVISO))
        .order('fecha_limite', { ascending: true })
      if (error) throw error

      const usuarioId = alcance === 'mias' ? user.id : null
      const alertas = (data || []).flatMap((t: any) => {
        const pm = t.pm_expedientes
        const colaboradores = (t.pm_tarea_colaboradores || []).map((c: { usuario_id: string }) => c.usuario_id)
        const a = evaluarAlerta({ ...t, colaboradores }, pm, hoy, usuarioId)
        if (!a) return []
        return [{
          tarea_id: t.id, codigo: t.codigo, titulo: t.titulo, etapa: t.etapa, fecha_limite: t.fecha_limite,
          expediente_id: pm.id, cliente: pm.clientes?.nombre ?? null, empresa: pm.clientes?.empresa ?? null,
          planta: pm.planta, linea: pm.linea, ...a,
        }]
      }).sort(compararAlertas)

      res.json({
        success: true,
        data: alertas,
        resumen: {
          total: alertas.length,
          overdue: alertas.filter((a) => a.nivel === 'overdue').length,
          due_soon: alertas.filter((a) => a.nivel === 'due_soon').length,
        },
        hoy, alcance, dias_aviso: DIAS_AVISO,
      })
    } catch (error) {
      responderError(res, error)
    }
  }
}

export default new PmAlertasController()
