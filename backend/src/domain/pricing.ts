/**
 * ============================================================================
 *  Cálculo de precios de cotizaciones — FUENTE ÚNICA DE VERDAD
 * ============================================================================
 *
 *  Funciones puras (sin React, sin red, sin estado) para que el mismo cálculo
 *  se use en el formulario, en el PDF, al guardar y en el backend.
 *
 *  ⚠️ Este archivo existe en DOS lugares con contenido idéntico:
 *     - frontend/src/features/cotizaciones/pricing.ts
 *     - backend/src/domain/pricing.ts
 *  Si cambias uno, copia el cambio al otro. La prueba `pricing.sync.test.ts`
 *  falla si dejan de ser iguales.
 *
 *  Reglas de negocio (tal como funcionaban antes del refactor):
 *   1. Precio unitario: precio manual (si está activo) > tarifa especial del
 *      cliente (solo "con contrato") > precio de catálogo con/sin contrato.
 *   2. Línea normal:          total = precio × ingenieros × cantidad (horas)
 *   3. Línea con desglose:    total = precio × suma de horas del desglose
 *      (servicios de viaje/travel; cada ingeniero tiene sus horas)
 *   4. "Costo de Vuelo":      total = precio manual; ingenieros = cantidad = 1
 *   5. En la base de datos, `cantidad` de una línea normal se guarda como
 *      horas × ingenieros, de modo que siempre: subtotal = precio × cantidad.
 * ============================================================================
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface TarifaCatalogo {
  id: string | number;
  concepto: string;
  precio_con_contrato: number;
  precio_sin_contrato: number;
  requiere_desglose?: boolean;
}

export interface HorasIngeniero {
  horas: number;
}

export interface LineaCotizacion {
  tarifaId: string;
  ingenieros: number;
  cantidad: number;
  conContrato: boolean;
  esPrecioManual?: boolean;
  precioManual?: number;
  desglose: HorasIngeniero[];
  total: number;
}

/** Tarifas especiales del cliente: { [servicio_id]: precio_contrato } */
export type TarifasCliente = Record<string, number>;

/** Partida tal como se guarda en la tabla `cotizacion_items`. */
export interface PartidaGuardada {
  concepto?: string | null;
  cantidad?: number | string | null;
  precio_unitario?: number | string | null;
  subtotal?: number | string | null;
  total?: number | string | null;
  ingenieros?: number | string | null;
  desglose?: unknown;
}

// ─── Clasificación de servicios ─────────────────────────────────────────────

/** Los servicios de viaje se cotizan con desglose de horas por ingeniero. */
export function conceptoRequiereDesglose(concepto: string): boolean {
  const c = (concepto || '').toLowerCase();
  return c.includes('viaje') || c.includes('travel');
}

/** "Costo de Vuelo" es un monto único capturado a mano. */
export function esCostoVuelo(tarifa: { concepto: string } | undefined | null): boolean {
  return !!tarifa && (tarifa.concepto || '').toLowerCase().includes('costo de vuelo');
}

// ─── Precio unitario ────────────────────────────────────────────────────────

/**
 * Precio de catálogo (sin considerar precio manual).
 * La tarifa especial del cliente solo aplica "con contrato".
 * Nota: una tarifa especial en 0 se ignora (comportamiento histórico).
 */
export function precioCatalogo(
  linea: Pick<LineaCotizacion, 'tarifaId' | 'conContrato'>,
  tarifa: TarifaCatalogo | undefined | null,
  tarifasCliente: TarifasCliente = {},
): number {
  if (linea.conContrato && tarifasCliente[linea.tarifaId]) {
    return tarifasCliente[linea.tarifaId];
  }
  if (!tarifa) return 0;
  return (linea.conContrato ? tarifa.precio_con_contrato : tarifa.precio_sin_contrato) || 0;
}

