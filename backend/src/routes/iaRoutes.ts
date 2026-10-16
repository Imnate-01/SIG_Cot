import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { iaController } from '../controllers/iaController';

const router = Router();

// Límite por usuario autenticado para no agotar la cuota de Gemini.
const iaRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? 'anon',
  message: { success: false, error: 'Demasiadas solicitudes a la IA. Intenta de nuevo en un minuto.' },
});

// La sesión la valida requireAuth en server.ts; aquí solo el límite por usuario.
router.use(iaRateLimiter);

// Definir los endpoints POST
// La ruta final será /api/ia/mejorar-texto, etc.
router.post('/mejorar-texto', iaController.mejorarTexto);
router.post('/extraer-cliente', iaController.extraerCliente);
router.post('/generar-correo', iaController.generarCorreo);

export default router;
