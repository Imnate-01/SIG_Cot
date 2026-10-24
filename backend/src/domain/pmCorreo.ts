import { timingSafeEqual } from 'node:crypto'
import type { MotivoAlerta, NivelAlerta } from './pmAlertas'

/**
 * Resumen diario de alertas del PM Tracker por correo: contenido y utilidades
 * puras (sin red), para poder probarlas. El envío está en pm-correo.controller.ts.
 */

export const ZONA_HORARIA = 'America/Mexico_City'

export interface AlertaCorreo {
  tarea_id: string
  expediente_id: string
  codigo: string
  titulo: string
  fecha_limite: string
  cliente: string | null
  planta: string | null
  linea: string | null
  nivel: NivelAlerta
  dias: number
  motivo: MotivoAlerta | null
}

/** Fecha AAAA-MM-DD en la zona horaria dada (por defecto, la de México). */
export function fechaEnZona(ahora: Date = new Date(), zona: string = ZONA_HORARIA): string {
  // en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

export function escaparHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Compara el secreto recibido con el esperado en tiempo constante. Sin esperado → nunca válido. */
export function secretoValido(recibido: unknown, esperado: string | undefined): boolean {
  if (!esperado || typeof recibido !== 'string' || !recibido) return false
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

const MESES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fechaCorta = (f: string) => `${MESES[Number(f.slice(5, 7)) - 1]} ${Number(f.slice(8, 10))}, ${f.slice(0, 4)}`

export function textoCuando(a: Pick<AlertaCorreo, 'nivel' | 'dias'>): string {
  if (a.nivel === 'overdue') return `${-a.dias} day${a.dias === -1 ? '' : 's'} overdue`
  if (a.dias === 0) return 'Due today'
  if (a.dias === 1) return 'Due tomorrow'
  return `Due in ${a.dias} days`
}

const MOTIVO: Record<MotivoAlerta, string> = {
  assigned: 'You are responsible',
  collaborator: 'You collaborate',
  creator: 'You created this PM',
}

/** Asunto, texto plano y HTML del resumen de un usuario. Las alertas ya vienen ordenadas. */
export function construirResumen(p: { nombre: string | null; alertas: AlertaCorreo[]; appUrl: string; hoy: string }) {
  const base = p.appUrl.replace(/\/$/, '')
  const vencidas = p.alertas.filter((a) => a.nivel === 'overdue')
  const porVencer = p.alertas.filter((a) => a.nivel === 'due_soon')
  const partes = [vencidas.length ? `${vencidas.length} overdue` : '', porVencer.length ? `${porVencer.length} due soon` : ''].filter(Boolean)
  const asunto = `PM Tracker: ${partes.join(' · ')}`
  const enlace = (a: AlertaCorreo) => `${base}/en/pm/${a.expediente_id}?tarea=${a.tarea_id}`
  const lugar = (a: AlertaCorreo) => [a.cliente, a.planta, a.linea].filter(Boolean).join(' · ')
  const saludo = `Hi${p.nombre ? ` ${p.nombre}` : ''},`

  const lineasTexto = (titulo: string, lista: AlertaCorreo[]) => lista.length === 0 ? [] : [
    `${titulo} (${lista.length})`,
    ...lista.map((a) => `- ${a.codigo} ${a.titulo} — ${lugar(a)} — ${textoCuando(a)} (${fechaCorta(a.fecha_limite)})\n  ${enlace(a)}`),
    '',
  ]
  const texto = [
    saludo, '', `These PM tasks need your attention as of ${fechaCorta(p.hoy)}:`, '',
    ...lineasTexto('OVERDUE', vencidas), ...lineasTexto('DUE IN THE NEXT 7 DAYS', porVencer),
    `All your alerts: ${base}/en/pm/alertas`, '',
    'You get this email because you are responsible for, collaborate on, or created these PMs.',
  ].join('\n')

  const filaHtml = (a: AlertaCorreo) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #E5DFD9;vertical-align:top">
          <div style="font-size:12px;color:#73706D;font-weight:bold">${escaparHtml(a.codigo)}</div>
          <a href="${escaparHtml(enlace(a))}" style="color:#000;font-weight:bold;text-decoration:none">${escaparHtml(a.titulo)}</a>
          <div style="font-size:12px;color:#73706D">${escaparHtml(lugar(a))}${a.motivo ? ` · ${MOTIVO[a.motivo]}` : ''}</div>
        </td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid #E5DFD9;text-align:right;vertical-align:top;white-space:nowrap">
          <div style="font-weight:bold;color:${a.nivel === 'overdue' ? '#C4262E' : '#000'}">${textoCuando(a)}</div>
          <div style="font-size:12px;color:#73706D">${fechaCorta(a.fecha_limite)}</div>
        </td>
      </tr>`
  const grupoHtml = (titulo: string, lista: AlertaCorreo[]) => lista.length === 0 ? '' : `
    <h3 style="font-size:13px;letter-spacing:.04em;text-transform:uppercase;margin:24px 0 4px">${titulo} (${lista.length})</h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${lista.map(filaHtml).join('')}
    </table>`
  const html = `<!doctype html><html><body style="margin:0;background:#F2EFEB;font-family:Arial,Helvetica,sans-serif;color:#000">
  <div style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-top:4px solid #145EFC">
    <div style="font-size:18px;font-weight:bold">PM Tracker</div>
    <p>${escaparHtml(saludo)}</p>
    <p>These PM tasks need your attention as of ${fechaCorta(p.hoy)}.</p>
    ${grupoHtml('Overdue', vencidas)}${grupoHtml('Due in the next 7 days', porVencer)}
    <p style="margin-top:24px"><a href="${escaparHtml(`${base}/en/pm/alertas`)}" style="display:inline-block;background:#145EFC;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none;font-weight:bold">Open my alerts</a></p>
    <p style="font-size:12px;color:#73706D">You get this email because you are responsible for, collaborate on, or created these PMs.</p>
  </div></body></html>`

  return { asunto, texto, html }
}