/** Precio unitario efectivo de la línea (manual > catálogo). */
export function precioUnitario(
  linea: Pick<LineaCotizacion, 'tarifaId' | 'conContrato' | 'esPrecioManual' | 'precioManual'>,
  tarifa: TarifaCatalogo | undefined | null,
  tarifasCliente: TarifasCliente = {},
): number {
  if (linea.esPrecioManual && linea.precioManual !== undefined) {
    return linea.precioManual;
  }
  return precioCatalogo(linea, tarifa, tarifasCliente);
}

// ─── Totales de línea ───────────────────────────────────────────────────────

export function horasDesglose(desglose: HorasIngeniero[] | undefined | null): number {
  return (desglose || []).reduce((acc, d) => acc + (Number(d?.horas) || 0), 0);
}

/**
 * Total de una línea con sus cantidades actuales (no recalcula horas del
 * desglose). Es el cálculo que se usa al cambiar tarifas del cliente.
 */
export function totalLinea(
  linea: LineaCotizacion,
  tarifa: TarifaCatalogo,
  tarifasCliente: TarifasCliente = {},
): number {
  const pu = precioUnitario(linea, tarifa, tarifasCliente);
  return tarifa.requiere_desglose
    ? pu * linea.cantidad
    : pu * linea.ingenieros * linea.cantidad;
}

/**
 * Recalcula una línea completa después de que el usuario cambia un campo:
 * aplica las reglas de "Costo de Vuelo" y del desglose de horas.
 * Devuelve una línea NUEVA (no modifica la recibida).
 */
export function recalcularLinea<T extends LineaCotizacion>(
  linea: T,
  tarifa: TarifaCatalogo | undefined | null,
  tarifasCliente: TarifasCliente = {},
): T {
  if (!tarifa) return { ...linea, total: 0 };

  if (esCostoVuelo(tarifa)) {
    // Precio único = precio manual. No aplica ingenieros ni horas.
    return {
      ...linea,
      ingenieros: 1,
      cantidad: 1,
      esPrecioManual: true,
      total: linea.precioManual || 0,
    };
  }

  const pu = precioUnitario(linea, tarifa, tarifasCliente);
  if (tarifa.requiere_desglose) {
    const horas = horasDesglose(linea.desglose);
    return { ...linea, cantidad: horas, total: pu * horas };
  }
  return { ...linea, total: pu * linea.ingenieros * linea.cantidad };
}

/**
 * Ajusta el desglose para que tenga una fila por ingeniero.
 * Devuelve un arreglo nuevo (agrega filas vacías o recorta las sobrantes).
 */
export function ajustarDesgloseAIngenieros<D extends HorasIngeniero>(
  desglose: D[],
  ingenieros: number,
  crearFila: () => D,
): D[] {
  const actual = [...(desglose || [])];
  if (ingenieros > actual.length) {
    while (actual.length < ingenieros) actual.push(crearFila());
    return actual;
  }
  return actual.slice(0, Math.max(0, ingenieros));
}

/** Cantidad que se guarda en BD: horas × ingenieros (o horas del desglose). */
export function cantidadParaGuardar(
  linea: Pick<LineaCotizacion, 'cantidad' | 'ingenieros'>,
  tarifa: TarifaCatalogo | undefined | null,
): number {
  return tarifa?.requiere_desglose
    ? linea.cantidad
    : linea.cantidad * (linea.ingenieros || 1);
}

export function sumarTotales(lineas: Array<{ total: number }>): number {
  return lineas.reduce((sum, l) => sum + (Number(l.total) || 0), 0);
}

// ─── Lectura de partidas guardadas (pantalla de edición) ────────────────────

const casiIgual = (a: number, b: number) => Math.abs(a - b) < 0.005;

/**
 * Reconstruye el estado del formulario a partir de una partida guardada.
 *
 * La BD no guarda tarifa, contrato ni precio manual, así que se infieren:
 *  - `cantidad` se divide entre ingenieros (en BD es horas × ingenieros).
 *  - Si el precio guardado coincide con "con contrato" o "sin contrato" se usa
 *    ese modo; si no coincide con ninguno, se conserva como precio manual.
 * Así, al abrir una cotización para editarla, los totales NO cambian solos.
 */
