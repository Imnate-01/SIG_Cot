import nodemailer, { type Transporter } from 'nodemailer'

/**
 * Correo de salida por SMTP (cualquier proveedor: Office 365, Gmail, SendGrid,
 * Amazon SES, Resend…). Variables:
 *   SMTP_HOST, SMTP_PORT (587 por defecto), SMTP_USER, SMTP_PASS,
 *   SMTP_FROM  remitente, p. ej. "SIG PM Tracker <pm-tracker@sig.biz>"
 *   SMTP_SECURE=true para SSL directo (puerto 465); si no, STARTTLS.
 * Sin SMTP_HOST y SMTP_FROM, el envío queda desactivado.
 */
export function correoConfigurado(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM)
}

let transporte: Transporter | null = null
function obtenerTransporte(): Transporter {
  if (transporte) return transporte
  const port = Number(process.env.SMTP_PORT || 587)
  transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
  })
  return transporte
}

export async function enviarCorreo(m: { para: string; asunto: string; texto: string; html: string }) {
  if (!correoConfigurado()) throw new Error('SMTP no configurado')
  await obtenerTransporte().sendMail({ from: process.env.SMTP_FROM, to: m.para, subject: m.asunto, text: m.texto, html: m.html })
}
