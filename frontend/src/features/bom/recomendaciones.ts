/**
 * Recomendaciones a partir de una comparación de BOMs.
 *
 * Se basan en los criterios del documento de comprensión del BOM Manager:
 * nada se automatiza sin Ingeniería, así que cada recomendación dice qué
 * revisar y con quién, con ejemplos concretos del archivo. No se califica la BOM.
 */
import type { ResultadoComparacion } from "./comparar";
import { normalizarDescripcion } from "./comparar";
import type { ParteBom } from "./leerBom";

export const IDS_RECOMENDACION = [
  "pnCambiado", "sustitucion", "cambioSc", "retiradas", "unidad", "cantidad", "descripcion", "nuevas", "duplicados", "sinPosicion", "aleman", "sinCambios",
] as const;
export type IdRecomendacion = (typeof IDS_RECOMENDACION)[number];
export type Prioridad = "alta" | "media" | "info";

export interface Recomendacion {
  id: IdRecomendacion;
  prioridad: Prioridad;
  conteo: number;
  /** Ejemplos legibles: "SC10 · 820110022 → 820110023 · BEARING BUSH". */
  ejemplos: string[];
}

const MAX_EJEMPLOS = 5;
const PRIORIDAD: Record<IdRecomendacion, Prioridad> = {
  pnCambiado: "alta", sustitucion: "alta", cambioSc: "alta", retiradas: "alta", unidad: "alta",
  cantidad: "media", descripcion: "media", nuevas: "media", duplicados: "media",
  sinPosicion: "info", aleman: "info", sinCambios: "info",
};

/** Términos en alemán que aparecen en las matrices de SIG (FUER, KLEMMRING, VENTIL…). */
const ALEMAN = /\b(FUER|FÜR|MIT|KOMPLETT|ENDLOS|AKTIVKOHLE\w*|FEINSTFILTER|SINTERBRONZE|SILIKON|DROSSEL|BOLZEN|\w*VENTIL\w*|\w*KLEMMRING\w*|KOLBEN\w*|VAKUUM\w*|DAMPF\w*|ZULUFT\w*|STROEMUNG\w*)\b/i;
export const tieneAleman = (descripcion: string) => ALEMAN.test(descripcion);

const sc = (p: ParteBom) => p.sc || "—";
const linea = (p: ParteBom) => `${sc(p)} · ${p.pn || "—"} · ${p.descripcion}`;