export function lineaDesdePartida(
  partida: PartidaGuardada,
  tarifa: TarifaCatalogo | undefined | null,
  tarifasCliente: TarifasCliente = {},
): Omit<LineaCotizacion, 'desglose'> & { desglose: unknown[] } {
  const tarifaId = tarifa ? String(tarifa.id) : '';
  const ingenieros = Number(partida.ingenieros) || 1;
  const cantidadBD = Number(partida.cantidad) || 0;
  const total = Number(partida.subtotal || partida.total) || 0;
  const desglose = Array.isArray(partida.desglose) ? partida.desglose : [];
  const vuelo = esCostoVuelo(tarifa);

  const cantidad = tarifa?.requiere_desglose || vuelo
    ? cantidadBD
    : cantidadBD / ingenieros;

  const base = { tarifaId, ingenieros, cantidad, desglose, total };

  const precioGuardado =
    partida.precio_unitario !== null && partida.precio_unitario !== undefined && partida.precio_unitario !== ''
      ? Number(partida.precio_unitario)
      : (cantidadBD ? total / cantidadBD : NaN);

  if (!tarifa || !Number.isFinite(precioGuardado)) {
    return { ...base, conContrato: true };
  }
  if (vuelo) {
    return { ...base, conContrato: true, esPrecioManual: true, precioManual: precioGuardado };
  }
  if (casiIgual(precioGuardado, precioCatalogo({ tarifaId, conContrato: true }, tarifa, tarifasCliente))) {
    return { ...base, conContrato: true };
  }
  if (casiIgual(precioGuardado, precioCatalogo({ tarifaId, conContrato: false }, tarifa, tarifasCliente))) {
    return { ...base, conContrato: false };
  }
  return { ...base, conContrato: true, esPrecioManual: true, precioManual: precioGuardado };
}

// ─── Validación en servidor ─────────────────────────────────────────────────

export const redondear2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Subtotal de una partida guardada: siempre precio × cantidad (ver regla 5). */
export function subtotalPartida(precioUnitarioGuardado: number, cantidadGuardada: number): number {
  return (Number(precioUnitarioGuardado) || 0) * (Number(cantidadGuardada) || 0);
}

// ─── Cotización US Standard (tiempo y materiales) ──────────────────────────

export interface TarifasUS {
  regular: number;
  overtime: number;
  premium: number;
  travel_reg: number;
  travel_sat: number;
  travel_sun: number;
}

export interface TramoViajeUS { reg_hrs: number | string; sat_hrs: number | string; sun_hrs: number | string }
export interface DiaLaborUS { reg_hrs: number | string; ot_hrs: number | string; premium_hrs: number | string }

export interface EntradaTotalesUS {
  travel_legs: TramoViajeUS[];
  labor_schedule: DiaLaborUS[];
  rates: TarifasUS;
  preparation_amount: number | string;
  expenses_amount: number | string;
  calibration_amount: number | string;
  sales_accommodation_amount: number | string;
}

export function calcularTotalesUS(e: EntradaTotalesUS) {
  const r = e.rates;
  let travel_subtotal = 0;
  for (const leg of e.travel_legs || []) {
    travel_subtotal += (Number(leg.reg_hrs) * r.travel_reg)
      + (Number(leg.sat_hrs) * r.travel_sat)
      + (Number(leg.sun_hrs) * r.travel_sun);
  }
  let labor_subtotal = 0;
  for (const day of e.labor_schedule || []) {
    labor_subtotal += (Number(day.reg_hrs) * r.regular)
      + (Number(day.ot_hrs) * r.overtime)
      + (Number(day.premium_hrs) * r.premium);
  }
  const grand_total = travel_subtotal + labor_subtotal
    + Number(e.preparation_amount) + Number(e.expenses_amount) + Number(e.calibration_amount)
    - Number(e.sales_accommodation_amount);
  return { travel_subtotal, labor_subtotal, grand_total };
}
