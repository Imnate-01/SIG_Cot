import { Request, Response } from 'express';
import multer from 'multer';
import { createClientForUser } from '../config/supabase';
import { processAuditImage, deleteAuditImageVersions } from '../utils/imageProcessor';

// Multer: memoria RAM (sin guardar en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB máx
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato no soportado. Use JPEG, PNG o WEBP.'));
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
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });

      if (!req.file) return res.status(400).json({ success: false, message: 'No se recibió ningún archivo.' });

      const supabaseUser = createClientForUser(token);
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
      const processed = await processAuditImage(
        req.file.buffer,
        req.file.mimetype,
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
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /api/food-safety-audit/:auditId/images
  // ─────────────────────────────────────────────────────────
  async getByAudit(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });
      const supabaseUser = createClientForUser(token);

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
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────
  // PATCH /api/food-safety-audit/:auditId/images/:imgId
  // Body: { caption?, orden? }
  // ─────────────────────────────────────────────────────────
  async update(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });
      const supabaseUser = createClientForUser(token);

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
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────
  // DELETE /api/food-safety-audit/:auditId/images/:imgId
  // ─────────────────────────────────────────────────────────
  async delete(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });
      const supabaseUser = createClientForUser(token);

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
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new EvidenceImagesController();
