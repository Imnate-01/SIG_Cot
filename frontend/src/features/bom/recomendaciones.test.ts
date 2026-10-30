import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { abrirArchivoBom } from "./archivoBom";
import { detectarEncabezado, extraerPartes, mapearEncabezados, type ParteBom } from "./leerBom";
import { compararBoms } from "./comparar";
import { generarRecomendaciones, tieneAleman } from "./recomendaciones";
import { elegirHoja, partesDe } from "./PanelArchivo";

type Fila = [string, number, string, number, string];

/**
 * Libro con el formato de la BOM CFA 406-32 V2.5 (datos inventados): dos filas de
 * título, encabezado "Structural⏎Component" sin columna de posición, hojas PM_4K…PM_16K,
 * SC con decimales (SC23.4), una pieza repetida y una fila final con =SUM sin valor.
 */
async function bom406(nombre: string, h16: Fila[]): Promise<File> {
  const libro = new ExcelJS.Workbook();
  const hojas: Record<string, Fila[]> = { PM_4K: h16.slice(0, 2), PM_8K: h16.slice(0, 4), PM_12K: h16.slice(0, 5), PM_16K: h16 };
  for (const [n, filas] of Object.entries(hojas)) {
    const ws = libro.addWorksheet(n);
    ws.addRow(["Maintenance BOM of CFA 206/405/406-32"]);
    ws.addRow(["CFA 406-32 Cliente de prueba"]);
    ws.addRow(["Structural\nComponent", "Component number", "Object description", "Qty", "Unit"]);
    filas.forEach((f) => ws.addRow(f));
    ws.addRow([null, null, null, { formula: `SUM(D4:D${filas.length + 3})` }, null]);
  }
  return new File([await libro.xlsx.writeBuffer()], nombre);
}

const V25: Fila[] = [
  ["SC04", 900000001, "SUCTION CUP", 12, "PC"],
  ["SC04", 900000002, "SET OF WEAR PARTS FUER 900000099", 1, "PC"],
  ["SC10", 900000003, "BEARING BUSH", 2, "PC"],
  ["SC18", 900000004, "SEALING PLATE", 4, "PC"],
  ["SC23.4", 900000005, "SEAL RING DN40-KLEMMRING", 4, "PC"],
  ["SC23.4", 900000005, "SEAL RING DN40-KLEMMRING", 1, "PC"],
  ["SC44", 900000006, "SILENCER SINTERBRONZE G1-2", 1, "PC"],
  ["SC49", 900000007, "2/2-WAY VALVE", 2, "PC"],
  ["SC79", 900000008, "SEAL RING NW50", 2, "PC"],
  ["SC80", 900000009, "O-RING 6X2,5", 4, "PC"],
];
const V26: Fila[] = [
  ["SC04", 900000001, "SUCTION CUP", 16, "PC"],                              // cantidad
  ["SC04", 900000002, "SET OF WEAR PARTS (FUER 900000099)", 1, "PC"],        // solo signos: no cuenta
  ["SC10", 900000013, "BEARING BUSH", 2, "PC"],                              // posible sustitución
  ["SC18", 900000004, "SEALING PLATE KOMPLETT SEGM./PULPE", 4, "PC"],        // descripción
  ["SC23.4", 900000005, "SEAL RING DN40-KLEMMRING", 4, "PC"],
  ["SC23.4", 900000005, "SEAL RING DN40-KLEMMRING", 1, "PC"],
  ["SC48", 900000007, "2/2-WAY VALVE", 2, "PC"],                             // cambio de SC (sale SC44: retirada)
  ["SC79", 900000008, "SEAL RING NW50", 2, "SET"],                           // unidad
  ["SC80", 900000009, "O-RING 6X2,5", 4, "PC"],
  ["SC80", 900000009, "O-RING 6X2,5", 4, "PC"],                              // duplicado nuevo
  ["SC86", 900000010, "O-RING 135X3", 2, "PC"],                              // nueva
];

async function hoja16(f: File): Promise<ParteBom[]> {
  const a = await abrirArchivoBom(f);
  const h = a.hojas.find((x) => x.nombre === "PM_16K")!;
  const e = detectarEncabezado(h.filas);
  return extraerPartes(h.filas, e, mapearEncabezados(h.filas[e]), h.nombre);
}

