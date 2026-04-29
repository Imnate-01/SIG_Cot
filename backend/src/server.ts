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
const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARES ---
const allowedOrigins = [
  'https://sig-cot.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

app.use(cors({
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
}));

// Responder explícitamente a preflight OPTIONS
app.options(/.*/, cors());

app.use(express.json());

// --- DEFINICIÓN DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/cotizaciones', cotizacionesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/reportes-tecnicos', reportesTecnicosRoutes);
app.use('/api/tarifas-cliente', tarifasClienteRoutes);
app.use('/api/cotizaciones-us', cotizacionesUsRoutes);


// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});