import { describe, it, expect } from "vitest";
import {
  ETAPAS_ESTANDAR, dimensionesAjustadas, estadoEvidencia, puedeCompletar, sumarDias, agruparPorEtapa, diasHasta, etapaActual, formatearFecha, hoyISO, progreso, semaforoPm, semaforoTarea,
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
