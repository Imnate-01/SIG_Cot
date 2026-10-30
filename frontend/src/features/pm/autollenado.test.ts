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
      { valor: "INDUSTRIALIZADORA DE LECHE DE DELICIAS", detalle: "Delicias", icono: "planta" },
      { valor: "GANADEROS PRODUCTORES", detalle: undefined, icono: "planta" },
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

import { nombreMaquina, opcionesCliente } from "./autollenado";
import { calcularPosicion, filtrarOpciones } from "./Desplegable";

describe("catálogo de EE. UU. para el PM", () => {
  const clientes: ClienteAutollenado[] = [
    { id: 67, nombre: "Lala", pais: "MX" },
    { id: 1, nombre: "Sin país" },
    { id: 80, nombre: "Steuben Foods Inc.", empresa: "Steuben Foods Inc.", pais: "US", direccion: "1150 Maple Road", ciudad: "Elma, NY 14059" },
    { id: 77, nombre: "Cardiff Products", pais: "CA", ciudad: "London, ON  N6M 0C6" },
    { id: 88, nombre: "Kerry Ingredients & Flavours", pais: "US", ciudad: "Beloit, WI 53511" },
  ];
  it("no muestra clientes de México ni sin país; EE. UU. primero y por nombre", () => {
    const o = opcionesCliente(clientes);
    expect(o.map((x) => x.valor)).toEqual(["88", "80", "77"]);
    expect(o[1]).toMatchObject({ etiqueta: "Steuben Foods Inc.", detalle: "1150 Maple Road, Elma, NY 14059", grupo: "United States" });
    expect(o[2].grupo).toBe("Canada");
  });
  it("cliente sin plantas: su dirección es el sitio y salen todas sus máquinas", () => {
    const steuben: ClienteAutollenado = {
      ...clientes[2],
      cliente_maquinas: [
        { id: 1, modelo_maquina: "CFA 312-35", serie: "869351072", machine_id: "869351072", direccion_id: null },
        { id: 2, modelo_maquina: "CDA 1012-36", serie: "890151006", machine_id: "890151006", direccion_id: null },
      ],
    };
    expect(opcionesPlanta(steuben)).toEqual([{ valor: "Elma, NY 14059", detalle: "1150 Maple Road", icono: "planta" }]);
    expect(opcionesMaquina(steuben, "Elma, NY 14059").map((o) => o.valor)).toEqual(["CFA 312-35 869351072", "CDA 1012-36 890151006"]);
  });
  it("nombre de máquina: México conserva machine_id; EE. UU. antepone el modelo", () => {
    expect(nombreMaquina({ id: 1, machine_id: "CFA 612-35 8696 51 007", modelo_maquina: "612-35" })).toBe("CFA 612-35 8696 51 007");
    expect(nombreMaquina({ id: 2, machine_id: "8224N032", modelo_maquina: "CFA 405-21", serie: "8224N032" })).toBe("CFA 405-21 8224N032");
    expect(nombreMaquina({ id: 3, modelo_maquina: "812-35", serie: "8698 51 040" })).toBe("812-35 8698 51 040");
  });
});

describe("lista desplegable", () => {
  const ops = [{ valor: "Querétaro", detalle: "Planta 1" }, { valor: "Delicias", detalle: "Chihuahua" }, { valor: "CFA 405-21 8224N032" }];
  it("busca sin acentos, por varias palabras y en el detalle", () => {
    expect(filtrarOpciones(ops, "queretaro").map((o) => o.valor)).toEqual(["Querétaro"]);
    expect(filtrarOpciones(ops, "405 8224").map((o) => o.valor)).toEqual(["CFA 405-21 8224N032"]);
    expect(filtrarOpciones(ops, "chihua").map((o) => o.valor)).toEqual(["Delicias"]);
    expect(filtrarOpciones(ops, "  ")).toHaveLength(3);
  });
  it("se abre hacia arriba solo si abajo no cabe y arriba hay más espacio", () => {
    expect(calcularPosicion({ left: 10, width: 300, top: 100, bottom: 140 }, 900)).toMatchObject({ top: 146, maxHeight: 320 });
    const arriba = calcularPosicion({ left: 10, width: 300, top: 800, bottom: 840 }, 900);
    expect(arriba).toMatchObject({ bottom: 106, maxHeight: 320 });
    expect(arriba.top).toBeUndefined();
  });
});

describe("personas sin acceso a Mantenimiento", () => {
  const previos = [
    { id: "a", fecha_inicio: "2026-09-01", sam: "Beto Ruiz", fse_filler: "Ana López", fse_downline: null },
  ] as unknown as Parameters<typeof equipoAnterior>[0];
  it("no se sugieren desde PMs anteriores ni se autollenan", () => {
    const op = opcionesPersona(previos, "sam", [{ nombre: "Ana López" }], ["Beto Ruiz"]);
    expect(op.map((o) => o.valor)).toEqual(["Ana López"]);
    expect(equipoAnterior(previos, ["beto ruiz"])).toEqual({ sam: "", fse_filler: "Ana López", fse_downline: "" });
  });
  it("un nombre externo (no es usuario del sistema) se sigue sugiriendo", () => {
    expect(opcionesPersona(previos, "sam", [], ["Otra Persona"]).map((o) => o.valor)).toEqual(["Beto Ruiz"]);
  });
});
