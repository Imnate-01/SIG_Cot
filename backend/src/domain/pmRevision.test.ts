import { describe, it, expect } from 'vitest'
import { ordenGuardadoFechas } from './pmFechas'
import { clasificarError } from '../utils/http'
import { leerAccion } from './pmAcciones'

describe('ordenGuardadoFechas (comentario 2)', () => {
  it('si el nuevo inicio cae después del fin anterior, primero el fin', () => {
    // PM del 26-nov al 10-dic movido al 17-dic (fin 31-dic)
    expect(ordenGuardadoFechas('2026-12-10', '2026-12-17')).toBe('fin_primero')
  })
  it('si no, primero el inicio', () => {
    expect(ordenGuardadoFechas('2026-12-10', '2026-12-01')).toBe('inicio_primero')
    expect(ordenGuardadoFechas('2026-12-10', '2026-12-10')).toBe('inicio_primero')
    expect(ordenGuardadoFechas(null, '2027-01-01')).toBe('inicio_primero')
  })
})

describe('clasificarError 23514', () => {
  it('regla de fechas del PM → mensaje concreto', () => {
    const r = clasificarError({ code: '23514', message: 'new row for relation "pm_expedientes" violates check constraint "pm_expedientes_check"' })
    expect(r).toEqual({ status: 400, mensaje: 'The end date cannot be before the start date.' })
  })
  it('mensajes propios de nuestras funciones se muestran tal cual', () => {
    const r = clasificarError({ code: '23514', message: 'Esta tarea requiere al menos una evidencia antes de completarse' })
    expect(r.mensaje).toBe('Esta tarea requiere al menos una evidencia antes de completarse')
  })
  it('otra regla desconocida → genérico', () => {
    expect(clasificarError({ code: '23514', message: 'new row violates check constraint "x_check"' }).mensaje).toBe('Un dato no cumple las reglas permitidas')
  })
})

describe('leerAccion (comentario 3)', () => {
  const U = '11111111-1111-1111-1111-111111111111'
  it('normaliza texto, responsable y fecha', () => {
    expect(leerAccion({ texto: '  Enviar hoja  ', asignado_a: U, fecha_limite: '2026-11-05' }, false))
      .toEqual({ texto: 'Enviar hoja', asignado_a: U, fecha_limite: '2026-11-05' })
    expect(leerAccion({ asignado_a: '', fecha_limite: null }, true)).toEqual({ asignado_a: null, fecha_limite: null })
  })
  it('rechaza texto vacío, largo, uuid o fecha inválidos', () => {
    expect(() => leerAccion({ texto: '  ' }, false)).toThrow('Write the action.')
    expect(() => leerAccion({ texto: 'x'.repeat(1001) }, false)).toThrow('too long')
    expect(() => leerAccion({ texto: 'a', asignado_a: 'yo' }, false)).toThrow('Invalid asignado_a')
    expect(() => leerAccion({ texto: 'a', fecha_limite: '05/11/2026' }, false)).toThrow('YYYY-MM-DD')
  })
})
