/**
 * Comparación de dos BOMs pieza por pieza.
 *
 * Reglas (del documento de comprensión y del prototipo SIG BOM Manager):
 *  - No se eliminan duplicados por número de parte: la misma pieza puede estar
 *    en varios SC o posiciones. La clave es SC + posición + número de parte, y si
 *    una clave se repite dentro de un archivo se empareja por orden de aparición.
 *  - "Mismo SC y posición con otro número de parte" se reporta como cambio de
 *    número de parte (posible sustitución), no como una pieza nueva y otra retirada.
 *  - "Mismo SC y número de parte en otra posición" se reporta como cambio de posición.
 *  - Lo que queda sin pareja es pieza nueva (solo en la BOM comparada) o retirada
 *    (solo en la base).
 *  - Las diferencias se describen; no se califican.
 */
import type { ParteBom } from "./leerBom";

export const TIPOS_DIFERENCIA = ["cantidad", "intervalo", "descripcion", "unidad", "pn", "nuevoPn", "posicion", "nueva", "retirada"] as const;
export type TipoDiferencia = (typeof TIPOS_DIFERENCIA)[number];

export interface Cambio {
  tipo: TipoDiferencia;
  base: string;
  comparar: string;
}

export interface FilaComparacion {
  sc: string;
  base: ParteBom | null;
  comparar: ParteBom | null;
  /** Vacío = coincide en todo. */
  cambios: Cambio[];
}

export interface GrupoSc {
  sc: string;
  nombre: string;
  filas: FilaComparacion[];
}

export interface Repetida {
  archivo: "base" | "comparar";
  sc: string;
  posicion: string | null;
  pn: string;
  veces: number;
}

export interface ResultadoComparacion {
  filas: FilaComparacion[];
  /** Solo SCs con diferencias, en orden natural (SC01, SC02 … SC10). */
  grupos: GrupoSc[];
  conteo: Record<TipoDiferencia | "coinciden", number>;
  totalBase: number;
  totalComparar: number;
  conDiferencias: number;
  repetidas: Repetida[];
}

export const normalizarDescripcion = (d: string) => d.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const guion = "—";
const val = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? guion : String(v));

/** "Qty 8 · PC · 4K": resumen de una pieza para las columnas base/comparar de altas y bajas. */
export function resumenParte(p: ParteBom): string {
  return [p.cantidad !== null ? `Qty ${p.cantidad}` : null, p.unidad || null, p.intervalo].filter(Boolean).join(" · ") || guion;
}

/** Diferencias de campo entre dos ocurrencias ya emparejadas. */
export function cambiosEntre(a: ParteBom, b: ParteBom): Cambio[] {
  const c: Cambio[] = [];
  if (a.pn !== b.pn) c.push({ tipo: "pn", base: val(a.pn), comparar: val(b.pn) });
  if ((a.posicion ?? "") !== (b.posicion ?? "")) c.push({ tipo: "posicion", base: val(a.posicion), comparar: val(b.posicion) });
  if (a.cantidad !== b.cantidad) c.push({ tipo: "cantidad", base: val(a.cantidad), comparar: val(b.cantidad) });
  if ((a.intervalo ?? "") !== (b.intervalo ?? "")) c.push({ tipo: "intervalo", base: val(a.intervalo), comparar: val(b.intervalo) });
  if (normalizarDescripcion(a.descripcion) !== normalizarDescripcion(b.descripcion)) c.push({ tipo: "descripcion", base: val(a.descripcion), comparar: val(b.descripcion) });
  // La unidad solo cuenta si ambas la traen (muchas hojas no tienen columna de unidad).
  if (a.unidad && b.unidad && a.unidad !== b.unidad) c.push({ tipo: "unidad", base: a.unidad, comparar: b.unidad });
  if ((a.nuevoPn ?? "") !== (b.nuevoPn ?? "")) c.push({ tipo: "nuevoPn", base: val(a.nuevoPn), comparar: val(b.nuevoPn) });
  return c;
}

/** Orden natural de SC: SC2 < SC10; sin SC al final. */
export function compararSc(x: string, y: string): number {
  if (!x) return y ? 1 : 0;
  if (!y) return -1;
  return x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
}

const compararPos = (x: string | null, y: string | null) => {
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x.localeCompare(y, undefined, { numeric: true });
};

