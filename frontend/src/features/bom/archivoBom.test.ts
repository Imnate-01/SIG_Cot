import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { abrirArchivoBom, ErrorArchivoBom } from "./archivoBom";
import { detectarEncabezado, extraerPartes, mapearEncabezados } from "./leerBom";
import { compararBoms } from "./comparar";

type Fila = [string, number | null, number, string, number, string];

/** Libro con el formato de la matriz Nestlé: 3 filas de título, hojas 4K (con Interval) y 16K (sin él). */
async function matriz(nombre: string, filas: Fila[]): Promise<File> {
  const libro = new ExcelJS.Workbook();
  for (const hoja of ["4K", "16K"]) {
    const ws = libro.addWorksheet(hoja);
    ws.addRow(["Maintenance BOM of CFA 812-35"]);
    ws.addRow(["869851069 FILLING MACHINE"]);
    ws.addRow(["Nestlé", "Queretaro Mx"]);
    ws.addRow([]);
    ws.addRow(["SC", "Section", "Pos. No.", "Component number", "Object description", "Qty", "Unit", hoja === "4K" ? "Interval" : "Comments"]);
    for (const [sc, pos, pn, desc, qty, int] of filas) {
      if (hoja === "4K" && int !== "4K") continue;
      ws.addRow([sc, "Opening up", pos, pn, desc, qty, "PC", hoja === "4K" ? 4000 : "OK"]);
    }
    // Celda con fórmula, como en las hojas consolidadas.
    ws.getCell("J1").value = { formula: "SUM(F6:F9)", result: 42 };
  }
  libro.addWorksheet("Costo vs Precio", { state: "hidden" }).addRow(["Material", "Amount"]);
  const buf = await libro.xlsx.writeBuffer();
  return new File([buf], nombre);
}

const BASE: Fila[] = [
  ["SC04", 110, 860504028, "SUCTION CUP", 16, "4K"],
  ["SC04", 120, 860504031, "SUCTION CUP HOLDER", 16, "16K"],
  ["SC10", 130, 869117016, "PROXIMITY SENSOR M12", 2, "16K"],
  ["SC12", 80, 860512017, "LEVEL PROBE", 1, "16K"],
];
const OTRA: Fila[] = [
  ["SC04", 110, 860504028, "SUCTION CUP", 24, "4K"],
  ["SC04", 120, 860504031, "SUCTION CUP HOLDER", 16, "16K"],
  ["SC10", 130, 869117018, "PROXIMITY SENSOR M12", 2, "16K"],
  ["SC04", 170, 860504040, "VACUUM FILTER ELEMENT", 1, "16K"],
];

async function partes(f: File, hoja: string) {
  const a = await abrirArchivoBom(f);
  const h = a.hojas.find((x) => x.nombre === hoja)!;
  const enc = detectarEncabezado(h.filas);
  return { archivo: a, enc, partes: extraerPartes(h.filas, enc, mapearEncabezados(h.filas[enc]), h.nombre) };
}

describe("abrirArchivoBom con un .xlsx real", () => {
  it("lee solo las hojas visibles y encuentra los encabezados en la fila 5", async () => {
    const { archivo, enc, partes: p } = await partes(await matriz("MATRIZ_069.xlsx", BASE), "16K");
    expect(archivo.hojas.map((h) => h.nombre)).toEqual(["4K", "16K"]);
    expect(enc).toBe(4);
    expect(p.map((x) => `${x.sc}/${x.posicion}/${x.pn}/${x.cantidad}/${x.intervalo}`)).toEqual([
      "SC04/110/860504028/16/16K", "SC04/120/860504031/16/16K", "SC10/130/869117016/2/16K", "SC12/080/860512017/1/16K",
    ]);
    expect(p[0].fila).toBe(6);
  });
  it("en 4K toma el intervalo de la columna (4000 → 4K)", async () => {
    const { partes: p } = await partes(await matriz("MATRIZ_069.xlsx", BASE), "4K");
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ intervalo: "4K", intervaloOrigen: "fila" });
  });
  it("de punta a punta: dos matrices → lista de diferencias", async () => {
    const a = (await partes(await matriz("069.xlsx", BASE), "16K")).partes;
    const b = (await partes(await matriz("046.xlsx", OTRA), "16K")).partes;
    const r = compararBoms(a, b);
    expect(r.conteo).toMatchObject({ coinciden: 1, cantidad: 1, pn: 1, nueva: 1, retirada: 1 });
    expect(r.grupos.map((g) => [g.sc, g.nombre, g.filas.length])).toEqual([["SC04", "Opening up", 2], ["SC10", "Opening up", 1], ["SC12", "Opening up", 1]]);
  });
  it("rechaza formatos que no son .xlsx/.csv y archivos dañados", async () => {
    await expect(abrirArchivoBom(new File(["x"], "viejo.xls"))).rejects.toBeInstanceOf(ErrorArchivoBom);
    await expect(abrirArchivoBom(new File(["no es zip"], "roto.xlsx"))).rejects.toMatchObject({ codigo: "lectura" });
  });
  it("lee un CSV con ;", async () => {
    const a = await abrirArchivoBom(new File(["﻿Pos.;Component number;Object description;Structural Component;Qty\n010;860504011;Vacuum generator;SC04;1\n"], "Alpura.csv"));
    expect(a.hojas[0]).toEqual({ nombre: "Alpura", filas: [["Pos.", "Component number", "Object description", "Structural Component", "Qty"], ["010", "860504011", "Vacuum generator", "SC04", "1"]] });
  });
});
