// src/routes/cotizaciones.routes.ts
import { Router } from 'express';
import cotizacionesController from '../controllers/cotizaciones.controller';

const router = Router();

// ⚠️ IMPORTANTE: Las rutas estáticas van ANTES que /:id para evitar conflictos
router.get('/info/clientes', cotizacionesController.getClientes);
router.get('/info/usuarios', cotizacionesController.getUsuarios);

// Rutas principales
router.post('/', cotizacionesController.create);      // POST /api/cotizaciones -> Crear
router.get('/', cotizacionesController.getAll);       // GET /api/cotizaciones -> Ver todas
router.get('/:id', cotizacionesController.getById);   // GET /api/cotizaciones/:id -> Ver una
router.put('/:id/estado', cotizacionesController.updateEstado); // Actualizar estado
router.put('/:id', cotizacionesController.update);    // Actualizar datos (Edición)
router.delete('/:id', cotizacionesController.delete); // Eliminar

export default router;