describe("BOM con el formato CFA 406-32 (sin posición)", async () => {
  const A = await hoja16(await bom406("BOM_CFA_406-32_V2.5.xlsx", V25));
  const B = await hoja16(await bom406("BOM_CFA_406-32_V2.6.xlsx", V26));
  const r = compararBoms(A, B);
  const recs = generarRecomendaciones(r, A, B);
  const rec = (id: string) => recs.find((x) => x.id === id);

  it("lee encabezado con salto de línea, SC23.4, intervalo de PM_16K y omite la fila de =SUM", () => {
    expect(A).toHaveLength(10);
    expect(A[4]).toMatchObject({ sc: "SC23.4", posicion: null, intervalo: "16K", intervaloOrigen: "hoja", fila: 8 });
  });
  it("conteos: 1 cantidad, 1 descripción, 1 unidad, 3 retiradas, 4 nuevas; los signos no cuentan", () => {
    // Base 10, comparar 11. Retiradas: 900000003 (sust.), 900000006, 900000007@SC49 = 3.
    // Nuevas: 900000013, 900000007@SC48, 2º 900000009, 900000010 = 4. Coinciden: 10 − 3 − 3 cambiadas = 4.
    expect(r.conteo).toMatchObject({ cantidad: 1, descripcion: 1, unidad: 1, retirada: 3, nueva: 4, coinciden: 4 });
  });
  it("recomendaciones de prioridad alta primero, con sus ejemplos", () => {
    expect(recs.map((x) => `${x.prioridad}:${x.id}:${x.conteo}`)).toEqual([
      "alta:sustitucion:1", "alta:cambioSc:1", "alta:retiradas:1", "alta:unidad:1",
      "media:cantidad:1", "media:descripcion:1", "media:nuevas:1", "media:duplicados:2",
      "info:sinPosicion:1", "info:aleman:3",
    ]);
    expect(rec("sustitucion")!.ejemplos).toEqual(["SC10 · 900000003 → 900000013 · BEARING BUSH"]);
    expect(rec("cambioSc")!.ejemplos).toEqual(["900000007 · 2/2-WAY VALVE · SC49 → SC48"]);
    expect(rec("retiradas")!.ejemplos).toEqual(["SC44 · 900000006 · SILENCER SINTERBRONZE G1-2"]);
    expect(rec("nuevas")!.ejemplos).toEqual(["SC86 · 900000010 · O-RING 135X3"]);
    // El duplicado nuevo va antes que el que ya estaba repetido en la base.
    expect(rec("duplicados")!.ejemplos).toEqual(["SC80 · 900000009 · O-RING 6X2,5 · 1× → 2×", "SC23.4 · 900000005 · SEAL RING DN40-KLEMMRING · 2× → 2×"]);
    expect(rec("unidad")!.ejemplos).toEqual(["SC79 · 900000008 · SEAL RING NW50: PC → SET"]);
  });
  it("dos BOMs iguales: solo 'sin cambios' (y avisos informativos)", () => {
    const iguales = generarRecomendaciones(compararBoms(A, A), A, A).map((x) => x.id);
    expect(iguales).toEqual(["duplicados", "sinPosicion", "aleman", "sinCambios"]);
  });
  it("mismo libro en los dos lados: abre otra hoja (la más cercana)", async () => {
    const a = await abrirArchivoBom(await bom406("BOM.xlsx", V25));
    const izq = elegirHoja(a);
    expect(a.hojas[izq.hoja].nombre).toBe("PM_16K");
    const der = elegirHoja(a, izq);
    expect(a.hojas[der.hoja].nombre).toBe("PM_12K");
    expect(partesDe(der)).toHaveLength(5);
    // Otro archivo con el mismo contenido pero distinto nombre no se toca.
    expect(a.hojas[elegirHoja({ ...a, nombre: "otro.xlsx" }, izq).hoja].nombre).toBe("PM_16K");
  });
});

describe("tieneAleman", () => {
  it("detecta términos de las matrices y no marca inglés normal", () => {
    expect(["VALVE STROEMUNGSVENTIL", "SET OF WEAR PARTS FUER 861590053", "SEAL RING DN40-KLEMMRING", "ROLLER MIT BOLZEN, D=52"].every(tieneAleman)).toBe(true);
    expect(["SUCTION CUP", "FILTER ELEMENT 40 MICRON", "GROOVED BALL BEARING 6004", "PRELIMINARY FILTER F7"].some(tieneAleman)).toBe(false);
  });
});
