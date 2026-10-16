import { Router } from 'express';
import clientesController from '../controllers/clientes.controller';
import { requireRole } from '../middlewares/requireRole';

const router = Router();

router.get('/', clientesController.getAll);
router.post('/', clientesController.create);
router.put('/:id', clientesController.update);
// Borrar clientes: roles en ROLES_ELIMINAR_CLIENTES (si está definida)
router.delete('/:id', requireRole('ROLES_ELIMINAR_CLIENTES'), clientesController.delete);

export default router;