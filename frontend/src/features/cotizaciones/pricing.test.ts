/**
 * Pruebas de caracterización: comparan el módulo nuevo contra copias LITERALES
 * del código que había en nueva/page.tsx y editar/[id]/page.tsx antes del
 * refactor, con miles de casos aleatorios. Si alguna regla cambia sin querer,
 * estas pruebas fallan.
 */
import { describe, it, expect } from 'vitest';
import {
  type LineaCotizacion, type TarifaCatalogo, type TarifasCliente,
  precioUnitario, precioCatalogo, totalLinea, recalcularLinea, cantidadParaGuardar,
  sumarTotales, ajustarDesgloseAIngenieros, lineaDesdePartida, subtotalPartida,
  conceptoRequiereDesglose, esCostoVuelo, calcularTotalesUS,
} from './pricing';

// ─── Copias literales del código anterior (no tocar) ────────────────────────

type Item = LineaCotizacion & { id: number; desglose: { uid: string; nombre: string; horas: number }[] };

// nueva/page.tsx — useEffect "Auto-recalculate items when overrides change"
function legacyEfecto(item: Item, tarifa: TarifaCatalogo, tarifasCliente: TarifasCliente) {
  const precioUnitario = item.esPrecioManual && item.precioManual !== undefined
    ? item.precioManual
    : (item.conContrato && tarifasCliente[item.tarifaId]
      ? tarifasCliente[item.tarifaId]
      : (item.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato));
  return tarifa.requiere_desglose
    ? precioUnitario * item.cantidad
    : precioUnitario * item.ingenieros * item.cantidad;
}

// nueva/page.tsx — bloque final de actualizarLineaServicio
function legacyActualizar(item: Item, tarifa: TarifaCatalogo | undefined, tarifasCliente: TarifasCliente) {
  const updated = { ...item, desglose: [...item.desglose] };
  if (tarifa) {
    const esCostoVuelo = tarifa.concepto.toLowerCase().includes('costo de vuelo');
    if (esCostoVuelo) {
      updated.ingenieros = 1;
      updated.cantidad = 1;
      updated.esPrecioManual = true;
      updated.total = updated.precioManual || 0;
    } else {
      let precioUnitario: number;
      if (updated.esPrecioManual && updated.precioManual !== undefined) {
        precioUnitario = updated.precioManual;
      } else if (updated.conContrato && tarifasCliente[updated.tarifaId]) {
        precioUnitario = tarifasCliente[updated.tarifaId];
      } else {
        precioUnitario = updated.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato;
      }
      if (tarifa.requiere_desglose) {
        const totalHoras = updated.desglose.reduce((acc, curr) => acc + curr.horas, 0);
        updated.cantidad = totalHoras;
        updated.total = precioUnitario * totalHoras;
      } else {
        updated.total = precioUnitario * updated.ingenieros * updated.cantidad;
      }
    }
  } else { updated.total = 0; }
  return updated;
}

// nueva/page.tsx — handleGuardar (itemsFormateados) y PDF
function legacyGuardar(item: Item, tarifa: TarifaCatalogo | undefined, tarifasCliente: TarifasCliente) {
  const precioUnitario = item.esPrecioManual && item.precioManual !== undefined
    ? item.precioManual
    : (item.conContrato && tarifasCliente[item.tarifaId]
      ? tarifasCliente[item.tarifaId]
      : (item.conContrato ? tarifa?.precio_con_contrato || 0 : tarifa?.precio_sin_contrato || 0));
  const cantidadReal = tarifa?.requiere_desglose
    ? item.cantidad
    : (item.cantidad * (item.ingenieros || 1));
  return { precioUnitario, cantidad: cantidadReal, total: item.total };
}

// editar/[id]/page.tsx — carga de partidas (antes del refactor)
function legacyCargaEditar(i: any, tarifa: TarifaCatalogo | undefined): Item {
  return {
    id: i.id,
    tarifaId: tarifa ? String(tarifa.id) : "",
    ingenieros: i.ingenieros || 1,
    cantidad: i.cantidad,
    conContrato: true,
    desglose: i.desglose || [],
    total: i.subtotal || i.total,
  } as Item;
}

