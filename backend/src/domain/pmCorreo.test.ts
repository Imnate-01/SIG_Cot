import { describe, it, expect } from 'vitest'
import { construirResumen, escaparHtml, fechaEnZona, secretoValido, textoCuando, type AlertaCorreo } from './pmCorreo'

const a = (o: Partial<AlertaCorreo>): AlertaCorreo => ({ tarea_id: 't1', expediente_id: 'p1', codigo: 'PM-01', titulo: 'Customer purchase order received',
  fecha_limite: '2026-10-20', cliente: 'Lácteos del Valle', planta: 'Planta Querétaro', linea: null, nivel: 'overdue', dias: -3, motivo: 'creator', ...o })

describe('fechaEnZona', () => {
  it('a las 6:30 pm del 23 en México (00:30 UTC del 24) sigue siendo el 23', () => {
    expect(fechaEnZona(new Date('2026-10-24T00:30:00Z'))).toBe('2026-10-23')
  })
  it('a las 8 am México (14:00 UTC) es el mismo día', () => {
    expect(fechaEnZona(new Date('2026-10-26T14:00:00Z'))).toBe('2026-10-26')
  })
})

describe('secretoValido', () => {
  it('acepta solo el secreto exacto y nunca si no hay secreto configurado', () => {
    expect(secretoValido('abc123', 'abc123')).toBe(true)
    expect(secretoValido('abc124', 'abc123')).toBe(false)
    expect(secretoValido('abc', 'abc123')).toBe(false)
    expect(secretoValido(undefined, 'abc123')).toBe(false)
    expect(secretoValido('', '')).toBe(false)
    expect(secretoValido('x', undefined)).toBe(false)
  })
})

describe('textos', () => {
  it('cuándo', () => {
    expect(textoCuando({ nivel: 'overdue', dias: -1 })).toBe('1 day overdue')
    expect(textoCuando({ nivel: 'overdue', dias: -3 })).toBe('3 days overdue')
    expect(textoCuando({ nivel: 'due_soon', dias: 0 })).toBe('Due today')
    expect(textoCuando({ nivel: 'due_soon', dias: 1 })).toBe('Due tomorrow')
    expect(textoCuando({ nivel: 'due_soon', dias: 5 })).toBe('Due in 5 days')
  })
  it('escaparHtml', () => {
    expect(escaparHtml(`<b>"O'Brien" & Co</b>`)).toBe('&lt;b&gt;&quot;O&#39;Brien&quot; &amp; Co&lt;/b&gt;')
  })
})

describe('construirResumen', () => {
  const r = construirResumen({ nombre: 'Ana', hoy: '2026-10-23', appUrl: 'https://sig-cot.vercel.app/', alertas: [
    a({}), a({ tarea_id: 't2', codigo: 'PM-10', nivel: 'due_soon', dias: 0, fecha_limite: '2026-10-23', motivo: 'assigned' }),
  ] })
  it('asunto con los conteos', () => {
    expect(r.asunto).toBe('PM Tracker: 1 overdue · 1 due soon')
    expect(construirResumen({ nombre: null, hoy: '2026-10-23', appUrl: 'x', alertas: [a({ nivel: 'due_soon', dias: 2 })] }).asunto).toBe('PM Tracker: 1 due soon')
  })
  it('enlaces directos a cada tarea, sin doble diagonal', () => {
    expect(r.texto).toContain('https://sig-cot.vercel.app/en/pm/p1?tarea=t1')
    expect(r.html).toContain('href="https://sig-cot.vercel.app/en/pm/p1?tarea=t2"')
    expect(r.texto).toContain('https://sig-cot.vercel.app/en/pm/alertas')
  })
  it('contenido: grupos, fechas y motivos', () => {
    expect(r.texto).toContain('OVERDUE (1)')
    expect(r.texto).toContain('PM-01 Customer purchase order received — Lácteos del Valle · Planta Querétaro — 3 days overdue (Oct 20, 2026)')
    expect(r.html).toContain('Due today')
    expect(r.html).toContain('You are responsible')
    expect(r.texto.startsWith('Hi Ana,')).toBe(true)
  })
  it('escapa nombres con HTML (un cliente no puede inyectar código en el correo)', () => {
    const x = construirResumen({ nombre: '<script>', hoy: '2026-10-23', appUrl: 'https://a.b', alertas: [a({ cliente: '<img src=x onerror=alert(1)>' })] })
    expect(x.html).not.toContain('<img src=x')
    expect(x.html).not.toContain('<script>')
    expect(x.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
