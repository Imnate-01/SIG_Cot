import { describe, it, expect } from "vitest";
import {
  aplicarSugerencias, contactoSugerido, contactosDe, equipoAnterior, opcionesMaquina, opcionesPersona, opcionesPlanta, type ClienteAutollenado,
} from "./autollenado";
import { moverFin } from "./pm";

const cliente: ClienteAutollenado = {
  id: 67, nombre: "Lala", contacto_nombre: "Compras Lala", correo: "compras@lala.mx", telefono: "555",
  cliente_direcciones: [
    { id: 31, tipo: "bill_to", empresa_planta_nombre: "INDUSTRIALIZADORA DE LECHE DE DELICIAS", contacto_nombre: "Facturación" },
    { id: 32, tipo: "ship_to", empresa_planta_nombre: "INDUSTRIALIZADORA DE LECHE DE DELICIAS", ciudad: "Delicias", contacto_nombre: "Ana Pérez", contacto_correo: "ana@lala.mx", contacto_telefono: "111" },
    { id: 34, tipo: "ship_to", empresa_planta_nombre: "GANADEROS PRODUCTORES", contacto_nombre: "" },
    { id: 35, tipo: "ship_to", empresa_planta_nombre: "Planta cerrada", activo: false },
  ],
  cliente_maquinas: [
    { id: 1, machine_id: "CFA 612-35 8696 51 007", serie: "8696 51 007", direccion_id: 32 },
    { id: 2, machine_id: "CFA 909-32 8539 51 015", serie: "8539 51 015", direccion_id: 34 },
    { id: 3, modelo_maquina: "812-35", serie: "8698 51 040", direccion_id: null },
    { id: 4, machine_id: "CFA vieja", direccion_id: 32, activo: false },
  ],
};

describe("plantas y máquinas del cliente", () => {
  it("una planta por nombre, prefiere ship_to y omite inactivas", () => {
    expect(opcionesPlanta(cliente)).toEqual([
      { valor: "INDUSTRIALIZADORA DE LECHE DE DELICIAS", detalle: "Delicias" },
      { valor: "GANADEROS PRODUCTORES", detalle: undefined },
    ]);
  });
  it("con planta: sus máquinas + las sin planta; sin planta: todas las activas", () => {
    expect(opcionesMaquina(cliente, "industrializadora de leche de delicias").map((o) => o.valor)).toEqual(["CFA 612-35 8696 51 007", "812-35 8698 51 040"]);
    expect(opcionesMaquina(cliente, "").map((o) => o.valor)).toEqual(["CFA 612-35 8696 51 007", "CFA 909-32 8539 51 015", "812-35 8698 51 040"]);
    expect(opcionesMaquina(undefined, "")).toEqual([]);
  });
});

describe("contactos", () => {
  it("contacto de la planta; si no tiene, el del cliente", () => {
    expect(contactoSugerido(cliente, "INDUSTRIALIZADORA DE LECHE DE DELICIAS")).toEqual({ nombre: "Ana Pérez", correo: "ana@lala.mx", telefono: "111" });
    expect(contactoSugerido(cliente, "GANADEROS PRODUCTORES")).toEqual({ nombre: "Compras Lala", correo: "compras@lala.mx", telefono: "555" });
  });
  it("lista sin repetidos, la planta elegida primero", () => {
    expect(contactosDe(cliente, "INDUSTRIALIZADORA DE LECHE DE DELICIAS").map((c) => c.nombre)).toEqual(["Facturación", "Ana Pérez", "Compras Lala"]);
  });
});

describe("equipo (SAM / FSE)", () => {
  const previos = [
    { fecha_inicio: "2026-01-10", sam: "Luis", fse_filler: "Eduardo", fse_downline: "" },
    { fecha_inicio: "2026-06-01", sam: "Ana Torres", fse_filler: "Luis Ortega", fse_downline: "Pedro" },
  ];
  it("toma el PM más reciente", () => {
    expect(equipoAnterior(previos)).toEqual({ sam: "Ana Torres", fse_filler: "Luis Ortega", fse_downline: "Pedro" });
    expect(equipoAnterior([])).toEqual({ sam: "", fse_filler: "", fse_downline: "" });
  });
  it("sugiere lo usado antes y después los usuarios, sin repetir", () => {
    const r = opcionesPersona(previos, "sam", [{ nombre: "ana torres" }, { nombre: "Geovanni Zayas", departamento: "Service" }]);
    expect(r.map((o) => o.valor)).toEqual(["Ana Torres", "Luis", "Geovanni Zayas"]);
  });
});

describe("aplicarSugerencias", () => {
  it("llena vacíos, reemplaza lo autollenado y respeta lo escrito a mano", () => {
    const form = { planta: "", contacto_nombre: "Escrito a mano", sam: "Auto viejo" };
    const r = aplicarSugerencias(form, { sam: "Auto viejo" }, { planta: "P1", contacto_nombre: "Ana", sam: "Nuevo" });
    expect(r.form).toEqual({ planta: "P1", contacto_nombre: "Escrito a mano", sam: "Nuevo" });
    expect(r.auto).toEqual({ planta: "P1", sam: "Nuevo" });
  });
});

describe("moverFin (comentario 2)", () => {
  it("mueve el fin los mismos días que el inicio", () => {
    expect(moverFin("2026-11-26", "2026-12-10", "2026-12-10")).toBe("2026-12-24");
    expect(moverFin("2026-11-26", "2026-11-19", "2026-12-10")).toBe("2026-12-03");
  });
  it("sin fin o con inicio incompleto no cambia nada", () => {
    expect(moverFin("2026-11-26", "2026-12-10", "")).toBe("");
    expect(moverFin("", "2026-12-10", "2026-12-10")).toBe("2026-12-10");
  });
});
