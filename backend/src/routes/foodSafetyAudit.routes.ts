import { Router } from 'express';
import foodSafetyAuditController from '../controllers/foodSafetyAudit.controller';
import evidenceImagesController, { uploadMiddleware } from '../controllers/evidenceImages.controller';

const router = Router();

// Rutas base: /api/food-safety-audit
router.post('/',          foodSafetyAuditController.create);
router.get('/listado',    foodSafetyAuditController.list);
router.get('/:id/pdf',    foodSafetyAuditController.generatePdf);
router.get('/:id',        foodSafetyAuditController.getById);
router.put('/:id/wizard', foodSafetyAuditController.saveWizard);
router.delete('/:id',     foodSafetyAuditController.delete);

// Evidencias fotográficas (anidadas bajo el reporte)
router.post(  '/:auditId/images',         uploadMiddleware, evidenceImagesController.upload);
router.get(   '/:auditId/images',         evidenceImagesController.getByAudit);
router.patch( '/:auditId/images/:imgId',  evidenceImagesController.update);
router.delete('/:auditId/images/:imgId',  evidenceImagesController.delete);

export default router;

