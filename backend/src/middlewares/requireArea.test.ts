import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { accesosEfectivos, type Accesos } from '../domain/accesos'

let accesos: Accesos = accesosEfectivos(false, [])
vi.mock('../services/accesos', () => ({ accesosDeRequest: async () => accesos }))
const { requireArea, requireAreaPorMetodo, requireAdminSistema } = await import('./requireArea')

function correr(mw: (req: Request, res: Response, next: () => void) => unknown, req: Partial<Request> = {}) {
  const res: { statusCode?: number; status: (c: number) => typeof res; json: () => typeof res } = {
    status(c) { this.statusCode = c; return this },
    json() { return this },
  }
  let paso = false
  return Promise.resolve(mw({ method: 'GET', path: '/', ...req } as Request, res as unknown as Response, () => { paso = true }))
    .then(() => ({ paso, status: res.statusCode }))
}

describe('requireArea', () => {
  beforeEach(() => { accesos = accesosEfectivos(false, []) })

  it('Geovanni (solo cotizaciones) no entra a /api/pm', async () => {
    accesos = accesosEfectivos(false, ['cotizaciones'])
    expect(await correr(requireArea('mantenimiento'))).toEqual({ paso: false, status: 403 })
    expect(await correr(requireArea('cotizaciones'))).toEqual({ paso: true, status: undefined })
  })
  it('un administrador entra a cualquier área', async () => {
    accesos = accesosEfectivos(true, [])
    expect((await correr(requireArea('food_safety'))).paso).toBe(true)
  })
})

describe('requireAreaPorMetodo (clientes y listado de cotizaciones)', () => {
  const clientes = requireAreaPorMetodo({ lectura: ['cotizaciones', 'mantenimiento'], escritura: ['cotizaciones'] })
  const listado = requireAreaPorMetodo({ lectura: ['cotizaciones', 'mantenimiento'], escritura: ['cotizaciones'], esLectura: (r) => r.method === 'GET' && r.path === '/' })

  it('Mantenimiento lee clientes pero no los crea', async () => {
    accesos = accesosEfectivos(false, ['mantenimiento'])
    expect((await correr(clientes, { method: 'GET' })).paso).toBe(true)
    expect(await correr(clientes, { method: 'POST' })).toEqual({ paso: false, status: 403 })
  })
  it('Mantenimiento ve el listado de cotizaciones pero no una cotización ni la edita', async () => {
    accesos = accesosEfectivos(false, ['mantenimiento'])
    expect((await correr(listado, { method: 'GET', path: '/' })).paso).toBe(true)
    expect((await correr(listado, { method: 'GET', path: '/abc' })).status).toBe(403)
    expect((await correr(listado, { method: 'PUT', path: '/abc' })).status).toBe(403)
  })
  it('sin áreas no lee nada', async () => {
    accesos = accesosEfectivos(false, [])
    expect((await correr(clientes, { method: 'GET' })).status).toBe(403)
  })
})

describe('requireAdminSistema', () => {
  it('solo pasa un administrador', async () => {
    accesos = accesosEfectivos(false, ['cotizaciones', 'mantenimiento', 'food_safety'])
    expect((await correr(requireAdminSistema)).status).toBe(403)
    accesos = accesosEfectivos(true, [])
    expect((await correr(requireAdminSistema)).paso).toBe(true)
  })
})
