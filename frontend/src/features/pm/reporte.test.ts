import { describe, it, expect } from "vitest";
import { nombreArchivoReporte, prepararReporte } from "./reporte";
import type { PmDetalle, PmTarea } from "./pm";

const U = { u1: { id: "u1", nombre: "Ana Torres", email: null }, u2: { id: "u2", nombre: "Geo M.", email: null } };
const t = (o: Partial<PmTarea>): PmTarea => ({ id: o.codigo || "x", codigo: "PM-01", etapa_orden: 1, etapa: "18 weeks before PM", semanas: -18, titulo: "Task", evidencia: "none", orden: 1,
  fecha_limite: "2026-10-01", asignado_a: null, completada: false, completada_por: null, completada_en: null, notas: null, colaboradores: [], evidencias: [], ...o });
const ev = (tipo: "file" | "link" | "quote") => ({ id: Math.random().toString(), tipo, nombre: "x", mime: null, tamano: null, cotizacion_id: null, subido_por: null, created_at: "2026-10-01T00:00:00Z" });

const pm = {
  id: "p", cliente_id: 1, clientes: { id: 1, nombre: "Lácteos del Valle", empresa: null }, planta: "Planta Querétaro", linea: "L3",
  contacto_nombre: null, contacto_telefono: null, contacto_correo: null, sam: null, po_numero: null, fse_filler: null, fse_downline: null,
  fecha_inicio: "2027-01-15", fecha_fin: null, estado: "active", notas_abiertas: null, creado_por: "u1", usuarios: U,
  tareas: [
    t({ codigo: "PM-01", orden: 1, evidencia: "required", completada: true, completada_por: "u1", completada_en: "2026-09-30T18:00:00Z", colaboradores: ["u2"], evidencias: [ev("file"), ev("file")] }),
    t({ codigo: "PM-02", orden: 2, evidencia: "optional", asignado_a: "u2", notas: "Waiting on plant" }),
    t({ codigo: "PM-08", orden: 3, etapa_orden: 3, etapa: "16 weeks before PM", evidencia: "required", fecha_limite: "2026-10-26" }),
    t({ codigo: "PM-31", orden: 4, etapa_orden: 7, etapa: "1 week post PM", evidencia: "required", fecha_limite: "2027-01-22", evidencias: [ev("quote")] }),
  ],
} as PmDetalle;

describe("prepararReporte (hoy = 23 oct 2026)", () => {
  const r = prepararReporte(pm, "2026-10-23");
  it("resumen: 1 de 4 = 25%, 1 vencida, 2 archivos, 1 cotización, 1 obligatoria sin evidencia", () => {
    expect(r.resumen).toEqual({ total: 4, completadas: 1, porcentaje: 25, restantes: 3, vencidas: 1, archivos: 2, enlaces: 0, cotizaciones: 1, faltaEvidencia: 1 });
  });
  it("etapas en orden con su conteo", () => {
    expect(r.etapas.map((e) => `${e.nombre} ${e.completadas}/${e.total}`)).toEqual(["18 weeks before PM 1/2", "16 weeks before PM 0/1", "1 week post PM 0/1"]);
  });
  it("filas: estado, responsable, fecha, colaboradores, evidencias y notas", () => {
    const [a, b] = r.etapas[0].filas;
    expect(a).toMatchObject({ estado: "Completed", responsable: "Ana Torres", cuando: "Sep 30, 2026", colaboradores: "Geo M.", evidencias: "2 files" });
    expect(b).toMatchObject({ estado: "Overdue", responsable: "Geo M.", cuando: "", evidencias: "", notas: "Waiting on plant" });
    expect(r.etapas[1].filas[0]).toMatchObject({ estado: "Due soon", evidencias: "Missing (required)" }); // vence en 3 días
    expect(r.etapas[2].filas[0]).toMatchObject({ estado: "Pending", evidencias: "1 quote" });
  });
  it("nombre del archivo sin acentos ni espacios", () => {
    expect(nombreArchivoReporte(pm)).toBe("PM_Lacteos_del_Valle_Planta_Queretaro_2027-01-15.pdf");
    expect(nombreArchivoReporte({ ...pm, planta: null })).toBe("PM_Lacteos_del_Valle_2027-01-15.pdf");
  });
});

describe("evidencia por enlace", () => {
  it("cuenta en el resumen y en la fila, y cumple la evidencia obligatoria", () => {
    const conEnlace = { ...pm, tareas: [t({ codigo: "PM-08", evidencia: "required", fecha_limite: "2026-10-26", evidencias: [ev("link"), ev("link"), ev("file")] })] } as PmDetalle;
    const r = prepararReporte(conEnlace, "2026-10-23");
    expect(r.resumen).toMatchObject({ archivos: 1, enlaces: 2, faltaEvidencia: 0 });
    expect(r.etapas[0].filas[0].evidencias).toBe("1 file, 2 links");
  });
});
