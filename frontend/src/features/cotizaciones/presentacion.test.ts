/**
 * Pruebas de los comentarios de usuarios (octubre 2026):
 *  - Reabrir y guardar una cotización no debe cambiar horas ni totales.
 *  - El PDF debe mostrar horas que permitan comprobar Total = Hrs. totales × P. Unit.
 *  - Servicios externos: tabla libre que se guarda como partidas marcadas.
 */
import { describe, it, expect } from 'vitest';
import {
  type TarifaCatalogo,
  lineaDesdePartida, cantidadParaGuardar, recalcularLinea, precioUnitario,
  horasPorIngenieroTexto, horasTotalesLinea, formatearHoras,
  totalServiciosExternos, partidaDesdeServicioExterno, esPartidaServicioExterno,
  servicioExternoDesdePartida, servicioExternoCapturado, subtotalPartida,
} from './pricing';

const normal: TarifaCatalogo = { id: 1, concepto: 'Servicio técnico horas normales', precio_con_contrato: 162.78, precio_sin_contrato: 200 };
const viaje: TarifaCatalogo = { id: 2, concepto: 'Horas de viaje', precio_con_contrato: 145.73, precio_sin_contrato: 180, requiere_desglose: true };

describe('reabrir una cotización guardada (horas duplicadas)', () => {
  it('2 ingenieros × 40 h: se guarda 80, se reabre como 40 y al volver a guardar sigue siendo 80', () => {
    const linea = recalcularLinea({ tarifaId: '1', ingenieros: 2, cantidad: 40, conContrato: true, desglose: [], total: 0 }, normal);
    expect(linea.total).toBeCloseTo(13022.4, 2);           // 162.78 × 2 × 40
    const guardada = cantidadParaGuardar(linea, normal);
    expect(guardada).toBe(80);                              // 40 × 2

    const reabierta = lineaDesdePartida({ cantidad: guardada, ingenieros: 2, precio_unitario: 162.78, subtotal: linea.total }, normal);
    expect(reabierta.cantidad).toBe(40);                    // 80 ÷ 2, NO 80
    expect(reabierta.total).toBeCloseTo(13022.4, 2);

    const recalculada = recalcularLinea({ ...reabierta, desglose: [] }, normal);
    expect(recalculada.total).toBeCloseTo(13022.4, 2);     // el total no cambia
    expect(cantidadParaGuardar(recalculada, normal)).toBe(80);
  });

  it('viaje con desglose 5 + 5: se guarda 10 y se reabre igual', () => {
    const linea = recalcularLinea({ tarifaId: '2', ingenieros: 2, cantidad: 0, conContrato: true, desglose: [{ horas: 5 }, { horas: 5 }], total: 0 }, viaje);
    expect(linea.cantidad).toBe(10);
    expect(linea.total).toBeCloseTo(1457.3, 2);             // 145.73 × 10
    const reabierta = lineaDesdePartida({ cantidad: 10, ingenieros: 2, precio_unitario: 145.73, subtotal: 1457.3, desglose: [{ horas: 5 }, { horas: 5 }] }, viaje);
    expect(reabierta.cantidad).toBe(10);
    expect(reabierta.total).toBeCloseTo(1457.3, 2);
  });
});

describe('presentación de horas en el PDF', () => {
  it('línea normal: Hrs/Ing = 40, Hrs. totales = 80 y 80 × P. Unit. = Total', () => {
    const linea = { ingenieros: 2, cantidad: 40 };
    const totales = horasTotalesLinea(linea, normal);
    expect(totales).toBe(80);
    expect(horasPorIngenieroTexto(2, totales)).toBe('40');
    expect(totales * precioUnitario({ tarifaId: '1', conContrato: true }, normal)).toBeCloseTo(13022.4, 2);
  });

  it('línea de viaje: Hrs/Ing = 5, Hrs. totales = 10 y 10 × 145.73 = 1,457.30', () => {
    const desglose = [{ horas: 5 }, { horas: 5 }];
    const totales = horasTotalesLinea({ ingenieros: 2, cantidad: 10 }, viaje);
    expect(totales).toBe(10);
    expect(horasPorIngenieroTexto(2, totales, desglose)).toBe('5');
    expect(totales * 145.73).toBeCloseTo(1457.3, 2);
  });

  it('desglose con horas distintas se lista ("6 / 4")', () => {
    expect(horasPorIngenieroTexto(2, 10, [{ horas: 6 }, { horas: 4 }])).toBe('6 / 4');
  });

  it('partida guardada (cantidad en BD = total) también se divide por ingenieros', () => {
    expect(horasPorIngenieroTexto(2, 80)).toBe('40');
    expect(horasPorIngenieroTexto(3, 10)).toBe('3.33');
  });

  it('formatearHoras quita decimales innecesarios', () => {
    expect(formatearHoras(40)).toBe('40');
    expect(formatearHoras(7.5)).toBe('7.5');
  });
});

describe('servicios externos / entrenamientos', () => {
  const lista = [
    { detalle: 'Servicio Maintenance Plus CFA 612-36 abril 2026', cantidad: 1, precioUnitario: 23857.48 },
    { detalle: 'CFA 209-32 (065) Mantenimiento correctivo Chiller', cantidad: 1, precioUnitario: 4338.05 },
  ];

  it('total = Σ cantidad × P. Unit.', () => {
    // 1 × 23,857.48 + 1 × 4,338.05 = 28,195.53
    expect(totalServiciosExternos(lista)).toBeCloseTo(28195.53, 2);
    expect(totalServiciosExternos([{ cantidad: '3', precioUnitario: '100.5' }])).toBeCloseTo(301.5, 2);
  });

  it('se guarda como partida marcada y se recupera igual', () => {
    const partida = partidaDesdeServicioExterno(lista[1]);
    expect(partida.total).toBeCloseTo(4338.05, 2);
    expect(subtotalPartida(partida.precioUnitario, partida.cantidad)).toBeCloseTo(partida.total, 2); // la verificación del servidor coincide
    expect(esPartidaServicioExterno(partida)).toBe(true);
    expect(esPartidaServicioExterno({ desglose: [{ horas: 5 }] })).toBe(false);
    expect(esPartidaServicioExterno({ desglose: null })).toBe(false);
    expect(servicioExternoDesdePartida({ concepto: partida.concepto, cantidad: partida.cantidad, precio_unitario: partida.precioUnitario }))
      .toEqual({ detalle: lista[1].detalle, cantidad: 1, precioUnitario: 4338.05 });
  });

  it('filas vacías no cuentan', () => {
    expect(servicioExternoCapturado({ detalle: '  ', cantidad: 1, precioUnitario: 0 })).toBe(false);
    expect(servicioExternoCapturado({ detalle: 'Curso', cantidad: 1, precioUnitario: 0 })).toBe(true);
  });
});
