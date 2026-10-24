import { describe, it, expect } from "vitest";
import {
  ETAPAS_ESTANDAR, fechaEtapa, fechaLocalDe, cuentaRegresiva, estadoEtapa, etiquetaSemana, iniciales, dimensionesAjustadas, estadoEvidencia, puedeCompletar, sumarDias, agruparPorEtapa, diasHasta, etapaActual, formatearFecha, hoyISO, progreso, semaforoPm, semaforoTarea,
  type PmTarea,
} from "./pm";

const tarea = (o: Partial<PmTarea>): PmTarea => ({
  id: "x", codigo: "PM-01", etapa_orden: 1, etapa: "18 weeks before PM", semanas: -18, titulo: "t",
  evidencia: "none", orden: 1, fecha_limite: "2027-04-04", asignado_a: null, completada: false,
  completada_por: null, completada_en: null, notas: null, colaboradores: [], ...o,
});

describe("fechas", () => {
  it("diasHasta cuenta días calendario (sin errores por horario de verano)", () => {
    expect(diasHasta("2027-04-04", "2027-04-04")).toBe(0);
    expect(diasHasta("2027-04-11", "2027-04-04")).toBe(7);
    expect(diasHasta("2027-03-28", "2027-04-04")).toBe(-7);
    // cruza el cambio de horario de marzo/abril y de octubre/noviembre
    expect(diasHasta("2027-11-10", "2027-10-20")).toBe(21);
    expect(diasHasta("2027-08-08", "2027-04-04")).toBe(126); // 18 semanas × 7
  });
  it("hoyISO usa la fecha local", () => {
    expect(hoyISO(new Date(2027, 7, 8, 23, 59))).toBe("2027-08-08");
  });
  it("formatearFecha no se corre un día", () => {
    expect(formatearFecha("2027-08-08")).toBe("Aug 8, 2027");
    expect(formatearFecha(null)).toBe("—");
  });
});

describe("semáforo de tarea (por vencer = 7 días o menos)", () => {
  const hoy = "2027-04-01";
  it("completada siempre es 'done'", () => {
    expect(semaforoTarea(tarea({ completada: true, fecha_limite: "2020-01-01" }), hoy)).toBe("done");
  });
  it("vencida: fecha anterior a hoy", () => {
    expect(semaforoTarea(tarea({ fecha_limite: "2027-03-31" }), hoy)).toBe("overdue");
  });
  it("vence hoy y en 7 días → por vencer; en 8 días → en tiempo", () => {
    expect(semaforoTarea(tarea({ fecha_limite: "2027-04-01" }), hoy)).toBe("due_soon");
    expect(semaforoTarea(tarea({ fecha_limite: "2027-04-08" }), hoy)).toBe("due_soon");
    expect(semaforoTarea(tarea({ fecha_limite: "2027-04-09" }), hoy)).toBe("on_track");
  });
  it("sin fecha", () => {
    expect(semaforoTarea(tarea({ fecha_limite: null }), hoy)).toBe("no_date");
  });
});

describe("etapas y avance", () => {
  const tareas = [
    tarea({ id: "a", orden: 2, completada: true }),
    tarea({ id: "b", orden: 1, completada: true }),
    tarea({ id: "c", orden: 3, etapa_orden: 2, etapa: "17 weeks before PM", fecha_limite: "2027-04-11" }),
  ];
  it("agrupa y ordena por etapa", () => {
    const e = agruparPorEtapa(tareas);
    expect(e.map((x) => [x.orden, x.tareas.map((t) => t.id).join(""), x.completadas])).toEqual([[1, "ba", 2], [2, "c", 0]]);
  });
  it("la etapa actual es la primera con pendientes", () => {
    expect(etapaActual(agruparPorEtapa(tareas))).toBe(2);
    expect(etapaActual(agruparPorEtapa(tareas.map((t) => ({ ...t, completada: true }))))).toBeNull();
  });
  it("progreso: 12 de 31 = 38.7% → 39%", () => {
    const t = Array.from({ length: 31 }, (_, i) => ({ completada: i < 12 }));
    expect(progreso(t)).toEqual({ total: 31, completadas: 12, restantes: 19, porcentaje: 39 });
    expect(progreso([])).toEqual({ total: 0, completadas: 0, restantes: 0, porcentaje: 0 });
  });
});

describe("semáforo del PM", () => {
  const hoy = "2027-04-01";
  const base = { vencidas: 0, proxima_fecha: "2027-06-01" };
  it("prioridad: completado/cancelado > vencido > por vencer > en tiempo", () => {
    expect(semaforoPm({ estado: "completed", progreso: { ...base, vencidas: 3 } }, hoy)).toBe("done");
    expect(semaforoPm({ estado: "cancelled", progreso: base }, hoy)).toBe("cancelled");
    expect(semaforoPm({ estado: "active", progreso: { ...base, vencidas: 1 } }, hoy)).toBe("overdue");
    expect(semaforoPm({ estado: "active", progreso: { vencidas: 0, proxima_fecha: "2027-04-05" } }, hoy)).toBe("due_soon");
    expect(semaforoPm({ estado: "active", progreso: base }, hoy)).toBe("on_track");
  });
});

describe("vista previa de fechas", () => {
  it("inicio 08/08/2027: −126, −119, −112, −28, −14, 0, +7, +21 días", () => {
    const f = ETAPAS_ESTANDAR.map((e) => sumarDias("2027-08-08", e.semanas * 7));
    expect(f).toEqual(["2027-04-04", "2027-04-11", "2027-04-18", "2027-07-11", "2027-07-25", "2027-08-08", "2027-08-15", "2027-08-29"]);
  });
  it("las 8 etapas suman las 31 tareas", () => {
    expect(ETAPAS_ESTANDAR.reduce((a, e) => a + e.tareas, 0)).toBe(31);
  });
});

