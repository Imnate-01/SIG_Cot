import { ErrorHttp } from '../utils/http'

/** Validación de las acciones de seguimiento del PM (sin dependencias de Supabase). */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FECHA = /^\d{4}-\d{2}-\d{2}$/
export const MAX_TEXTO_ACCION = 1000

export function uuid(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !UUID.test(valor)) throw new ErrorHttp(400, `Invalid ${campo}`)
  return valor
}

/** Valida y normaliza el cuerpo. `parcial` = PATCH (solo lo que venga). */
export function leerAccion(body: any, parcial: boolean) {
  const datos: Record<string, unknown> = {}
  if (!parcial || body?.texto !== undefined) {
    const texto = typeof body?.texto === 'string' ? body.texto.trim() : ''
    if (!texto) throw new ErrorHttp(400, 'Write the action.')
    if (texto.length > MAX_TEXTO_ACCION) throw new ErrorHttp(400, `The action is too long (maximum ${MAX_TEXTO_ACCION} characters).`)
    datos.texto = texto
  }
  if (body?.asignado_a !== undefined) {
    datos.asignado_a = body.asignado_a === null || body.asignado_a === '' ? null : uuid(body.asignado_a, 'asignado_a')
  }
  if (body?.fecha_limite !== undefined) {
    const f = body.fecha_limite
    if (f === null || f === '') datos.fecha_limite = null
    else if (typeof f !== 'string' || !FECHA.test(f) || Number.isNaN(Date.parse(f))) throw new ErrorHttp(400, 'fecha_limite must use the format YYYY-MM-DD')
    else datos.fecha_limite = f
  }
  return datos
}

