import { Router } from "express";
import { registrarUsuario, loginUsuario, refreshToken, solicitarRecuperacion, restablecerContrasena } from "../controllers/auth.controller";

const router = Router();

// POST /api/auth/register
router.post("/register", registrarUsuario);

// POST /api/auth/login
router.post("/login", loginUsuario);

// POST /api/auth/refresh  — renueva el access_token usando el refresh_token (expira en 30 días)
router.post("/refresh", refreshToken);

// POST /api/auth/forgot-password  — envía el enlace de recuperación por correo
router.post("/forgot-password", solicitarRecuperacion);

// POST /api/auth/reset-password   — guarda la nueva contraseña (token del enlace)
router.post("/reset-password", restablecerContrasena);

export default router;