describe("evidencia de una tarea", () => {
  const ev = { id: "e", tipo: "file" as const, nombre: "po.pdf", mime: "application/pdf", tamano: 1, cotizacion_id: null, subido_por: null, created_at: "2026-10-23T00:00:00Z" };
  it("estados según nivel y archivos", () => {
    expect(estadoEvidencia({ evidencia: "required", evidencias: [] })).toBe("missing");
    expect(estadoEvidencia({ evidencia: "required" })).toBe("missing");
    expect(estadoEvidencia({ evidencia: "required", evidencias: [ev] })).toBe("provided");
    expect(estadoEvidencia({ evidencia: "optional", evidencias: [] })).toBe("optional_empty");
    expect(estadoEvidencia({ evidencia: "none", evidencias: [] })).toBe("not_needed");
    expect(estadoEvidencia({ evidencia: "none", evidencias: [ev] })).toBe("provided");
  });
  it("solo bloquea completar una obligatoria sin evidencia", () => {
    expect(puedeCompletar({ evidencia: "required", evidencias: [], completada: false })).toBe(false);
    expect(puedeCompletar({ evidencia: "required", evidencias: [ev], completada: false })).toBe(true);
    expect(puedeCompletar({ evidencia: "optional", evidencias: [], completada: false })).toBe(true);
    expect(puedeCompletar({ evidencia: "required", evidencias: [], completada: true })).toBe(true); // desmarcar siempre se puede
  });
  it("dimensionesAjustadas: reduce proporcional y nunca agranda", () => {
    expect(dimensionesAjustadas(4000, 3000, 2000)).toEqual({ ancho: 2000, alto: 1500 });
    expect(dimensionesAjustadas(3000, 4000, 2000)).toEqual({ ancho: 1500, alto: 2000 });
    expect(dimensionesAjustadas(1200, 800, 2000)).toEqual({ ancho: 1200, alto: 800 });
  });
});

describe("línea de tiempo del PM", () => {
  it("etiquetaSemana", () => {
    expect(etiquetaSemana(-18)).toBe("T\u221218 wk");
    expect(etiquetaSemana(0)).toBe("PM day");
    expect(etiquetaSemana(3)).toBe("T+3 wk");
  });
  it("cuentaRegresiva: 85 días → 13 semanas (85 / 7 = 12.1, hacia arriba); 13 días → días; hoy; después", () => {
    expect(cuentaRegresiva("2027-01-16", "2026-10-23")).toEqual({ tipo: "antes", unidad: "semanas", valor: 13 });
    expect(cuentaRegresiva("2026-11-05", "2026-10-23")).toEqual({ tipo: "antes", unidad: "dias", valor: 13 });
    expect(cuentaRegresiva("2026-11-06", "2026-10-23")).toEqual({ tipo: "antes", unidad: "semanas", valor: 2 });
    expect(cuentaRegresiva("2026-10-23", "2026-10-23")).toEqual({ tipo: "hoy" });
    expect(cuentaRegresiva("2026-10-20", "2026-10-23")).toEqual({ tipo: "despues", unidad: "dias", valor: 3 });
    expect(cuentaRegresiva("2026-09-01", "2026-10-23")).toEqual({ tipo: "despues", unidad: "semanas", valor: 7 }); // 52 días = 7.4 → 7
  });
  it("estadoEtapa: completa > con vencidas > actual > próxima", () => {
    const base = { completada: false, fecha_limite: "2026-11-30", evidencia: "none" as const };
    const mk = (orden: number, tareas: Array<Partial<PmTarea>>) => agruparPorEtapa(tareas.map((x, i) => tarea({ id: `${orden}-${i}`, etapa_orden: orden, orden: orden * 10 + i, ...base, ...x })))[0];
    expect(estadoEtapa(mk(1, [{ completada: true }, { completada: true }]), "2026-10-23", 2)).toBe("done");
    expect(estadoEtapa(mk(1, [{ completada: true }, { fecha_limite: "2026-10-01" }]), "2026-10-23", 2)).toBe("overdue");
    expect(estadoEtapa(mk(2, [{}]), "2026-10-23", 2)).toBe("current");
    expect(estadoEtapa(mk(3, [{}]), "2026-10-23", 2)).toBe("upcoming");
  });
  it("iniciales", () => {
    expect(iniciales("Geo Martínez")).toBe("GM");
    expect(iniciales("Ana")).toBe("A");
    expect(iniciales("claudio.depa@sig.biz")).toBe("CD");
    expect(iniciales(null)).toBe("?");
  });
});

describe("fechas mostradas", () => {
  it("fechaLocalDe usa el día local, no el de UTC (7:30 pm en México ya es mañana en UTC)", () => {
    expect(fechaLocalDe(new Date(2026, 9, 23, 19, 30).toISOString())).toBe("2026-10-23");
    expect(fechaLocalDe(new Date(2026, 9, 23, 0, 5).toISOString())).toBe("2026-10-23");
  });
  it("fechaEtapa con inicio 23-oct-2026: T−18 = 19 jun, T−17 = 26 jun, T−16 = 3 jul, PM day = 23 oct", () => {
    // 19 jun → 23 oct: 11 + 31 + 31 + 30 + 23 = 126 días = 18 × 7
    expect(fechaEtapa("2026-10-23", -18)).toBe("2026-06-19");
    expect(fechaEtapa("2026-10-23", -17)).toBe("2026-06-26");
    expect(fechaEtapa("2026-10-23", -16)).toBe("2026-07-03");
    expect(fechaEtapa("2026-10-23", 0)).toBe("2026-10-23");
  });
});
