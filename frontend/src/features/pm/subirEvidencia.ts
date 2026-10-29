/**
 * Sube un archivo de evidencia a la URL firmada que entrega el backend.
 *
 * Antes se usaba `supabase.storage.uploadToSignedUrl`, que con un File manda
 * multipart con el tipo que reporte el navegador (e ignora `contentType`): si el
 * navegador dice "" o "application/octet-stream" (pasa en Windows con HEIC,
 * Office y otros), el bucket privado lo rechaza por su lista de tipos. Además
 * dependía de NEXT_PUBLIC_SUPABASE_* en el frontend.
 *
 * Aquí se hace un PUT con el cuerpo crudo y el tipo MIME ya validado por el
 * servidor, así Storage guarda exactamente ese tipo.
 */
export interface DatosSubida {
  signedUrl?: string;
  apikey?: string;
  mime: string;
}

export class ErrorSubida extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ErrorSubida";
  }
}

/** Cabeceras del PUT (exportado para pruebas). */
export function cabecerasSubida(d: Pick<DatosSubida, "apikey" | "mime">): Record<string, string> {
  const h: Record<string, string> = { "content-type": d.mime, "x-upsert": "false", "cache-control": "max-age=3600" };
  if (d.apikey) h.apikey = d.apikey;
  return h;
}

export async function subirAUrlFirmada(d: DatosSubida, archivo: Blob, f: typeof fetch = fetch): Promise<void> {
  if (!d.signedUrl) throw new ErrorSubida("The server did not return an upload link. Update the backend and try again.");
  let res: Response;
  try {
    res = await f(d.signedUrl, { method: "PUT", headers: cabecerasSubida(d), body: archivo });
  } catch {
    throw new ErrorSubida("Could not reach file storage. Check your connection.");
  }
  if (res.ok) return;
  let detalle = "";
  try {
    const j = await res.json();
    detalle = j?.message || j?.error || "";
  } catch { /* sin cuerpo JSON */ }
  if (res.status === 413 || /exceeded the maximum|too large/i.test(detalle)) throw new ErrorSubida("The file is too large (maximum 20 MB).", res.status);
  if (/mime|invalid_mime_type/i.test(detalle)) throw new ErrorSubida("File type not allowed by storage.", res.status);
  throw new ErrorSubida(detalle ? `Storage rejected the file: ${detalle}` : `Storage rejected the file (HTTP ${res.status}).`, res.status);
}
