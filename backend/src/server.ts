import dotenv from 'dotenv';
// 1. CARGAMOS LAS VARIABLES LO PRIMERO DE TODO
dotenv.config();

import express from 'express';
import cors from 'cors';

// --- IMPORTACIÓN DE RUTAS ---
// Ahora sí podemos importar rutas, porque las variables ya existen
import authRoutes from './routes/auth.routes';
import cotizacionesRoutes from './routes/cotizaciones.routes';
import healthRoutes from './routes/health.routes';
import clientesRoutes from './routes/clientes.routes';
import serviciosRoutes from './routes/servicios.routes';
import reportesRoutes from './routes/reportes.routes';
import usuariosRoutes from './routes/usuarios.routes';
import reportesTecnicosRoutes from './routes/reportes-tecnicos.routes';
import iaRoutes from './routes/iaRoutes';
import tarifasClienteRoutes from './routes/tarifas-cliente.routes';
import cotizacionesUsRoutes from './routes/cotizaciones-us.routes';
import foodSafetyAuditRoutes from './routes/foodSafetyAudit.routes';
import adminUsuariosRoutes from './routes/admin-usuarios.routes';
import pmRoutes from './routes/pm.routes';
import { requireAuth } from './middlewares/requireAuth';
import { responderError } from './utils/http';
const app = express();

// El backend corre detrás del proxy de Render: sin esto, req.ip es la IP del proxy
// y los rate limiters (p. ej. el de PDFs) cuentan a TODOS los usuarios como uno solo.
// TRUST_PROXY permite ajustar el número de saltos (0 = sin proxy).
app.set('trust proxy', process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : 1);
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARES ---
// Orígenes permitidos: CORS_ORIGINS (separados por coma) o la lista por defecto
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [
      'https://sig-cot.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej. Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS bloqueado para el origen: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// Preflight OPTIONS con la MISMA configuración (antes usaba cors() abierto a todos)
app.options(/.*/, cors(corsOptions));

// 2 MB: los borradores de reportes técnicos incluyen firmas en base64 y el
// límite por defecto (100 KB) podía rechazar el autosave.
app.use(express.json({ limit: '2mb' }));

// --- DEFINICIÓN DE RUTAS ---
// Públicas
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);

// Protegidas: requireAuth valida el token UNA vez y deja req.user / req.supabase
app.use('/api/cotizaciones', requireAuth, cotizacionesRoutes);
app.use('/api/clientes', requireAuth, clientesRoutes);
app.use('/api/servicios', requireAuth, serviciosRoutes);
app.use('/api/reportes', requireAuth, reportesRoutes);
app.use('/api/usuarios', requireAuth, usuariosRoutes);
app.use('/api/ia', requireAuth, iaRoutes);
app.use('/api/reportes-tecnicos', requireAuth, reportesTecnicosRoutes);
app.use('/api/tarifas-cliente', requireAuth, tarifasClienteRoutes);
app.use('/api/cotizaciones-us', requireAuth, cotizacionesUsRoutes);
app.use('/api/food-safety-audit', requireAuth, foodSafetyAuditRoutes);
app.use('/api/admin/usuarios', requireAuth, adminUsuariosRoutes);
app.use('/api/pm', requireAuth, pmRoutes);

// Ruta inexistente → JSON (antes respondía una página HTML)
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada', message: 'Ruta no encontrada' });
});

// Manejador de errores final: JSON mal formado, archivos rechazados por
// multer, errores lanzados fuera de un try/catch, etc.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON inválido', message: 'JSON inválido' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'La solicitud es demasiado grande', message: 'La solicitud es demasiado grande' });
  }
  if (err?.name === 'MulterError' || /Formato no soportado/.test(err?.message || '')) {
    return res.status(400).json({ success: false, error: err.message, message: err.message });
  }
  if (/CORS bloqueado/.test(err?.message || '')) {
    return res.status(403).json({ success: false, error: 'Origen no permitido', message: 'Origen no permitido' });
  }
  return responderError(res, err);
});


// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});