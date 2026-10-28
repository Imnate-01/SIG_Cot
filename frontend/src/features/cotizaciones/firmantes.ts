/**
 * Firmantes de las cotizaciones: puesto y firma que aparecen en el PDF.
 *
 * Antes esta regla estaba copiada en 3 PDFs como comparaciones de texto
 * ("eduardo", "santoyo", ...). Para agregar o cambiar un firmante, edita solo
 * esta lista. Se compara contra el nombre en minúsculas y gana la primera
 * coincidencia.
 *
 * Mejora futura sugerida: guardar `puesto` y `firma_url` en la tabla
 * `usuarios` y eliminar esta lista.
 */
export interface Firmante {
  /** Fragmentos de nombre (en minúsculas) que identifican al firmante. */
  coincidencias: string[];
  /** Si se omite, se usa el puesto registrado del usuario (o el predeterminado). */
  puesto?: string;
  /** Ruta de la imagen de firma dentro de /public. */
  firma: string;
}

export const FIRMANTES: Firmante[] = [
  { coincidencias: ["eduardo"], puesto: "Back Office Manager", firma: "/eduardo_firma.png" },
  { coincidencias: ["santoyo", "jonh", "john"], puesto: "Service Sales Manager", firma: "/santoyo.png" },
  // Geovanni Zayas. La tabla `usuarios` no tiene columna de puesto, por eso va fijo aquí.
  { coincidencias: ["geo"], puesto: "Coordinator Administrative Operations", firma: "/geo_firma.png" },
];

export const FIRMA_PREDETERMINADA = "/firma_julio.png";
export const PUESTO_PREDETERMINADO = "Coordinador de Servicio Técnico";

export function buscarFirmante(nombre: string | null | undefined): Firmante | undefined {
  const n = (nombre || "").toLowerCase();
  if (!n) return undefined;
  return FIRMANTES.find((f) => f.coincidencias.some((c) => n.includes(c)));
}

/** Puesto a mostrar: el del firmante configurado, o el registrado, o el predeterminado. */
export function puestoFirmante(nombre: string | null | undefined, puestoRegistrado?: string | null): string {
  return buscarFirmante(nombre)?.puesto ?? (puestoRegistrado || PUESTO_PREDETERMINADO);
}

/** Imagen de firma para el nombre dado. */
export function imagenFirma(nombre: string | null | undefined): string {
  return buscarFirmante(nombre)?.firma ?? FIRMA_PREDETERMINADA;
}
