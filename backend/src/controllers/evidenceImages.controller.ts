import { Request, Response } from 'express';
import { contextoAuth } from '../middlewares/requireAuth'
import { responderError } from '../utils/http'
import multer from 'multer';
import { processAuditImage, deleteAuditImageVersions } from '../utils/imageProcessor';

// Mapa de extensión → MIME correcto (fallback cuando el OS no registra el tipo)
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png',  webp: 'image/webp',
  heic: 'image/heic', heif: 'image/heif',
};

/**
 * Devuelve el MIME efectivo del archivo.
 * En Windows, los archivos HEIC llegan con mimetype="" o "application/octet-stream"
 * porque el OS no tiene el tipo MIME registrado. En ese caso usamos la extensión.
 */
function getEffectiveMime(file: Express.Multer.File): string {
  const isMissing = !file.mimetype || file.mimetype === 'application/octet-stream';
  if (!isMissing) return file.mimetype;
  const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] || file.mimetype;
}

// Multer: memoria RAM (sin guardar en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB máx
  fileFilter: (_req, file, cb) => {
    // Aceptamos por MIME type o por extensión del archivo.
    // La comprobación por extensión es el fallback para Windows + HEIC,
    // donde el browser no conoce el MIME y envía "application/octet-stream".
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const allowedExts  = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no soportado. Use JPEG, PNG, WEBP o HEIC (iPhone).'));
    }
  },
});

export const uploadMiddleware = upload.single('image');

export class EvidenceImagesController {

