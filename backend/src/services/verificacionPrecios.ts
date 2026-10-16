/**
 * Verificación de precios en el servidor.
 *
 * El navegador calcula los totales y los manda en el body. Aquí se vuelven a
 * calcular con el MISMO módulo (domain/pricing.ts) para detectar totales
 * manipulados o desfasados.
 *
 * Modo por defecto (PRICING_ENFORCE no definido): solo se REGISTRAN las
 * diferencias en el log y se guarda lo que mandó el cliente (como antes).
 * Con PRICING_ENFORCE=true se guardan los valores calculados por el servidor.
 *
 * Recomendación: desplegar en modo registro, revisar el log unos días y,
 * si no aparecen diferencias legítimas, activar PRICING_ENFORCE=true.
 */
import {
  redondear2,
  subtotalPartida,
  horasDesglose,
  conceptoRequiereDesglose,
  calcularTotalesUS,
  type TarifasUS,
} from '../domain/pricing';

export const PRICING_ENFORCE = process.env.PRICING_ENFORCE === 'true';

/** Diferencia máxima aceptada (redondeo a centavos). */
const TOLERANCIA = 0.01;

const difiere = (a: number, b: number) => Math.abs(a - b) > TOLERANCIA;

/** Partida tal como la manda el formulario de cotizaciones. */
export interface PartidaEntrada {
  concepto?: string;
  cantidad?: number | string;
  precioUnitario?: number | string;
  total?: number | string;
  desglose?: Array<{ horas?: number | string }>;
}

export interface ResultadoVerificacion {
  /** Subtotal por partida calculado por el servidor (2 decimales). */
  subtotales: number[];
  /** Total de la cotización calculado por el servidor (2 decimales). */
  total: number;
  /** Descripción legible de cada diferencia encontrada. */
  diferencias: string[];
}

/**
 * Regla: en cada partida, subtotal = precio unitario × cantidad guardada,
 * y el total de la cotización es la suma de subtotales.
 */
export function verificarCotizacion(items: PartidaEntrada[], totalCliente: unknown): ResultadoVerificacion {
  const diferencias: string[] = [];

  const subtotales = (items || []).map((item, idx) => {
    const etiqueta = `partida ${idx + 1} (${item.concepto || 'sin concepto'})`;
    const subtotal = redondear2(subtotalPartida(Number(item.precioUnitario), Number(item.cantidad)));
    const subtotalCliente = Number(item.total) || 0;

    if (difiere(subtotal, subtotalCliente)) {
      diferencias.push(`${etiqueta}: subtotal cliente=${subtotalCliente} servidor=${subtotal}`);
    }

    // En servicios de viaje la cantidad debe ser la suma de horas del desglose
    if (conceptoRequiereDesglose(item.concepto || '') && Array.isArray(item.desglose) && item.desglose.length > 0) {
      const horas = horasDesglose(item.desglose as Array<{ horas: number }>);
      if (difiere(horas, Number(item.cantidad) || 0)) {
        diferencias.push(`${etiqueta}: cantidad=${item.cantidad} pero el desglose suma ${horas} h`);
      }
    }
    return subtotal;
  });

  const total = redondear2(subtotales.reduce((a, b) => a + b, 0));
  const totalRecibido = Number(totalCliente) || 0;
  if (difiere(total, totalRecibido)) {
    diferencias.push(`total cliente=${totalRecibido} servidor=${total}`);
  }

  return { subtotales, total, diferencias };
}

export interface EntradaUS {
  rates?: Partial<TarifasUS>;
  travel_legs?: unknown;
  labor_schedule?: unknown;
  preparation_amount?: unknown;
  expenses_amount?: unknown;
  calibration_amount?: unknown;
  sales_accommodation_amount?: unknown;
  travel_subtotal?: unknown;
  labor_subtotal?: unknown;
  grand_total?: unknown;
}

const CLAVES_TARIFAS_US: Array<keyof TarifasUS> = ['regular', 'overtime', 'premium', 'travel_reg', 'travel_sat', 'travel_sun'];

/**
 * Cotización US Standard: recalcula subtotales con las tarifas enviadas.
 * Devuelve null si no vienen tarifas completas (no se puede verificar).
 */
export function verificarCotizacionUS(body: EntradaUS) {
  const r = body.rates;
  if (!r || !CLAVES_TARIFAS_US.every((k) => Number.isFinite(Number(r[k])))) return null;

  const rates = Object.fromEntries(CLAVES_TARIFAS_US.map((k) => [k, Number(r[k])])) as unknown as TarifasUS;
  const calculado = calcularTotalesUS({
    rates,
    travel_legs: Array.isArray(body.travel_legs) ? body.travel_legs : [],
    labor_schedule: Array.isArray(body.labor_schedule) ? body.labor_schedule : [],
    preparation_amount: Number(body.preparation_amount) || 0,
    expenses_amount: Number(body.expenses_amount) || 0,
    calibration_amount: Number(body.calibration_amount) || 0,
    sales_accommodation_amount: Number(body.sales_accommodation_amount) || 0,
  });

  const totales = {
    travel_subtotal: redondear2(calculado.travel_subtotal),
    labor_subtotal: redondear2(calculado.labor_subtotal),
    grand_total: redondear2(calculado.grand_total),
  };

  const diferencias: string[] = [];
  for (const campo of ['travel_subtotal', 'labor_subtotal', 'grand_total'] as const) {
    const recibido = Number(body[campo]) || 0;
    if (difiere(totales[campo], recibido)) {
      diferencias.push(`${campo}: cliente=${recibido} servidor=${totales[campo]}`);
    }
  }
  return { totales, rates, diferencias };
}

/** Registra las diferencias en el log con un prefijo fácil de buscar. */
export function registrarDiferencias(contexto: string, diferencias: string[]) {
  if (diferencias.length === 0) return;
  console.warn(
    `[precios] ${contexto}: ${diferencias.length} diferencia(s)` +
      (PRICING_ENFORCE ? ' — se guardan los valores del servidor' : ' — modo registro, se guardan los del cliente'),
    diferencias,
  );
}
