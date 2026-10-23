import { Router } from 'express';
import pmController from '../controllers/pm.controller';

const router = Router();

router.get('/', pmController.listar);
router.post('/', pmController.crear);
router.get('/:id', pmController.obtener);
router.patch('/:id', pmController.actualizar);
router.patch('/:id/tareas/:tareaId', pmController.actualizarTarea);
router.get('/:id/tareas/:tareaId/historial', pmController.historial);
router.post('/:id/tareas/:tareaId/colaboradores', pmController.agregarColaborador);
router.delete('/:id/tareas/:tareaId/colaboradores/:usuarioId', pmController.quitarColaborador);

export default router;