  // ─────────────────────────────────────────────────────────
  // POST /api/food-safety-audit/:auditId/images
  // Body: multipart/form-data  { image: File, cop_finding_id?: number, param_id?: number, caption?: string, orden?: number }
  // ─────────────────────────────────────────────────────────
  async upload(req: Request, res: Response) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });

      // Normalizar MIME type: en Windows + HEIC, el navegador puede enviar
      // "application/octet-stream" o vacío. Lo resolvemos por la extensión del archivo.
      const effectiveMime = getEffectiveMime(req.file);

      const supabaseUser = contextoAuth(req).supabase;
      const { auditId } = req.params;
      const { cop_finding_id, param_id, caption = '', orden = 0 } = req.body;

      // Verificar que el reporte existe y pertenece al usuario
      const { data: report, error: reportError } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('id, folio, fecha_auditoria')
        .eq('id', auditId)
        .single();
      if (reportError || !report) {
        return res.status(404).json({ success: false, message: 'Reporte no encontrado' });
      }

      // Construir el año desde la fecha del reporte o año actual
      const year = new Date().getFullYear();

      // Contar imágenes existentes para el nombre secuencial
      const { count } = await supabaseUser
        .from('audit_evidence_images')
        .select('id', { count: 'exact', head: true })
        .eq('audit_id', auditId);
      const seq = (count ?? 0) + 1;

      // Clave base en Storage
      const section = cop_finding_id ? `cop_f${cop_finding_id}` : param_id ? `param_${param_id}` : 'misc';
      const storageKeyBase = `fsa/${year}/${report.folio}/${section}_${seq}`;

      // Procesar imagen (genera 3 versiones y sube a Supabase Storage)
      // Se usa effectiveMime (derivado de la extensión si el OS no tiene HEIC registrado)
      const processed = await processAuditImage(
        req.file.buffer,
        effectiveMime,
        storageKeyBase,
        req.file.size,
      );

      // Guardar referencia en base de datos
      const { data: imgRecord, error: insertError } = await supabaseUser
        .from('audit_evidence_images')
        .insert({
          audit_id:       Number(auditId),
          cop_finding_id: cop_finding_id ? Number(cop_finding_id) : null,
          param_id:       param_id ? Number(param_id) : null,
          storage_key:    processed.storage_key,
          url_original:   processed.url_original,
          url_thumbnail:  processed.url_thumbnail,
          url_report:     processed.url_report,
          nombre_archivo: req.file.originalname,
          mime_type:      processed.mime_type,
          size_bytes:     processed.size_bytes,
          width_px:       processed.width_px,
          height_px:      processed.height_px,
          caption:        caption.trim().slice(0, 499),
          orden:          Number(orden),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json({ success: true, data: imgRecord });

    } catch (error: any) {
      console.error('[EvidenceImages] upload error:', error);
      responderError(res, error);
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /api/food-safety-audit/:auditId/images
  // ─────────────────────────────────────────────────────────
  async getByAudit(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      const { auditId } = req.params;
      const { cop_finding_id } = req.query;

      let query = supabaseUser
        .from('audit_evidence_images')
        .select('*')
        .eq('audit_id', auditId)
        .order('orden');

      if (cop_finding_id) query = query.eq('cop_finding_id', cop_finding_id);

      const { data, error } = await query;
      if (error) throw error;

      res.json({ success: true, data });
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /api/food-safety-audit/:auditId/images/:imgId
  // Body: { caption?, orden? }
  // ─────────────────────────────────────────────────────────
  async update(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      const { imgId } = req.params;
      const { caption, orden } = req.body;

      const updateData: any = {};
      if (caption !== undefined) updateData.caption = String(caption).slice(0, 499);
      if (orden   !== undefined) updateData.orden   = Number(orden);

      const { data, error } = await supabaseUser
        .from('audit_evidence_images')
        .update(updateData)
        .eq('id', imgId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // ─────────────────────────────────────────────────────────
  // PUT /api/food-safety-audit/:auditId/images/:imgId/replace
  // Reemplaza atómicamente el contenido de una imagen existente.
  // Actualiza el registro EN LUGAR (mismo ID) → nunca hay dos registros
  // simultáneos, eliminando la posibilidad de duplicados en el PDF.
  // Body: multipart/form-data { image: File }
  // ─────────────────────────────────────────────────────────
  async replace(req: Request, res: Response) {
    try {
      if (!req.file)  return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });

      const effectiveMime = getEffectiveMime(req.file);
      const supabaseUser  = contextoAuth(req).supabase;
      const { auditId, imgId } = req.params;

      // 1. Obtener el registro actual (necesitamos storage_key para borrar archivos viejos)
      const { data: existing, error: fetchError } = await supabaseUser
        .from('audit_evidence_images')
        .select('*')
        .eq('id',       imgId)
        .eq('audit_id', auditId)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
      }

      // 2. Obtener el folio del reporte para construir la clave de storage
      const { data: report } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('folio')
        .eq('id', auditId)
        .single();

      const year    = new Date().getFullYear();
      const section = existing.cop_finding_id
        ? `cop_f${existing.cop_finding_id}`
        : existing.param_id
        ? `param_${existing.param_id}`
        : 'misc';
      // Timestamp para garantizar unicidad de la clave
      const storageKeyBase = `fsa/${year}/${report?.folio}/${section}_${Date.now()}`;

      // 3. Procesar la nueva imagen (genera thumb + report + original en Storage)
      const processed = await processAuditImage(
        req.file.buffer,
        effectiveMime,
        storageKeyBase,
        req.file.size,
      );

      // 4. Actualizar el registro EN LUGAR (mismo id → nunca hay duplicados)
      const { data: updated, error: updateError } = await supabaseUser
        .from('audit_evidence_images')
        .update({
          storage_key:    processed.storage_key,
          url_original:   processed.url_original,
          url_thumbnail:  processed.url_thumbnail,
          url_report:     processed.url_report,
          nombre_archivo: req.file.originalname,
          mime_type:      processed.mime_type,
          size_bytes:     processed.size_bytes,
          width_px:       processed.width_px,
          height_px:      processed.height_px,
        })
        .eq('id', imgId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 5. Borrar los archivos VIEJOS del Storage (no bloqueante: si falla, no afecta la respuesta)
      deleteAuditImageVersions(existing.storage_key).catch((err: any) =>
        console.warn('[EvidenceImages] No se pudo borrar storage antiguo:', err?.message)
      );

      res.json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[EvidenceImages] replace error:', error);
      responderError(res, error);
    }
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /api/food-safety-audit/:auditId/images/:imgId
  // ─────────────────────────────────────────────────────────
  async delete(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;

      const { imgId } = req.params;

      // Obtener el storage_key antes de borrar
      const { data: img, error: fetchError } = await supabaseUser
        .from('audit_evidence_images')
        .select('storage_key')
        .eq('id', imgId)
        .single();

      if (fetchError || !img) {
        return res.status(404).json({ success: false, error: 'Imagen no encontrada' });
      }

      // Borrar de Storage
      await deleteAuditImageVersions(img.storage_key);

      // Borrar de BD
      const { error: deleteError } = await supabaseUser
        .from('audit_evidence_images')
        .delete()
        .eq('id', imgId);

      if (deleteError) throw deleteError;

      res.json({ success: true, message: 'Imagen eliminada correctamente' });
    } catch (error: any) {
      responderError(res, error);
    }
  }
}

export default new EvidenceImagesController();
