import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import foodSafetyAuditController from '../controllers/foodSafetyAudit.controller';
import evidenceImagesController, { uploadMiddleware } from '../controllers/evidenceImages.controller';

const router = Router();

// FIX #4: Rate limiting — máximo 5 PDFs por IP por minuto
// Previene abuso del endpoint que lanza Chromium (recurso costoso)
const pdfRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Demasiadas solicitudes de PDF. Intente nuevamente en un minuto.' },
});

// Rutas base: /api/food-safety-audit
router.post('/',           foodSafetyAuditController.create);
router.get('/listado',     foodSafetyAuditController.list);
router.get('/:id/pdf',     pdfRateLimiter, foodSafetyAuditController.generatePdf);  // ← Rate limited
router.get('/:id',         foodSafetyAuditController.getById);
router.put('/:id/wizard',  foodSafetyAuditController.saveWizard);
router.delete('/:id',      foodSafetyAuditController.delete);

// Evidencias fotográficas (anidadas bajo el reporte)
router.post(  '/:auditId/images',         uploadMiddleware, evidenceImagesController.upload);
router.get(   '/:auditId/images',         evidenceImagesController.getByAudit);
router.patch( '/:auditId/images/:imgId',  evidenceImagesController.update);
router.delete('/:auditId/images/:imgId',  evidenceImagesController.delete);

export default router;
