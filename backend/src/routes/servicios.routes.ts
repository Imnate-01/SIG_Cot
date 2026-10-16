import { Router } from 'express';
import serviciosController from '../controllers/servicios.controller';
import { requireRole } from '../middlewares/requireRole';

// Modificar el catálogo de precios: roles en ROLES_GESTION_CATALOGO (si está definida)
const gestionCatalogo = requireRole('ROLES_GESTION_CATALOGO');

const router = Router();

router.get('/', serviciosController.getAll);
router.post('/', gestionCatalogo, serviciosController.create);
router.put('/:id', gestionCatalogo, serviciosController.update);
router.delete('/:id', gestionCatalogo, serviciosController.delete);

export default router;
