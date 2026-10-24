import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compararAlertas, diasEntre, esFechaValida, evaluarAlerta, motivoParaUsuario, nivelAlerta, sumarDiasISO, type TareaParaAlerta } from "./alertas";

const YO = "u-yo", OTRO = "u-otro";
const pm = { estado: "active", creado_por: YO };
const tarea = (o: Partial<TareaParaAlerta> = {}): TareaParaAlerta => ({ completada: false, fecha_limite: "2026-10-30", asignado_a: null, colaboradores: [], ...o });
const HOY = "2026-10-23";

describe("fechas", () => {
  it("diasEntre: 30 − 23 = 7; 20 − 23 = −3; cruza mes y cambio de horario", () => {
    expect(diasEntre("2026-10-30", HOY)).toBe(7);
    expect(diasEntre("2026-10-20", HOY)).toBe(-3);
    expect(diasEntre("2026-11-02", HOY)).toBe(10); // 8 días de octubre + 2 de noviembre
    expect(sumarDiasISO(HOY, 7)).toBe("2026-10-30");
  });
  it("esFechaValida", () => {
    expect(esFechaValida("2026-10-23")).toBe(true);
    expect(esFechaValida("2026-02-30")).toBe(false);
    expect(esFechaValida("23/10/2026")).toBe(false);
    expect(esFechaValida(undefined)).toBe(false);
  });
});

describe("nivel (aviso con 7 días de anticipación)", () => {
  it("vencida, hoy, 7 días, 8 días", () => {
    expect(nivelAlerta(tarea({ fecha_limite: "2026-10-22" }), pm, HOY)).toEqual({ nivel: "overdue", dias: -1 });
    expect(nivelAlerta(tarea({ fecha_limite: "2026-10-23" }), pm, HOY)).toEqual({ nivel: "due_soon", dias: 0 });
    expect(nivelAlerta(tarea({ fecha_limite: "2026-10-30" }), pm, HOY)).toEqual({ nivel: "due_soon", dias: 7 });
    expect(nivelAlerta(tarea({ fecha_limite: "2026-10-31" }), pm, HOY)).toBeNull();
  });
  it("no alerta: completada, PM cancelado o completado, sin fecha", () => {
    expect(nivelAlerta(tarea({ completada: true, fecha_limite: "2026-01-01" }), pm, HOY)).toBeNull();
    expect(nivelAlerta(tarea({ fecha_limite: "2026-01-01" }), { ...pm, estado: "cancelled" }, HOY)).toBeNull();
    expect(nivelAlerta(tarea({ fecha_limite: "2026-01-01" }), { ...pm, estado: "completed" }, HOY)).toBeNull();
    expect(nivelAlerta(tarea({ fecha_limite: null }), pm, HOY)).toBeNull();
  });
});

describe("destinatario", () => {
  it("asignado > colaborador > creador (solo si no hay responsable)", () => {
    expect(motivoParaUsuario(tarea({ asignado_a: YO, colaboradores: [YO] }), pm, YO)).toBe("assigned");
    expect(motivoParaUsuario(tarea({ asignado_a: OTRO, colaboradores: [YO] }), pm, YO)).toBe("collaborator");
    expect(motivoParaUsuario(tarea(), pm, YO)).toBe("creator");
    expect(motivoParaUsuario(tarea({ asignado_a: OTRO }), pm, YO)).toBeNull(); // la delegó: ya no le llega
    expect(motivoParaUsuario(tarea(), { ...pm, creado_por: OTRO }, YO)).toBeNull();
  });
  it("evaluarAlerta: 'mías' filtra; 'todas' (usuario null) no", () => {
    const t = tarea({ asignado_a: OTRO, fecha_limite: "2026-10-20" });
    expect(evaluarAlerta(t, pm, HOY, YO)).toBeNull();
    expect(evaluarAlerta(t, pm, HOY, OTRO)).toEqual({ nivel: "overdue", dias: -3, motivo: "assigned" });
    expect(evaluarAlerta(t, pm, HOY, null)).toEqual({ nivel: "overdue", dias: -3, motivo: null });
  });
});

describe("orden", () => {
  it("vencidas primero (más atrasada arriba), luego por vencer (más próxima arriba)", () => {
    const l = [{ nivel: "due_soon" as const, dias: 5 }, { nivel: "overdue" as const, dias: -1 }, { nivel: "due_soon" as const, dias: 0 }, { nivel: "overdue" as const, dias: -10 }];
    expect([...l].sort(compararAlertas).map((x) => `${x.nivel}:${x.dias}`)).toEqual(["overdue:-10", "overdue:-1", "due_soon:0", "due_soon:5"]);
  });
});

describe.skipIf(!existsSync(resolve(__dirname, "../../../../backend/src/domain/pmAlertas.ts")))("copias sincronizadas", () => {
  it("frontend y backend tienen el mismo archivo", () => {
    const n = (s: string) => s.replace(/\r\n/g, "\n");
    expect(n(readFileSync(resolve(__dirname, "../../../../backend/src/domain/pmAlertas.ts"), "utf8")))
      .toBe(n(readFileSync(resolve(__dirname, "alertas.ts"), "utf8")));
  });
});
