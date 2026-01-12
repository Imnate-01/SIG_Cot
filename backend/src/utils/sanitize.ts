// utils/sanitize.ts

// Convierte "" / undefined a null
export const nullIfEmpty = <T>(v: T) =>
  (v === "" || v === undefined ? (null as any) : v);

// Convierte a número o null (si viene "" o no es número)
export const numberOrNull = (v: any): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Convierte a bigint (entero) o null
export const bigintOrNull = (v: any): number | null => {
  if (v === "" || v === null || v === undefined) return null;

  // Si viene como string con espacios
  const s = typeof v === "string" ? v.trim() : v;
  if (s === "") return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;

  // BIGINT debe ser entero
  return Math.trunc(n);
};

// Convierte fecha a ISO o null (útil para TIMESTAMPTZ)
export const dateOrNull = (v: any): string | null => {
  if (!v || v === "") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// Convierte a boolean real
export const boolOrFalse = (v: any): boolean =>
  v === true || v === "true" || v === 1 || v === "1";

// Sanitiza el objeto datos_generales para insert/update en reportes_tecnicos
export const sanitizeDatosGenerales = (dg: any) => ({
  ...dg,

  // IDs (por si llegan aquí desde frontend)
  cliente_id: bigintOrNull(dg?.cliente_id),
  cotizacion_id: bigintOrNull(dg?.cotizacion_id),

  // NUMERIC
  horas_maquina: numberOrNull(dg?.horas_maquina),

  // TIMESTAMPTZ
  fecha_inicio: dateOrNull(dg?.fecha_inicio),
  fecha_fin: dateOrNull(dg?.fecha_fin),

  // BOOLEAN
  reunion_apertura: boolOrFalse(dg?.reunion_apertura),
  reunion_cierre: boolOrFalse(dg?.reunion_cierre),
  envase_desechado: boolOrFalse(dg?.envase_desechado),

  // TEXT ("" -> null)
  planta: nullIfEmpty(dg?.planta),
  responsable_cliente: nullIfEmpty(dg?.responsable_cliente),
  email_cliente: nullIfEmpty(dg?.email_cliente),
  telefono_cliente: nullIfEmpty(dg?.telefono_cliente),
  maquina_serie: nullIfEmpty(dg?.maquina_serie),
  proposito_visita: nullIfEmpty(dg?.proposito_visita),
  tipo_llenado: nullIfEmpty(dg?.tipo_llenado),
  tipo_envase: nullIfEmpty(dg?.tipo_envase),
  comentarios_apertura: nullIfEmpty(dg?.comentarios_apertura),
  comentarios_finales: nullIfEmpty(dg?.comentarios_finales),
  eficiencias: nullIfEmpty(dg?.eficiencias),
  perdidas: nullIfEmpty(dg?.perdidas),
  firma_cliente_url: nullIfEmpty(dg?.firma_cliente_url),
  firma_fse_url: nullIfEmpty(dg?.firma_fse_url),
});
