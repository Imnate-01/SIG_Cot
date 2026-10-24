import { Router } from 'express';
import pmCorreo from '../controllers/pm-correo.controller';

/** Rutas para procesos programados: sin sesión, protegidas por secreto compartido. */
const router = Router();

router.post('/pm-resumen-diario', pmCorreo.resumenDiario);

export default router;
