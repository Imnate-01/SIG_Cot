/**
 * Abre un archivo de BOM en el navegador (.xlsx o .csv) y devuelve sus hojas como
 * matrices de celdas. El archivo nunca sale del equipo: no se sube al servidor.
 */
import type { Celda } from "./leerBom";

export interface HojaBom {
  nombre: string;
  filas: Celda[][];
}

export interface ArchivoBom {
  nombre: string;
  hojas: HojaBom[];
}

export class ErrorArchivoBom extends Error {
  constructor(public codigo: "formato" | "vacio" | "lectura") {
    super(codigo);
  }
}

/** Valor "plano" de una celda de ExcelJS: fórmulas → resultado, texto enriquecido → texto, fechas → ISO. */
function valorCelda(v: unknown): Celda {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("result" in o) return valorCelda(o.result);
    if ("formula" in o || "sharedFormula" in o) return null; // fórmula sin valor calculado
    if (Array.isArray(o.richText)) return (o.richText as Array<{ text?: string }>).map((r) => r.text ?? "").join("");
    if ("text" in o) return valorCelda(o.text);
    if ("error" in o) return null;
  }
  return String(v);
}

/** Separa un CSV respetando comillas. Detecta el separador (; , o tabulador) en la primera línea. */
export function parsearCsv(contenido: string): Celda[][] {
  const texto = contenido.replace(/^﻿/, "");
  const primera = texto.split(/\r?\n/, 1)[0] ?? "";
  const sep = [";", "\t", ","].reduce((a, s) => (primera.split(s).length > primera.split(a).length ? s : a), ",");
  const filas: Celda[][] = [];
  let fila: Celda[] = [];
  let campo = "";
  let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

export async function abrirArchivoBom(archivo: File): Promise<ArchivoBom> {
  const nombre = archivo.name;
  const ext = nombre.toLowerCase().split(".").pop();

  if (ext === "csv" || ext === "txt") {
    const filas = parsearCsv(await archivo.text());
    if (!filas.length) throw new ErrorArchivoBom("vacio");
    return { nombre, hojas: [{ nombre: nombre.replace(/\.[^.]+$/, ""), filas }] };
  }
  if (ext !== "xlsx" && ext !== "xlsm") throw new ErrorArchivoBom("formato");

  const ExcelJS = (await import("exceljs")).default;
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(await archivo.arrayBuffer());
  } catch {
    throw new ErrorArchivoBom("lectura");
  }

  const hojas: HojaBom[] = [];
  libro.eachSheet((hoja) => {
    if (hoja.state !== "visible") return;
    const filas: Celda[][] = [];
    // Algunas matrices declaran >16 000 columnas usadas (formato residual):
    // se recorren solo las celdas con valor.
    hoja.eachRow({ includeEmpty: true }, (row, n) => {
      const f: Celda[] = [];
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        if (col <= 200) f[col - 1] = valorCelda(cell.value);
      });
      filas[n - 1] = f;
    });
    for (let i = 0; i < filas.length; i++) if (!filas[i]) filas[i] = [];
    if (filas.some((f) => f.length)) hojas.push({ nombre: hoja.name, filas });
  });
  if (!hojas.length) throw new ErrorArchivoBom("vacio");
  return { nombre, hojas };
}
