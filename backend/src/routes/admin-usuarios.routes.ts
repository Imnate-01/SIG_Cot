import { Router } from 'express';
import { requireAdminSistema } from '../middlewares/requireArea';
import {
  permisos, listar, crear, restablecerContrasena, actualizar,
  actualizarAreas, listarSolicitudes, resolverSolicitud,
} from '../controllers/admin-usuarios.controller';

// Gestión de usuarios: solo administradores del sistema (usuarios.es_admin_sistema)
const router = Router();

router.get('/permisos', permisos);
router.get('/solicitudes', requireAdminSistema, listarSolicitudes);
router.patch('/solicitudes/:id', requireAdminSistema, resolverSolicitud);
router.get('/', requireAdminSistema, listar);
router.post('/', requireAdminSistema, crear);
router.post('/:id/password', requireAdminSistema, restablecerContrasena);
router.put('/:id/areas', requireAdminSistema, actualizarAreas);
router.patch('/:id', requireAdminSistema, actualizar);

export default router;
