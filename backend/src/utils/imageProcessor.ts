import sharp from 'sharp';
import { supabaseAdmin } from '../config/supabase';

const SUPABASE_BUCKET = 'food-safety-audit';

const VERSIONS = [
  { key: 'report', width: 1200, height: 900, quality: 85 },
  { key: 'thumb',  width: 400,  height: 300, quality: 70  },
] as const;

export interface ProcessedImages {
  url_original: string;
  url_report:   string;
  url_thumbnail: string;
  storage_key:  string;
  width_px:     number;
  height_px:    number;
  size_bytes:   number;
  mime_type:    string;
}

/**
 * Procesa una imagen de evidencia:
 * 1. Guarda el original en Supabase Storage
 * 2. Genera versiones report (1200x900) y thumb (400x300)
 * 3. Devuelve las URLs públicas de las 3 versiones
 *
 * storageKeyBase: Ej. "fsa/2026/FSA-2026-0001/cop_magazine_1"
 */
export async function processAuditImage(
  buffer: Buffer,
  mimeType: string,
  storageKeyBase: string,
  originalSizeBytes: number
): Promise<ProcessedImages> {
  // Obtener metadatos del original
  const metadata = await sharp(buffer).metadata();
  const width_px  = metadata.width  ?? 0;
  const height_px = metadata.height ?? 0;

  // 1. Guardar original
  const originalKey = `${storageKeyBase}_original.jpg`;
  const { error: origError } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .upload(originalKey, buffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (origError) throw new Error(`Error guardando original: ${origError.message}`);

  const { data: { publicUrl: url_original } } = supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(originalKey);

  // 2. Generar versiones procesadas
  const urls: Record<string, string> = {};

  for (const version of VERSIONS) {
    const processed = await sharp(buffer)
      .resize(version.width, version.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: version.quality, progressive: true })
      .toBuffer();

    const key = `${storageKeyBase}_${version.key}.jpg`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .upload(key, processed, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) throw new Error(`Error guardando versión ${version.key}: ${uploadError.message}`);

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(key);
    urls[version.key] = publicUrl;
  }

  return {
    url_original,
    url_report:    urls['report'],
    url_thumbnail: urls['thumb'],
    storage_key:   storageKeyBase,
    width_px,
    height_px,
    size_bytes:    originalSizeBytes,
    mime_type:     mimeType,
  };
}

/**
 * Elimina todas las versiones de una imagen del bucket
 */
export async function deleteAuditImageVersions(storageKeyBase: string): Promise<void> {
  const keys = [
    `${storageKeyBase}_original.jpg`,
    `${storageKeyBase}_report.jpg`,
    `${storageKeyBase}_thumb.jpg`,
  ];
  const { error } = await supabaseAdmin.storage.from(SUPABASE_BUCKET).remove(keys);
  if (error) console.warn(`[imageProcessor] No se pudo borrar imagen ${storageKeyBase}:`, error.message);
}
