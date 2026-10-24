/**
 * Reglas de los archivos de evidencia del módulo PM.
 *
 * ⚠️ Este archivo existe en DOS lugares con contenido idéntico (igual que pricing.ts):
 *    - frontend/src/features/pm/evidencias.ts
 *    - backend/src/domain/pmEvidencias.ts
 * El frontend lo usa para avisar antes de subir; el backend para decidir de verdad.
 * La prueba `evidencias.sync.test.ts` falla si dejan de ser iguales.
 */

export const BUCKET_EVIDENCIAS = "pm-evidencias";
export const MAX_BYTES_EVIDENCIA = 20 * 1024 * 1024; // 20 MB, como en Food Safety Audit

/** extensión (minúsculas, sin punto) → tipo MIME permitido */
const EXTENSIONES: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv", txt: "text/plain",
};

/** Tipos MIME que acepta el bucket. */
export const MIMES_PERMITIDOS: string[] = [...new Set(Object.values(EXTENSIONES))];

/** Texto para el atributo `accept` del selector de archivos. */
export const ACCEPT_EVIDENCIAS = [...Object.keys(EXTENSIONES).map((e) => `.${e}`), ...MIMES_PERMITIDOS].join(",");

export function extensionDe(nombre: string): string {
  const i = nombre.lastIndexOf(".");
  return i > 0 ? nombre.slice(i + 1).toLowerCase() : "";
}

export type ResultadoValidacion =
  | { ok: true; mime: string }
  | { ok: false; motivo: "vacio" | "muy_grande" | "tipo_no_permitido" };

/**
 * Valida un archivo. El navegador (sobre todo en Windows con HEIC) a veces manda
 * el tipo vacío o "application/octet-stream": en ese caso se usa la extensión.
 * Si el tipo declarado y la extensión no coinciden, gana la extensión (la lista
 * de extensiones es la que el sistema conoce).
 */
export function validarArchivo(a: { nombre: string; mime?: string | null; tamano: number }): ResultadoValidacion {
  if (!Number.isFinite(a.tamano) || a.tamano <= 0) return { ok: false, motivo: "vacio" };
  if (a.tamano > MAX_BYTES_EVIDENCIA) return { ok: false, motivo: "muy_grande" };
  const porExtension = EXTENSIONES[extensionDe(a.nombre)];
  if (!porExtension) return { ok: false, motivo: "tipo_no_permitido" };
  const declarado = (a.mime || "").toLowerCase();
  if (declarado && declarado !== "application/octet-stream" && !MIMES_PERMITIDOS.includes(declarado)) {
    return { ok: false, motivo: "tipo_no_permitido" };
  }
  return { ok: true, mime: porExtension };
}

/** Nombre apto para una ruta de Storage: sin carpetas, acentos ni símbolos raros. */
export function nombreSeguro(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() || "archivo";
  const ext = extensionDe(base);
  const sinExt = ext ? base.slice(0, base.length - ext.length - 1) : base;
  const limpio = sinExt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  return `${limpio || "archivo"}${ext ? "." + ext.replace(/[^a-z0-9]/g, "") : ""}`;
}

/** Ruta del archivo dentro del bucket: pm/<PM>/<tarea>/<id>-<nombre>. */
export function rutaEvidencia(expedienteId: string, tareaId: string, idUnico: string, nombre: string): string {
  return `pm/${expedienteId}/${tareaId}/${idUnico}-${nombreSeguro(nombre)}`;
}

/** Carpeta que debe tener toda ruta registrada para esa tarea. */
export function carpetaEvidencia(expedienteId: string, tareaId: string): string {
  return `pm/${expedienteId}/${tareaId}/`;
}

export const esImagen = (mime: string | null | undefined) => !!mime && mime.startsWith("image/");

export function formatearTamano(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
