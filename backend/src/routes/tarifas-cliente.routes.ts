import { Router } from 'express';
import tarifasClienteController from '../controllers/tarifas-cliente.controller';

const router = Router();

router.get('/:clienteId', tarifasClienteController.getByCliente);
router.post('/', tarifasClienteController.upsert);
router.delete('/:id', tarifasClienteController.delete);

export default router;
