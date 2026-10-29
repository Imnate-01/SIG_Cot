import { Router } from 'express';
import { misAccesos, misSolicitudes, crearSolicitud, miActividad } from '../controllers/accesos.controller';

// Parte personal de Administración: la tiene todo usuario con sesión.
const router = Router();

router.get('/me', misAccesos);
router.get('/me/solicitudes', misSolicitudes);
router.post('/me/solicitudes', crearSolicitud);
router.get('/me/actividad', miActividad);

export default router;
