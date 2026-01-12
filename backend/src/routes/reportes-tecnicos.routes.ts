import { Router } from "express";
import ReportesTecnicosController from "../controllers/reportes-tecnicos.controller";

const router = Router();

// Catálogos (formulario dinámico)
router.get("/catalogos", ReportesTecnicosController.getCatalogos);

// Listado resumido (tabla)
router.get("/listado", ReportesTecnicosController.getListado);

// Crear reporte final
router.post("/", ReportesTecnicosController.create);

// Guardar borrador (autosave / draft)
router.post("/draft", ReportesTecnicosController.saveDraft);

// Listar reportes (completo)
router.get("/", ReportesTecnicosController.getAll);

// Obtener reporte por ID (siempre al final)
router.get("/:id", ReportesTecnicosController.getById);

export default router;
