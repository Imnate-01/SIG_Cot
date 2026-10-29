import { Request, Response } from 'express'
import { contextoAuth } from '../middlewares/requireAuth'
import { ErrorHttp, responderError } from '../utils/http'

/**
 * Acciones de seguimiento de un PM (las "Open notes" asignables).
 * Migración: supabase/migrations/20261029_02_pm_acciones.sql
 *
 *   POST   /api/pm/:id/acciones              { texto, asignado_a?, fecha_limite? }
 *   PATCH  /api/pm/:id/acciones/:accionId    { texto?, asignado_a?, fecha_limite?, completada? }
 *   DELETE /api/pm/:id/acciones/:accionId
 */

import { leerAccion, uuid } from '../domain/pmAcciones'

/** Sin la migración la tabla no existe: mensaje claro en vez de un 500. */
function migracionPendiente(error: { message?: string; code?: string } | null) {
  return !!error && (error.code === '42P01' || error.code === 'PGRST205' || /pm_acciones/.test(error.message || ''))
}
const AVISO_MIGRACION = 'Follow-up actions are not enabled yet: apply the migration 20261029_02_pm_acciones.sql in Supabase.'

export class PmAccionesController {

  async crear(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const datos = leerAccion(req.body, false)
      const { error: errPm } = await supabase.from('pm_expedientes').select('id').eq('id', expedienteId).single()
      if (errPm) throw errPm
      const { data, error } = await supabase
        .from('pm_acciones')
        .insert({ ...datos, expediente_id: expedienteId, creado_por: user.id })
        .select().single()
      if (error) {
        if (migracionPendiente(error)) throw new ErrorHttp(503, AVISO_MIGRACION)
        throw error
      }
      res.status(201).json({ success: true, data })
    } catch (error) {
      responderError(res, error)
    }
  }

  async actualizar(req: Request, res: Response) {
    try {
      const { supabase, user } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const accionId = uuid(req.params.accionId, 'accionId')
      const cambios = leerAccion(req.body, true)
      if (req.body?.completada !== undefined) {
        const hecha = req.body.completada === true
        cambios.completada = hecha
        cambios.completada_por = hecha ? user.id : null
        cambios.completada_en = hecha ? new Date().toISOString() : null
      }
      if (Object.keys(cambios).length === 0) throw new ErrorHttp(400, 'Nothing to update')
      const { data, error } = await supabase
        .from('pm_acciones')
        .update({ ...cambios, updated_at: new Date().toISOString() })
        .eq('id', accionId).eq('expediente_id', expedienteId)
        .select().single()
      if (error) {
        if (migracionPendiente(error)) throw new ErrorHttp(503, AVISO_MIGRACION)
        throw error
      }
      res.json({ success: true, data })
    } catch (error) {
      responderError(res, error)
    }
  }

  async eliminar(req: Request, res: Response) {
    try {
      const { supabase } = contextoAuth(req)
      const expedienteId = uuid(req.params.id, 'id')
      const accionId = uuid(req.params.accionId, 'accionId')
      const { error } = await supabase.from('pm_acciones').delete().eq('id', accionId).eq('expediente_id', expedienteId)
      if (error) {
        if (migracionPendiente(error)) throw new ErrorHttp(503, AVISO_MIGRACION)
        throw error
      }
      res.json({ success: true })
    } catch (error) {
      responderError(res, error)
    }
  }
}

export default new PmAccionesController()
