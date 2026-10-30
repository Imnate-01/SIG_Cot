/**
 * Lectura de una BOM de mantenimiento a partir de la matriz de celdas de una hoja.
 *
 * Las matrices de SIG no tienen un formato único (ver "SIG BOM Manager:
 * Documento de comprensión", sección 2.3): cada hoja (2K, 4K, 8K/16K, ACF/HSP/HTW)
 * trae encabezados distintos y en otra fila. Por eso aquí:
 *   1. se busca la fila de encabezados entre las primeras filas;
 *   2. cada columna se reconoce por sinónimos (y el usuario puede corregir el mapeo);
 *   3. si no hay columna de intervalo, se toma del nombre de la hoja (8K, 16K…).
 * Nada de esto depende del navegador: así se prueba con vitest.
 */

export const CAMPOS_BOM = ["sc", "seccion", "posicion", "pn", "nuevoPn", "descripcion", "cantidad", "unidad", "intervalo", "comentario"] as const;
export type CampoBom = (typeof CAMPOS_BOM)[number];
/** Columna (índice desde 0) asignada a cada campo. */
export type Mapeo = Partial<Record<CampoBom, number>>;

export type Celda = string | number | boolean | null | undefined;

export interface ParteBom {
  sc: string;
  seccion: string;
  /** Normalizada a 3 dígitos cuando es numérica (10 → "010"); null si la fila no trae posición. */
  posicion: string | null;
  pn: string;
  nuevoPn: string | null;
  descripcion: string;
  cantidad: number | null;
  unidad: string;
  /** "2K", "4K", "8K", "16K"… */
  intervalo: string | null;
  /** De dónde salió el intervalo: de la columna de la fila o del nombre de la hoja. */
  intervaloOrigen: "fila" | "hoja" | null;
  comentario: string;
  /** Fila en el archivo original (1 = primera fila), para trazabilidad. */
  fila: number;
}

/** Campos sin los que no se puede comparar. */
export const CAMPOS_REQUERIDOS: CampoBom[] = ["pn", "descripcion", "cantidad"];

