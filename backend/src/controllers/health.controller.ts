import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";

export const comprobarBD = async (_req: Request, res: Response) => {
  try {
    // Para "despertar" el proyecto de Supabase, hacemos una consulta sencilla
    const { error } = await supabaseAdmin.from('usuarios').select('id').limit(1);
    if (error) throw error;

    res.json({
      ok: true,
      message: "Conexión a Supabase correcta ✅",
      now: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error al conectar a Supabase:", error);
    res.status(500).json({
      ok: false,
      message: "Error al conectar a la base de datos",
    });
  }
};
