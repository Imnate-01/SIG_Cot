import { dimensionesAjustadas } from "./pm";

const LADO_MAXIMO = 2400;       // px: sobra para leer ajustes y etiquetas en una foto
const UMBRAL_BYTES = 1.5 * 1024 * 1024;
const CALIDAD = 0.85;

/**
 * Reduce las fotos grandes en el navegador antes de subirlas (una foto de celular
 * pesa 4–10 MB). Solo toca JPG/PNG/WEBP mayores a 1.5 MB; HEIC, PDF y demás se
 * suben tal cual. Si algo falla o el resultado no es más chico, devuelve el original.
 */
export async function comprimirImagen(archivo: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type) || archivo.size <= UMBRAL_BYTES) return archivo;
  try {
    const bmp = await createImageBitmap(archivo);
    const { ancho, alto } = dimensionesAjustadas(bmp.width, bmp.height, LADO_MAXIMO);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.fillStyle = "#fff"; // los PNG con transparencia no deben quedar negros al pasar a JPEG
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bmp, 0, 0, ancho, alto);
    bmp.close();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", CALIDAD));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}
