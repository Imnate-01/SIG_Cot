import { Router } from 'express';
import tarifasClienteController from '../controllers/tarifas-cliente.controller';
import { requireRole } from '../middlewares/requireRole';

const gestionCatalogo = requireRole('ROLES_GESTION_CATALOGO');

const router = Router();

router.get('/:clienteId', tarifasClienteController.getByCliente);
router.post('/', gestionCatalogo, tarifasClienteController.upsert);
router.delete('/:id', gestionCatalogo, tarifasClienteController.delete);

export default router;
