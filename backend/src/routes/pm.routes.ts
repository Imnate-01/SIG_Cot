import { Router } from 'express';
import pmController from '../controllers/pm.controller';
import evidencias from '../controllers/pm-evidencias.controller';
import alertas from '../controllers/pm-alertas.controller';
import acciones from '../controllers/pm-acciones.controller';

const router = Router();

router.get('/', pmController.listar);
router.post('/', pmController.crear);
router.get('/alertas', alertas.listar);
router.get('/:id', pmController.obtener);
router.patch('/:id', pmController.actualizar);
router.patch('/:id/tareas/:tareaId', pmController.actualizarTarea);
router.post('/:id/acciones', acciones.crear);
router.patch('/:id/acciones/:accionId', acciones.actualizar);
router.delete('/:id/acciones/:accionId', acciones.eliminar);
router.get('/:id/tareas/:tareaId/historial', pmController.historial);
router.post('/:id/tareas/:tareaId/colaboradores', pmController.agregarColaborador);
router.delete('/:id/tareas/:tareaId/colaboradores/:usuarioId', pmController.quitarColaborador);
router.post('/:id/tareas/:tareaId/evidencias/subida', evidencias.prepararSubida);
router.post('/:id/tareas/:tareaId/evidencias/cotizacion', evidencias.ligarCotizacion);
router.post('/:id/tareas/:tareaId/evidencias', evidencias.registrar);
router.get('/:id/evidencias/:evId/url', evidencias.enlace);
router.delete('/:id/evidencias/:evId', evidencias.eliminar);

export default router;
