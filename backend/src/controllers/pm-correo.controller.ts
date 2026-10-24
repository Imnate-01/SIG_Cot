import { Request, Response } from 'express'
import { supabaseAdmin } from '../config/supabase'
import { ErrorHttp, responderError } from '../utils/http'
import { correoConfigurado, enviarCorreo } from '../utils/correo'
import { DIAS_AVISO, compararAlertas, esFechaValida, evaluarAlerta, sumarDiasISO } from '../domain/pmAlertas'
import { construirResumen, fechaEnZona, secretoValido, type AlertaCorreo } from '../domain/pmCorreo'

/**
 * Resumen diario de alertas del PM Tracker por correo.
 *
 * POST /api/cron/pm-resumen-diario[?dry_run=1][&hoy=AAAA-MM-DD]
 *   Header: x-cron-secret: <PM_ALERTAS_CRON_SECRET>
 *
 * Lo llama un proceso programado (.github/workflows/pm-alertas-diarias.yml),
 * no un usuario: por eso no usa sesión sino un secreto compartido, y lee con la
 * clave de servicio. Manda a cada usuario activo UN correo con sus tareas
 * vencidas y por vencer (mismas reglas que /pm/alertas) y lo registra en
 * pm_alertas_envios para no repetirlo ese día.
 *   dry_run=1 → no envía ni registra: responde a quién le llegaría y qué.
 */
export class PmCorreoController {
  async resumenDiario(req: Request, res: Response) {
    try {
      const esperado = process.env.PM_ALERTAS_CRON_SECRET
      if (!esperado) throw new ErrorHttp(503, 'Daily digest disabled: PM_ALERTAS_CRON_SECRET is not set')
      if (!secretoValido(req.header('x-cron-secret'), esperado)) throw new ErrorHttp(401, 'Invalid secret')

      const dry = req.query.dry_run === '1' || req.query.dry_run === 'true'
      const hoy = req.query.hoy === undefined ? fechaEnZona() : req.query.hoy
      if (!esFechaValida(hoy)) throw new ErrorHttp(400, 'hoy must use the format YYYY-MM-DD')
      if (!dry && !correoConfigurado()) throw new ErrorHttp(503, 'SMTP is not configured (SMTP_HOST, SMTP_FROM)')
      const appUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')

      const { data: tareas, error } = await supabaseAdmin
        .from('pm_tareas')
        .select('id, codigo, titulo, fecha_limite, asignado_a, completada, pm_tarea_colaboradores(usuario_id), pm_expedientes!inner(id, estado, creado_por, planta, linea, clientes(nombre))')
        .eq('completada', false)
        .eq('pm_expedientes.estado', 'active')
        .not('fecha_limite', 'is', null)
        .lte('fecha_limite', sumarDiasISO(hoy, DIAS_AVISO))
      if (error) throw error

      const { data: usuarios, error: errU } = await supabaseAdmin
        .from('usuarios').select('id, nombre, email').eq('activo', true)
      if (errU) throw errU

      const { data: yaEnviados, error: errE } = await supabaseAdmin
        .from('pm_alertas_envios').select('usuario_id').eq('fecha', hoy)
      if (errE) throw errE
      const enviadosHoy = new Set((yaEnviados || []).map((r: { usuario_id: string }) => r.usuario_id))

      const detalle: Array<{ email: string; alertas: number; vencidas: number; estado: 'sent' | 'would_send' | 'already_sent' | 'error'; error?: string }> = []
      for (const u of (usuarios || []) as Array<{ id: string; nombre: string | null; email: string | null }>) {
        if (!u.email) continue
        const alertas: AlertaCorreo[] = (tareas || []).flatMap((t: any) => {
          const pm = t.pm_expedientes
          const colaboradores = (t.pm_tarea_colaboradores || []).map((c: { usuario_id: string }) => c.usuario_id)
          const ev = evaluarAlerta({ ...t, colaboradores }, pm, hoy, u.id)
          return ev ? [{ tarea_id: t.id, expediente_id: pm.id, codigo: t.codigo, titulo: t.titulo, fecha_limite: t.fecha_limite,
            cliente: pm.clientes?.nombre ?? null, planta: pm.planta, linea: pm.linea, ...ev }] : []
        }).sort(compararAlertas)
        if (alertas.length === 0) continue
        const vencidas = alertas.filter((a) => a.nivel === 'overdue').length

        if (enviadosHoy.has(u.id)) { detalle.push({ email: u.email, alertas: alertas.length, vencidas, estado: 'already_sent' }); continue }
        if (dry) { detalle.push({ email: u.email, alertas: alertas.length, vencidas, estado: 'would_send' }); continue }

        try {
          const correo = construirResumen({ nombre: u.nombre, alertas, appUrl, hoy })
          await enviarCorreo({ para: u.email, ...correo })
          const { error: errReg } = await supabaseAdmin
            .from('pm_alertas_envios').upsert({ usuario_id: u.id, fecha: hoy, alertas: alertas.length, vencidas }, { onConflict: 'usuario_id,fecha', ignoreDuplicates: true })
          if (errReg) console.error('[pm-correo] Enviado pero no registrado:', u.email, errReg.message)
          detalle.push({ email: u.email, alertas: alertas.length, vencidas, estado: 'sent' })
        } catch (e) {
          console.error('[pm-correo] Falló el envío a', u.email, (e as Error).message)
          detalle.push({ email: u.email, alertas: alertas.length, vencidas, estado: 'error', error: (e as Error).message })
        }
      }

      const cuenta = (e: string) => detalle.filter((d) => d.estado === e).length
      res.json({
        success: true, hoy, dry_run: dry,
        resumen: { enviados: cuenta('sent'), se_enviarian: cuenta('would_send'), ya_enviados: cuenta('already_sent'), errores: cuenta('error') },
        detalle,
      })
    } catch (error) {
      responderError(res, error)
    }
  }
}

export default new PmCorreoController()
