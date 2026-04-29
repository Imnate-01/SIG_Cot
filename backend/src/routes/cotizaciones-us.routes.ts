import { Router } from 'express';
import cotizacionesUsController from '../controllers/cotizaciones-us.controller';

const router = Router();

router.post('/', cotizacionesUsController.create);
router.get('/', cotizacionesUsController.getAll);
router.get('/:id', cotizacionesUsController.getById);
router.put('/:id', cotizacionesUsController.update);
router.delete('/:id', cotizacionesUsController.delete);

export default router;