/** ¿Dos descripciones nombran la misma pieza? Iguales, o una contiene a la otra ("SEAL" ⊂ "SEAL KIT"). */
function mismaPieza(a: string, b: string): boolean {
  const x = normalizarDescripcion(a), y = normalizarDescripcion(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [corta, larga] = x.length <= y.length ? [x, y] : [y, x];
  return corta.length >= 6 && (larga.startsWith(corta + " ") || larga.endsWith(" " + corta));
}

export function generarRecomendaciones(r: ResultadoComparacion, base: ParteBom[], comparar: ParteBom[]): Recomendacion[] {
  const out: Recomendacion[] = [];
  const agregar = (id: IdRecomendacion, ejemplos: string[], conteo = ejemplos.length) => {
    if (conteo > 0) out.push({ id, prioridad: PRIORIDAD[id], conteo, ejemplos: ejemplos.slice(0, MAX_EJEMPLOS) });
  };

  const retiradas = r.filas.filter((f) => !f.comparar).map((f) => f.base!);
  const nuevas = r.filas.filter((f) => !f.base).map((f) => f.comparar!);
  const usadasR = new Set<ParteBom>(), usadasN = new Set<ParteBom>();

  // Mismo SC y posición con otro número de parte (solo cuando hay posiciones).
  const conPn = r.filas.filter((f) => f.cambios.some((c) => c.tipo === "pn"));
  agregar("pnCambiado", conPn.map((f) => `${sc(f.base!)} · ${f.base!.pn} → ${f.comparar!.pn} · ${f.comparar!.descripcion}`));

  // Sin posición, una sustitución aparece como baja + alta en el mismo SC con la misma descripción.
  const sust: string[] = [];
  for (const a of retiradas) {
    const b = nuevas.find((n) => !usadasN.has(n) && n.sc === a.sc && n.pn !== a.pn && mismaPieza(a.descripcion, n.descripcion));
    if (!b) continue;
    usadasR.add(a); usadasN.add(b);
    sust.push(`${sc(a)} · ${a.pn} → ${b.pn} · ${b.descripcion}`);
  }
  agregar("sustitucion", sust);

  // Mismo número de parte que sale de un SC y entra en otro.
  const mov: string[] = [];
  for (const a of retiradas) {
    if (usadasR.has(a) || !a.pn) continue;
    const b = nuevas.find((n) => !usadasN.has(n) && n.pn === a.pn && n.sc !== a.sc);
    if (!b) continue;
    usadasR.add(a); usadasN.add(b);
    mov.push(`${a.pn} · ${a.descripcion} · ${sc(a)} → ${sc(b)}`);
  }
  agregar("cambioSc", mov);

  agregar("retiradas", retiradas.filter((p) => !usadasR.has(p)).map(linea));

  const cambio = (tipo: "unidad" | "cantidad" | "descripcion") =>
    r.filas.flatMap((f) => f.cambios.filter((c) => c.tipo === tipo).map((c) => `${sc(f.comparar!)} · ${f.comparar!.pn} · ${tipo === "descripcion" ? `"${c.base}" → "${c.comparar}"` : `${f.comparar!.descripcion}: ${c.base} → ${c.comparar}`}`));
  agregar("unidad", cambio("unidad"));
  agregar("cantidad", cambio("cantidad"));
  agregar("descripcion", cambio("descripcion"));

  // Las nuevas que son copia de una clave que ya estaba se reportan como duplicado, no como pieza nueva.
  const repetidasComparar = r.repetidas.filter((x) => x.archivo === "comparar");
  const esRepetida = (p: ParteBom) => repetidasComparar.some((x) => x.sc === p.sc && x.pn === p.pn && x.posicion === p.posicion);
  const nuevasReales = nuevas.filter((p) => !usadasN.has(p) && !(esRepetida(p) && base.some((b) => b.sc === p.sc && b.pn === p.pn && b.posicion === p.posicion)));
  agregar("nuevas", nuevasReales.map(linea));

  // Claves repetidas en la BOM comparada; se marcan las que no lo estaban en la base.
  const repBase = new Map(r.repetidas.filter((x) => x.archivo === "base").map((x) => [`${x.sc}|${x.posicion}|${x.pn}`, x.veces]));
  const dup = [...repetidasComparar]
    .sort((x, y) => Number(repBase.has(`${x.sc}|${x.posicion}|${x.pn}`)) - Number(repBase.has(`${y.sc}|${y.posicion}|${y.pn}`)))
    .map((x) => {
      const antes = repBase.get(`${x.sc}|${x.posicion}|${x.pn}`) ?? 1;
      const desc = comparar.find((p) => p.sc === x.sc && p.pn === x.pn)?.descripcion ?? "";
      return `${x.sc || "—"} · ${x.pn} · ${desc} · ${antes}× → ${x.veces}×`;
    });
  agregar("duplicados", dup);

  if ([...base, ...comparar].length && [...base, ...comparar].every((p) => p.posicion === null)) agregar("sinPosicion", [], 1);

  const aleman = comparar.filter((p) => tieneAleman(p.descripcion));
  const unicos = [...new Map(aleman.map((p) => [p.pn, p])).values()];
  agregar("aleman", unicos.map(linea));

  if (r.conDiferencias === 0) agregar("sinCambios", [], 1);

  const orden: Prioridad[] = ["alta", "media", "info"];
  return out.sort((a, b) => orden.indexOf(a.prioridad) - orden.indexOf(b.prioridad));
}
