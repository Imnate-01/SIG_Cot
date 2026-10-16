import { Router } from 'express';
import serviciosController from '../controllers/servicios.controller';
import { requireAuth } from '../middlewares/requireAuth';

const router = Router();

// getAll lee el catálogo con supabaseAdmin (salta RLS), así que el token
// debe validarse de verdad antes de llegar al controlador.
router.use(requireAuth);

router.get('/', serviciosController.getAll);
router.post('/', serviciosController.create);
router.put('/:id', serviciosController.update);
router.delete('/:id', serviciosController.delete);

export default router;