// cotizaciones-us/nueva/page.tsx — useEffect de subtotales
function legacyUS(formData: any) {
  let travelSub = 0;
  formData.travel_legs.forEach((leg: any) => {
    travelSub += (leg.reg_hrs * formData.rates.travel_reg) +
                 (leg.sat_hrs * formData.rates.travel_sat) +
                 (leg.sun_hrs * formData.rates.travel_sun);
  });
  let laborSub = 0;
  formData.labor_schedule.forEach((day: any) => {
    laborSub += (day.reg_hrs * formData.rates.regular) +
                (day.ot_hrs * formData.rates.overtime) +
                (day.premium_hrs * formData.rates.premium);
  });
  const grand = travelSub + laborSub + Number(formData.preparation_amount) + Number(formData.expenses_amount) + Number(formData.calibration_amount) - Number(formData.sales_accommodation_amount);
  return { travel_subtotal: travelSub, labor_subtotal: laborSub, grand_total: grand };
}

// ─── Generador de casos aleatorios (determinista) ───────────────────────────

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}
const rand = rng(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const precio = () => pick([0, 50, 85.5, 100, 120, 150.75, 208, 333.33]);

const TARIFAS: TarifaCatalogo[] = [
  { id: 1, concepto: 'Hora técnico', precio_con_contrato: 100, precio_sin_contrato: 150, requiere_desglose: false },
  { id: 2, concepto: 'Tiempo de viaje', precio_con_contrato: 60, precio_sin_contrato: 90, requiere_desglose: true },
  { id: 3, concepto: 'Costo de Vuelo', precio_con_contrato: 0, precio_sin_contrato: 0, requiere_desglose: false },
  { id: 4, concepto: 'Travel time US', precio_con_contrato: 181, precio_sin_contrato: 181, requiere_desglose: true },
  { id: 5, concepto: 'Supervisor', precio_con_contrato: 208, precio_sin_contrato: 312, requiere_desglose: false },
];

function itemAleatorio(): { item: Item; tarifa: TarifaCatalogo; tc: TarifasCliente } {
  const tarifa = pick(TARIFAS);
  const ingenieros = Math.floor(rand() * 6) + 1;
  const desglose = Array.from({ length: Math.floor(rand() * 4) + 1 }, (_, k) => ({ uid: String(k), nombre: '', horas: Math.floor(rand() * 12) }));
  const manual = rand() < 0.3;
  const tc: TarifasCliente = rand() < 0.5 ? { [String(tarifa.id)]: pick([0, 95, 140, 175.25]) } : {};
  const item: Item = {
    id: 1, tarifaId: String(tarifa.id), ingenieros, cantidad: Math.floor(rand() * 40) + 1,
    conContrato: rand() < 0.6, esPrecioManual: manual, precioManual: manual && rand() < 0.8 ? precio() : undefined,
    desglose, total: 0,
  };
  // Igual que la UI: al elegir "Costo de Vuelo" el precio manual arranca en 0.
  if (esCostoVuelo(tarifa) && item.precioManual === undefined) item.precioManual = 0;
  return { item, tarifa, tc };
}

const N = 3000;

// ─── Pruebas ────────────────────────────────────────────────────────────────

describe('pricing: equivalencia con el código anterior', () => {
  it('totalLinea === efecto de recálculo por tarifas del cliente', () => {
    for (let k = 0; k < N; k++) {
      const { item, tarifa, tc } = itemAleatorio();
      expect(totalLinea(item, tarifa, tc)).toBe(legacyEfecto(item, tarifa, tc));
    }
  });

  it('recalcularLinea === actualizarLineaServicio (total, cantidad, ingenieros, manual)', () => {
    for (let k = 0; k < N; k++) {
      const { item, tarifa, tc } = itemAleatorio();
      const t = rand() < 0.05 ? undefined : tarifa;
      const nuevo = recalcularLinea(item, t, tc);
      const viejo = legacyActualizar(item, t, tc);
      expect(nuevo.total).toBe(viejo.total);
      expect(nuevo.cantidad).toBe(viejo.cantidad);
      expect(nuevo.ingenieros).toBe(viejo.ingenieros);
      expect(!!nuevo.esPrecioManual).toBe(!!viejo.esPrecioManual);
    }
  });

  it('precioUnitario y cantidadParaGuardar === handleGuardar / PDF', () => {
    for (let k = 0; k < N; k++) {
      const { item, tarifa, tc } = itemAleatorio();
      const t = rand() < 0.1 ? undefined : tarifa;
      const viejo = legacyGuardar(item, t, tc);
      expect(precioUnitario(item, t, tc)).toBe(viejo.precioUnitario);
      expect(cantidadParaGuardar(item, t)).toBe(viejo.cantidad);
    }
  });

  it('calcularTotalesUS === useEffect de cotizaciones-us', () => {
    for (let k = 0; k < 500; k++) {
      const hrs = () => pick([0, 1, 2.5, 4, 8, '6', '']);
      const formData = {
        travel_legs: Array.from({ length: Math.floor(rand() * 4) }, () => ({ reg_hrs: hrs(), sat_hrs: hrs(), sun_hrs: hrs() })),
        labor_schedule: Array.from({ length: Math.floor(rand() * 6) }, () => ({ reg_hrs: hrs(), ot_hrs: hrs(), premium_hrs: hrs() })),
        rates: { regular: 208, overtime: 312, premium: 416, travel_reg: 181, travel_sat: 272, travel_sun: 362 },
        preparation_amount: pick([0, 150, '200']), expenses_amount: pick([0, 99.9]),
        calibration_amount: pick([0, 500]), sales_accommodation_amount: pick([0, 100]),
      };
      expect(calcularTotalesUS(formData as any)).toEqual(legacyUS(formData));
    }
  });
});

describe('pricing: reglas de negocio con ejemplos', () => {
  const hora = TARIFAS[0], viaje = TARIFAS[1], vuelo = TARIFAS[2];

  it('línea normal: precio × ingenieros × horas', () => {
    const l = recalcularLinea({ tarifaId: '1', ingenieros: 2, cantidad: 8, conContrato: true, desglose: [], total: 0 }, hora);
    expect(l.total).toBe(1600);
  });

  it('sin contrato usa precio_sin_contrato', () => {
    const l = recalcularLinea({ tarifaId: '1', ingenieros: 1, cantidad: 10, conContrato: false, desglose: [], total: 0 }, hora);
    expect(l.total).toBe(1500);
  });

  it('tarifa especial del cliente solo aplica con contrato', () => {
    const tc = { '1': 90 };
    expect(precioCatalogo({ tarifaId: '1', conContrato: true }, hora, tc)).toBe(90);
    expect(precioCatalogo({ tarifaId: '1', conContrato: false }, hora, tc)).toBe(150);
  });

  it('precio manual tiene prioridad', () => {
    expect(precioUnitario({ tarifaId: '1', conContrato: true, esPrecioManual: true, precioManual: 77 }, hora, { '1': 90 })).toBe(77);
  });

  it('desglose: total = precio × suma de horas y cantidad = horas', () => {
    const l = recalcularLinea({ tarifaId: '2', ingenieros: 2, cantidad: 99, conContrato: true, desglose: [{ horas: 3 }, { horas: 5 }], total: 0 }, viaje);
    expect(l.cantidad).toBe(8);
    expect(l.total).toBe(480);
  });

  it('costo de vuelo: monto manual, 1 × 1', () => {
    const l = recalcularLinea({ tarifaId: '3', ingenieros: 4, cantidad: 9, conContrato: true, precioManual: 12500, desglose: [], total: 0 }, vuelo);
    expect(l).toMatchObject({ ingenieros: 1, cantidad: 1, esPrecioManual: true, total: 12500 });
  });

  it('subtotal en BD siempre es precio × cantidad guardada', () => {
    for (let k = 0; k < N; k++) {
      const { item, tarifa, tc } = itemAleatorio();
      const l = recalcularLinea(item, tarifa, tc);
      const sub = subtotalPartida(precioUnitario(l, tarifa, tc), cantidadParaGuardar(l, tarifa));
      expect(sub).toBeCloseTo(l.total, 6);
    }
  });

  it('sumarTotales', () => {
    expect(sumarTotales([{ total: 100 }, { total: 50.5 }])).toBe(150.5);
  });

  it('clasificación de conceptos', () => {
    expect(conceptoRequiereDesglose('Tiempo de VIAJE')).toBe(true);
    expect(conceptoRequiereDesglose('Travel time')).toBe(true);
    expect(conceptoRequiereDesglose('Hora técnico')).toBe(false);
    expect(esCostoVuelo({ concepto: 'Costo de Vuelo' })).toBe(true);
    expect(esCostoVuelo(undefined)).toBe(false);
  });

  it('ajustarDesgloseAIngenieros no modifica el arreglo original', () => {
    const original = [{ horas: 1 }];
    const crecido = ajustarDesgloseAIngenieros(original, 3, () => ({ horas: 0 }));
    expect(crecido).toHaveLength(3);
    expect(original).toHaveLength(1);
    expect(ajustarDesgloseAIngenieros(crecido, 1, () => ({ horas: 0 }))).toHaveLength(1);
  });
});

describe('pricing: edición de cotizaciones guardadas', () => {
  /** Simula: crear → guardar en BD → abrir en "editar" → efecto de recálculo. */
  function guardarYReabrir(item: Item, tarifa: TarifaCatalogo, tc: TarifasCliente) {
    const linea = recalcularLinea(item, tarifa, tc);
    const partida = {
      concepto: tarifa.concepto,
      cantidad: cantidadParaGuardar(linea, tarifa),
      precio_unitario: precioUnitario(linea, tarifa, tc),
      subtotal: linea.total,
      ingenieros: linea.ingenieros,
      desglose: linea.desglose,
    };
    return { linea, partida };
  }

  it('BUG anterior: reabrir multiplicaba de nuevo por ingenieros (documentado)', () => {
    const tarifa = TARIFAS[0];
    const { linea, partida } = guardarYReabrir(
      { id: 1, tarifaId: '1', ingenieros: 2, cantidad: 8, conContrato: true, desglose: [], total: 0 } as Item, tarifa, {});
    expect(linea.total).toBe(1600);
    const reabiertaVieja = legacyCargaEditar(partida, tarifa);
    expect(legacyEfecto(reabiertaVieja, tarifa, {})).toBe(3200); // ← el total se duplicaba
  });

  it('lineaDesdePartida conserva el total al reabrir (casos aleatorios)', () => {
    for (let k = 0; k < N; k++) {
      const { item, tarifa, tc } = itemAleatorio();
      const { linea, partida } = guardarYReabrir(item, tarifa, tc);
      const reabierta = lineaDesdePartida(partida, tarifa, tc) as LineaCotizacion;
      expect(totalLinea(reabierta, tarifa, tc)).toBeCloseTo(linea.total, 6);
      expect(precioUnitario(reabierta, tarifa, tc)).toBeCloseTo(precioUnitario(linea, tarifa, tc), 6);
    }
  });

  it('infiere "sin contrato" y precio manual', () => {
    const tarifa = TARIFAS[0];
    expect(lineaDesdePartida({ cantidad: 10, precio_unitario: 150, subtotal: 1500, ingenieros: 1 }, tarifa))
      .toMatchObject({ conContrato: false, cantidad: 10 });
    expect(lineaDesdePartida({ cantidad: 10, precio_unitario: 133, subtotal: 1330, ingenieros: 1 }, tarifa))
      .toMatchObject({ conContrato: true, esPrecioManual: true, precioManual: 133 });
  });

  it('partida sin tarifa en catálogo: conserva total y cantidad', () => {
    expect(lineaDesdePartida({ cantidad: 4, precio_unitario: 10, subtotal: 40, ingenieros: 2 }, undefined))
      .toMatchObject({ tarifaId: '', cantidad: 2, total: 40, conContrato: true });
  });
});
