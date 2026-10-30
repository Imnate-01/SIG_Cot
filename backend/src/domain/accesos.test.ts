import { describe, it, expect } from 'vitest'
import { AREAS, accesosEfectivos, puedeEntrar, leerAreas, cambiosDeAreas, textoOpcional, separarPorArea } from './accesos'

describe('accesosEfectivos', () => {
  it('un administrador tiene todas las áreas aunque no tenga filas', () => {
    expect(accesosEfectivos(true, [])).toEqual({ esAdmin: true, areas: [...AREAS] })
  })
  it('un usuario solo tiene las asignadas, sin repetir, en orden fijo e ignorando las desconocidas', () => {
    expect(accesosEfectivos(false, ['mantenimiento', 'ventas', 'cotizaciones', 'mantenimiento']))
      .toEqual({ esAdmin: false, areas: ['cotizaciones', 'mantenimiento'] })
  })
})

describe('puedeEntrar', () => {
  const geovanni = accesosEfectivos(false, ['cotizaciones'])
  const julio = accesosEfectivos(false, ['cotizaciones', 'mantenimiento'])
  const sinAreas = accesosEfectivos(false, [])
  it('Geovanni entra a cotizaciones pero no a mantenimiento ni a food safety', () => {
    expect(puedeEntrar(geovanni, ['cotizaciones'])).toBe(true)
    expect(puedeEntrar(geovanni, ['mantenimiento'])).toBe(false)
    expect(puedeEntrar(geovanni, ['food_safety'])).toBe(false)
  })
  it('Julio entra a cotizaciones y a mantenimiento', () => {
    expect(puedeEntrar(julio, ['cotizaciones'])).toBe(true)
    expect(puedeEntrar(julio, ['mantenimiento'])).toBe(true)
    expect(puedeEntrar(julio, ['food_safety'])).toBe(false)
  })
  it('basta con una de las áreas permitidas (catálogos compartidos)', () => {
    expect(puedeEntrar(accesosEfectivos(false, ['mantenimiento']), ['cotizaciones', 'mantenimiento'])).toBe(true)
  })
  it('sin áreas no entra a ninguna; un administrador a todas', () => {
    expect(puedeEntrar(sinAreas, ['cotizaciones', 'mantenimiento', 'food_safety'])).toBe(false)
    expect(puedeEntrar(accesosEfectivos(true, []), ['food_safety'])).toBe(true)
  })
})

describe('leerAreas', () => {
  it('acepta una lista válida (también vacía) y la ordena', () => {
    expect(leerAreas(['food_safety', 'cotizaciones'])).toEqual(['cotizaciones', 'food_safety'])
    expect(leerAreas([])).toEqual([])
  })
  it('rechaza lo que no es lista o trae áreas desconocidas', () => {
    expect(leerAreas('cotizaciones')).toBeNull()
    expect(leerAreas(['cotizaciones', 'administracion'])).toBeNull()
    expect(leerAreas(undefined)).toBeNull()
  })
})

describe('cambiosDeAreas', () => {
  it('calcula qué agregar y qué quitar', () => {
    expect(cambiosDeAreas(['cotizaciones', 'mantenimiento'], ['mantenimiento', 'food_safety']))
      .toEqual({ agregar: ['food_safety'], quitar: ['cotizaciones'] })
  })
})

describe('textoOpcional', () => {
  it('recorta, limita a 500 y convierte vacío en null', () => {
    expect(textoOpcional('  hola  ')).toBe('hola')
    expect(textoOpcional('   ')).toBeNull()
    expect(textoOpcional(undefined)).toBeNull()
    expect(textoOpcional('x'.repeat(600))).toHaveLength(500)
  })
})

describe('separarPorArea', () => {
  const u = (id: string, extra: Record<string, unknown> = {}) => ({ id, nombre: id.toUpperCase(), activo: true, es_admin_sistema: false, ...extra })
  const usuarios = [u('ana'), u('beto'), u('caro', { es_admin_sistema: true }), u('dani', { activo: false }), u('eli')]
  const filas = [
    { usuario_id: 'ana', area: 'mantenimiento' },
    { usuario_id: 'beto', area: 'cotizaciones' },   // le quitaron Mantenimiento: solo Cotizaciones
    { usuario_id: 'dani', area: 'mantenimiento' },  // cuenta desactivada
  ]
  it('dentro: con el área o administradores, solo activos', () => {
    expect(separarPorArea(usuarios, filas, 'mantenimiento').dentro.map((x) => x.id)).toEqual(['ana', 'caro'])
  })
  it('fuera: activos sin el área (incluye a quien se la quitaron)', () => {
    expect(separarPorArea(usuarios, filas, 'mantenimiento').fuera.map((x) => x.id)).toEqual(['beto', 'eli'])
  })
  it('las filas de otras áreas no cuentan', () => {
    expect(separarPorArea(usuarios, filas, 'food_safety').dentro.map((x) => x.id)).toEqual(['caro'])
  })
})
