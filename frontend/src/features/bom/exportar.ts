/**
 * La "lista" que sale de comparar dos BOMs: una fila por diferencia (para revisar)
 * y la lista completa de piezas con su estado (para trabajar sobre ella en Excel).
 */
import type { ResultadoComparacion, TipoDiferencia } from "./comparar";
import type { Recomendacion } from "./recomendaciones";

export interface Etiquetas {
  tipos: Record<TipoDiferencia, string>;
  coincide: string;
  columnas: {
    sc: string; nombreSc: string; posicion: string; pnBase: string; pnComparar: string; pn: string; descripcion: string;
    diferencia: string; valorBase: string; valorComparar: string; filaBase: string; filaComparar: string;
    base: string; comparar: string; estado: string;
    cantidadBase: string; cantidadComparar: string; unidad: string; intervalo: string;
    prioridad: string; recomendacion: string; detalle: string; ejemplos: string;
  };
  hojas: { diferencias: string; lista: string; resumen: string; recomendaciones: string };
  resumen: { base: string; comparar: string; generado: string; piezasBase: string; piezasComparar: string; coinciden: string; conDiferencias: string };
}

export interface Origen {
  archivo: string;
  hoja: string;
}

const g = "—";
const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? g : String(x));

export function filasDiferencias(r: ResultadoComparacion, e: Etiquetas): string[][] {
  const c = e.columnas;
  const out: string[][] = [[c.sc, c.nombreSc, c.posicion, c.pnBase, c.pnComparar, c.descripcion, c.diferencia, c.valorBase, c.valorComparar, c.filaBase, c.filaComparar]];
  for (const grupo of r.grupos) {
    for (const f of grupo.filas) {
      const p = f.comparar ?? f.base!;
      for (const cambio of f.cambios) {
        out.push([
          v(grupo.sc), grupo.nombre, v(p.posicion), v(f.base?.pn), v(f.comparar?.pn), p.descripcion || f.base?.descripcion || "",
          e.tipos[cambio.tipo], cambio.base, cambio.comparar, v(f.base?.fila), v(f.comparar?.fila),
        ]);
      }
    }
  }
  return out;
}

/** La BOM completa: todas las piezas de ambas, con sus dos cantidades y su estado. */
export function filasLista(r: ResultadoComparacion, e: Etiquetas): Array<Array<string | number>> {
  const c = e.columnas;
  const out: Array<Array<string | number>> = [[c.sc, c.posicion, c.pn, c.descripcion, c.cantidadBase, c.cantidadComparar, c.unidad, c.intervalo, c.estado]];
  for (const f of r.filas) {
    const p = f.comparar ?? f.base!;
    const estado = f.cambios.length ? [...new Set(f.cambios.map((x) => e.tipos[x.tipo]))].join(", ") : e.coincide;
    const pn = f.base && f.comparar && f.base.pn !== f.comparar.pn ? `${f.base.pn} → ${f.comparar.pn}` : p.pn;
    out.push([v(f.sc), v(p.posicion), v(pn), p.descripcion, f.base?.cantidad ?? g, f.comparar?.cantidad ?? g, v(p.unidad), v(p.intervalo), estado]);
  }
  return out;
}

export interface TextoRecomendacion {
  prioridad: string;
  titulo: string;
  detalle: string;
}

export function filasRecomendaciones(recs: Recomendacion[], e: Etiquetas, texto: (r: Recomendacion) => TextoRecomendacion): string[][] {
  const c = e.columnas;
  return [[c.prioridad, c.recomendacion, c.detalle, c.ejemplos], ...recs.map((r) => { const t = texto(r); return [t.prioridad, t.titulo, t.detalle, r.ejemplos.join("\n")]; })];
}

export function filasResumen(r: ResultadoComparacion, e: Etiquetas, base: Origen, comparar: Origen, fecha: string): string[][] {
  const s = e.resumen;
  const out: string[][] = [
    [s.base, `${base.archivo} · ${base.hoja}`],
    [s.comparar, `${comparar.archivo} · ${comparar.hoja}`],
    [s.generado, fecha],
    [s.piezasBase, String(r.totalBase)],
    [s.piezasComparar, String(r.totalComparar)],
    [s.coinciden, String(r.conteo.coinciden)],
    [s.conDiferencias, String(r.conDiferencias)],
  ];
  for (const [tipo, etiqueta] of Object.entries(e.tipos) as Array<[TipoDiferencia, string]>) {
    if (r.conteo[tipo]) out.push([etiqueta, String(r.conteo[tipo])]);
  }
  return out;
}

/** Nombre de archivo sin acentos ni espacios: Comparacion_BOM_869851046_vs_869851069_2026-10-29.xlsx */
export function nombreArchivo(base: Origen, comparar: Origen, fecha: string, ext: "xlsx" | "csv"): string {
  const limpio = (s: string) => s.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  return `Comparacion_BOM_${limpio(base.archivo)}_vs_${limpio(comparar.archivo)}_${fecha}.${ext}`;
}

/** CSV con ; (Excel en español lo abre en columnas) y BOM UTF-8 para los acentos. */
export function aCsv(filas: string[][]): string {
  const esc = (x: string) => (/[;"\n\r]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x);
  return "﻿" + filas.map((f) => f.map(esc).join(";")).join("\r\n");
}

async function guardar(blob: Blob, nombre: string) {
  const { saveAs } = await import("file-saver");
  saveAs(blob, nombre);
}

export async function exportarCsv(r: ResultadoComparacion, e: Etiquetas, base: Origen, comparar: Origen, fecha: string) {
  await guardar(new Blob([aCsv(filasDiferencias(r, e))], { type: "text/csv;charset=utf-8" }), nombreArchivo(base, comparar, fecha, "csv"));
}

export async function exportarXlsx(
  r: ResultadoComparacion, e: Etiquetas, base: Origen, comparar: Origen, fecha: string,
  recs: Recomendacion[] = [], texto?: (r: Recomendacion) => TextoRecomendacion,
) {
  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  libro.created = new Date();

  const hoja = (nombre: string, filas: Array<Array<string | number>>, anchos: number[], conEncabezado = true) => {
    const ws = libro.addWorksheet(nombre.slice(0, 31), { views: conEncabezado ? [{ state: "frozen", ySplit: 1 }] : [] });
    filas.forEach((f) => ws.addRow(f));
    anchos.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    if (conEncabezado) {
      const h = ws.getRow(1);
      h.font = { bold: true, color: { argb: "FFFFFFFF" } };
      h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF145EFC" } };
      h.height = 22;
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: filas[0].length } };
    } else {
      ws.getColumn(1).font = { bold: true };
    }
    return ws;
  };

  const dif = hoja(e.hojas.diferencias, filasDiferencias(r, e), [8, 24, 10, 14, 14, 40, 22, 22, 22, 10, 10]);
  // Resalta el valor nuevo, como en la pantalla.
  dif.eachRow((row, n) => { if (n > 1) row.getCell(9).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5E6FF" } }; });
  hoja(e.hojas.lista, filasLista(r, e), [8, 8, 24, 42, 12, 12, 8, 10, 30]);
  if (recs.length && texto) {
    const ws = hoja(e.hojas.recomendaciones, filasRecomendaciones(recs, e, texto), [10, 42, 60, 60]);
    ws.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  }
  hoja(e.hojas.resumen, filasResumen(r, e, base, comparar, fecha), [28, 60], false);

  const buffer = await libro.xlsx.writeBuffer();
  await guardar(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nombreArchivo(base, comparar, fecha, "xlsx"));
}
