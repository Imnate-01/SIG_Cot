import { Router } from 'express';
import { requireRole } from '../middlewares/requireRole';
import { VARIABLE_ROLES_ADMIN, permisos, listar, crear, restablecerContrasena, actualizar } from '../controllers/admin-usuarios.controller';

const router = Router();
const soloAdmin = requireRole(VARIABLE_ROLES_ADMIN, { cerradoSiNoConfigurado: true });

router.get('/permisos', permisos);
router.get('/', soloAdmin, listar);
router.post('/', soloAdmin, crear);
router.post('/:id/password', soloAdmin, restablecerContrasena);
router.patch('/:id', soloAdmin, actualizar);

export default router;