/** minúsculas, sin acentos ni signos: "Pos. No." → "pos no", "Component # SIG" → "component sig". */
export function normalizarEncabezado(v: Celda): string {
  return String(v ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[#.:/()\[\]_\-°º*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sinónimos por campo, sobre el encabezado ya normalizado. El orden importa: nuevoPn va antes que pn. */
const SINONIMOS: Array<[CampoBom, RegExp]> = [
  ["sc", /^(sc|sc no|sc code|structural component|structural comp|componente estructural)$/],
  ["seccion", /^(section|seccion|sc name|sc description|nombre sc)$/],
  ["posicion", /^(pos|pos no|pos nr|position|posicion|item no)$/],
  ["nuevoPn", /^(new part|new part no|new part number|new pn|nuevo pn|nuevo numero de parte|nuevo no de parte)$/],
  ["pn", /^(component number|component no|component nr|component sig|component|part number|part no|part nr|pn|p n|numero de parte|no de parte|n de parte|num de parte|material|sig part number|codigo)$/],
  ["descripcion", /^(object description|description|descripcion|material description|denominacion|nombre)$/],
  ["cantidad", /^(qty|qty pc|quantity|cantidad|cant)$/],
  ["unidad", /^(unit|un|uom|unidad|um|u m)$/],
  ["intervalo", /^(interval|intervalo|base interval|intervalo base|maintenance interval)$/],
  ["comentario", /^(remark|remarks|comment|comments|comentario|comentarios|observaciones|observacion|notes|notas)$/],
];

export function campoDeEncabezado(encabezado: Celda): CampoBom | null {
  const n = normalizarEncabezado(encabezado);
  if (!n) return null;
  for (const [campo, re] of SINONIMOS) if (re.test(n)) return campo;
  return null;
}

/** Mapeo automático de una fila de encabezados. Si un campo aparece dos veces se queda la primera columna. */
export function mapearEncabezados(encabezados: Celda[]): Mapeo {
  const mapeo: Mapeo = {};
  encabezados.forEach((h, i) => {
    const campo = campoDeEncabezado(h);
    if (campo && mapeo[campo] === undefined) mapeo[campo] = i;
  });
  return mapeo;
}

/**
 * Fila de encabezados: la que más campos reconoce entre las primeras `limite` filas,
 * siempre que tenga número de parte y (cantidad o descripción). -1 si no hay ninguna.
 */
export function detectarEncabezado(filas: Celda[][], limite = 40): number {
  let mejor = -1;
  let puntos = 0;
  filas.slice(0, limite).forEach((fila, i) => {
    const m = mapearEncabezados(fila);
    if (m.pn === undefined || (m.cantidad === undefined && m.descripcion === undefined)) return;
    const p = Object.keys(m).length;
    if (p > puntos) { puntos = p; mejor = i; }
  });
  return mejor;
}

export function faltantes(mapeo: Mapeo): CampoBom[] {
  return CAMPOS_REQUERIDOS.filter((c) => mapeo[c] === undefined);
}

/** Campos asignados a más de una columna. */
export function duplicados(mapeo: Mapeo): CampoBom[] {
  const usados = new Map<number, CampoBom[]>();
  for (const c of CAMPOS_BOM) {
    const col = mapeo[c];
    if (col === undefined) continue;
    usados.set(col, [...(usados.get(col) ?? []), c]);
  }
  return [...usados.values()].filter((cs) => cs.length > 1).flat();
}

export function texto(v: Celda): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v).replace(/\s+/g, " ").trim();
}

/** Número de parte: 860504028 (número) y "860504028.0" (texto) son el mismo. */
export function normalizarPn(v: Celda): string {
  const t = texto(v).replace(/\s+/g, "");
  if (/^\d+\.0+$/.test(t)) return t.replace(/\.0+$/, "");
  return t.toUpperCase();
}

/** "SC 04" / "sc4" / 4 → "SC04". Otro texto se deja en mayúsculas. */
export function normalizarSc(v: Celda): string {
  const t = texto(v).toUpperCase().replace(/\s+/g, "");
  if (!t) return "";
  const m = /^(?:SC)?0*(\d{1,3})$/.exec(t);
  return m ? "SC" + m[1].padStart(2, "0") : t;
}

/** 10 → "010", "0010" → "010"; texto no numérico se conserva; vacío → null. */
export function normalizarPosicion(v: Celda): string | null {
  const t = texto(v);
  if (!t || t === "-" || t === "—") return null;
  if (/^\d+(\.0+)?$/.test(t)) return String(parseInt(t, 10)).padStart(3, "0");
  return t.toUpperCase();
}

export function normalizarCantidad(v: Celda): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = texto(v).replace(/\s/g, "");
  if (!t) return null;
  const n = Number(/^\d+,\d+$/.test(t) ? t.replace(",", ".") : t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** 4000 / "4,000" / "4k" / "4 K" → "4K". Otro texto, en mayúsculas. */
export function normalizarIntervalo(v: Celda): string | null {
  const t = texto(v).toUpperCase().replace(/\s/g, "");
  if (!t) return null;
  const k = /^(\d+(?:\.\d+)?)K$/.exec(t);
  if (k) return `${Number(k[1])}K`;
  const n = Number(t.replace(/[,.](?=\d{3}$)/, "").replace(/H$/, ""));
  if (Number.isFinite(n) && n >= 1000 && n % 1000 === 0) return `${n / 1000}K`;
  return t;
}

/** Intervalo implícito en el nombre de la hoja: "16K" → "16K", "BOM 8k" → "8K", "Total CFA" → null. */
export function intervaloDeHoja(nombre: string): string | null {
  const m = /(?:^|[^\d])(\d{1,2})\s*k(?![a-z])/i.exec(nombre);
  return m ? `${Number(m[1])}K` : null;
}

const celda = (fila: Celda[], col: number | undefined): Celda => (col === undefined ? null : fila[col]);

/**
 * Convierte las filas debajo del encabezado en partes. Se saltan filas vacías,
 * encabezados repetidos y renglones de título (sin número de parte ni cantidad).
 */
export function extraerPartes(filas: Celda[][], filaEncabezado: number, mapeo: Mapeo, nombreHoja = ""): ParteBom[] {
  const intervaloHoja = intervaloDeHoja(nombreHoja);
  const partes: ParteBom[] = [];
  let scActual = "";
  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const f = filas[i] || [];
    const pn = normalizarPn(celda(f, mapeo.pn));
    const descripcion = texto(celda(f, mapeo.descripcion));
    const cantidad = normalizarCantidad(celda(f, mapeo.cantidad));
    const scCelda = normalizarSc(celda(f, mapeo.sc));
    if (!pn && !descripcion) continue;
    if (campoDeEncabezado(celda(f, mapeo.pn)) === "pn") continue; // encabezado repetido
    if (!pn && cantidad === null) continue; // título o subtotal
    // En algunas hojas el SC solo viene en la primera fila del bloque.
    if (scCelda) scActual = scCelda;
    const intervaloFila = normalizarIntervalo(celda(f, mapeo.intervalo));
    const nuevo = normalizarPn(celda(f, mapeo.nuevoPn));
    partes.push({
      sc: scCelda || scActual,
      seccion: texto(celda(f, mapeo.seccion)),
      posicion: normalizarPosicion(celda(f, mapeo.posicion)),
      pn,
      nuevoPn: nuevo && nuevo !== pn && nuevo !== "-" && nuevo !== "—" ? nuevo : null,
      descripcion,
      cantidad,
      unidad: texto(celda(f, mapeo.unidad)).toUpperCase(),
      intervalo: intervaloFila ?? intervaloHoja,
      intervaloOrigen: intervaloFila ? "fila" : intervaloHoja ? "hoja" : null,
      comentario: texto(celda(f, mapeo.comentario)),
      fila: i + 1,
    });
  }
  return partes;
}

/** Primeros valores no vacíos de una columna, para mostrar en el mapeo. */
export function muestras(filas: Celda[][], filaEncabezado: number, col: number, n = 3): string[] {
  const out: string[] = [];
  for (let i = filaEncabezado + 1; i < filas.length && out.length < n; i++) {
    const t = texto(filas[i]?.[col]);
    if (t) out.push(t);
  }
  return out;
}