function agrupar(partes: Array<{ p: ParteBom; i: number }>, clave: (p: ParteBom) => string | null) {
  const m = new Map<string, Array<{ p: ParteBom; i: number }>>();
  for (const x of partes) {
    const k = clave(x.p);
    if (k === null) continue;
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}

/**
 * Empareja las partes libres de A y B que comparten clave (en orden de aparición)
 * y las saca de los conjuntos libres.
 */
function emparejar(
  libresA: Set<number>, libresB: Set<number>, A: ParteBom[], B: ParteBom[],
  clave: (p: ParteBom) => string | null, pares: Array<[number, number]>,
) {
  const ga = agrupar([...libresA].map((i) => ({ p: A[i], i })), clave);
  const gb = agrupar([...libresB].map((i) => ({ p: B[i], i })), clave);
  for (const [k, la] of ga) {
    const lb = gb.get(k);
    if (!lb) continue;
    const n = Math.min(la.length, lb.length);
    for (let j = 0; j < n; j++) {
      pares.push([la[j].i, lb[j].i]);
      libresA.delete(la[j].i);
      libresB.delete(lb[j].i);
    }
  }
}

function repetidasEn(partes: ParteBom[], archivo: Repetida["archivo"]): Repetida[] {
  const m = new Map<string, { p: ParteBom; veces: number }>();
  for (const p of partes) {
    const k = `${p.sc}|${p.posicion ?? ""}|${p.pn}`;
    const e = m.get(k);
    if (e) e.veces++;
    else m.set(k, { p, veces: 1 });
  }
  return [...m.values()].filter((e) => e.veces > 1).map(({ p, veces }) => ({ archivo, sc: p.sc, posicion: p.posicion, pn: p.pn, veces }));
}

export interface OpcionesComparacion {
  /** Campos que no se comparan (p. ej. el intervalo al comparar la hoja 8K contra la 16K). */
  ignorar?: TipoDiferencia[];
}

export function compararBoms(A: ParteBom[], B: ParteBom[], opciones: OpcionesComparacion = {}): ResultadoComparacion {
  const ignorar = new Set(opciones.ignorar ?? []);
  const libresA = new Set(A.map((_, i) => i));
  const libresB = new Set(B.map((_, i) => i));
  const pares: Array<[number, number]> = [];

  // 1) Misma SC + posición + número de parte (sin número de parte: por descripción).
  const idPieza = (p: ParteBom) => p.pn || "desc:" + normalizarDescripcion(p.descripcion);
  emparejar(libresA, libresB, A, B, (p) => `${p.sc}|${p.posicion ?? ""}|${idPieza(p)}`, pares);
  // 2) Misma SC + posición, otro número de parte → cambio de número de parte.
  emparejar(libresA, libresB, A, B, (p) => (p.posicion ? `${p.sc}|${p.posicion}` : null), pares);
  // 3) Misma SC + número de parte, otra posición (o una de las dos sin posición) → cambio de posición.
  emparejar(libresA, libresB, A, B, (p) => (p.pn ? `${p.sc}|${p.pn}` : null), pares);

  const filas: FilaComparacion[] = [
    ...pares.map(([ia, ib]) => ({ sc: B[ib].sc || A[ia].sc, base: A[ia], comparar: B[ib], cambios: cambiosEntre(A[ia], B[ib]).filter((c) => !ignorar.has(c.tipo)) })),
    ...[...libresA].map((i) => ({ sc: A[i].sc, base: A[i], comparar: null, cambios: [{ tipo: "retirada" as const, base: resumenParte(A[i]), comparar: guion }] })),
    ...[...libresB].map((i) => ({ sc: B[i].sc, base: null, comparar: B[i], cambios: [{ tipo: "nueva" as const, base: guion, comparar: resumenParte(B[i]) }] })),
  ];
  const posDe = (f: FilaComparacion) => (f.comparar ?? f.base)!.posicion;
  const pnDe = (f: FilaComparacion) => (f.comparar ?? f.base)!.pn;
  filas.sort((x, y) => compararSc(x.sc, y.sc) || compararPos(posDe(x), posDe(y)) || pnDe(x).localeCompare(pnDe(y)));

  const conteo = Object.fromEntries([...TIPOS_DIFERENCIA, "coinciden"].map((t) => [t, 0])) as ResultadoComparacion["conteo"];
  for (const f of filas) {
    if (!f.cambios.length) conteo.coinciden++;
    for (const t of new Set(f.cambios.map((c) => c.tipo))) conteo[t]++;
  }

  const nombres = new Map<string, string>();
  for (const p of [...B, ...A]) if (p.seccion && !nombres.has(p.sc)) nombres.set(p.sc, p.seccion);
  const grupos: GrupoSc[] = [];
  for (const f of filas) {
    if (!f.cambios.length) continue;
    let g = grupos.find((x) => x.sc === f.sc);
    if (!g) { g = { sc: f.sc, nombre: nombres.get(f.sc) ?? "", filas: [] }; grupos.push(g); }
    g.filas.push(f);
  }

  return {
    filas,
    grupos,
    conteo,
    totalBase: A.length,
    totalComparar: B.length,
    conDiferencias: filas.length - conteo.coinciden,
    repetidas: [...repetidasEn(A, "base"), ...repetidasEn(B, "comparar")],
  };
}

/** Grupos que contienen al menos un cambio del tipo elegido (null = todos), con solo esas filas. */
export function filtrarGrupos(grupos: GrupoSc[], tipo: TipoDiferencia | null): GrupoSc[] {
  if (!tipo) return grupos;
  return grupos
    .map((g) => ({ ...g, filas: g.filas.filter((f) => f.cambios.some((c) => c.tipo === tipo)) }))
    .filter((g) => g.filas.length);
}
