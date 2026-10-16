import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { iaController } from '../controllers/iaController';
import { requireAuth } from '../middlewares/requireAuth';

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

// Todas las rutas de IA requieren sesión válida.
router.use(requireAuth, iaRateLimiter);

// Definir los endpoints POST
// La ruta final será /api/ia/mejorar-texto, etc.
router.post('/mejorar-texto', iaController.mejorarTexto);
router.post('/extraer-cliente', iaController.extraerCliente);
router.post('/generar-correo', iaController.generarCorreo);

export default router;
