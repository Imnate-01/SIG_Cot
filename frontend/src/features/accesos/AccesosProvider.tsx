"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import api from "@/services/api";
import type { Accesos, Area } from "./areas";

export interface DatosAccesos extends Accesos {
  usuario: { id: string; email: string; nombre: string; rol: string; departamento: string };
  /** Solo para administradores: solicitudes esperando respuesta. */
  solicitudesPendientes: number;
}

interface ContextoAccesos {
  /** null mientras carga o si no se pudo consultar. */
  datos: DatosAccesos | null;
  cargando: boolean;
  /** true si la consulta falló (no se bloquea la navegación; el backend sigue validando). */
  error: boolean;
  recargar: () => Promise<void>;
}

const Contexto = createContext<ContextoAccesos>({ datos: null, cargando: false, error: false, recargar: async () => {} });

/**
 * Consulta /api/accesos/me una vez por sesión y la comparte con el menú,
 * la pantalla de Inicio y la guardia de rutas. `activo` es false en las
 * pantallas públicas (login, registro…), donde todavía no hay sesión.
 */
export function AccesosProvider({ activo, children }: { activo: boolean; children: React.ReactNode }) {
  const [datos, setDatos] = useState<DatosAccesos | null>(null);
  const [cargando, setCargando] = useState(activo);
  const [error, setError] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const { data } = await api.get("/accesos/me");
      const d = data?.data;
      setDatos({
        esAdmin: !!d?.esAdmin,
        areas: (d?.areas || []) as Area[],
        usuario: d?.usuario || { id: "", email: "", nombre: "", rol: "", departamento: "" },
        solicitudesPendientes: d?.solicitudesPendientes ?? 0,
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    if (!Cookies.get("auth_token")) { setCargando(false); return; }
    recargar();
  }, [activo, recargar]);

  return <Contexto.Provider value={{ datos, cargando, error, recargar }}>{children}</Contexto.Provider>;
}

export const useAccesos = () => useContext(Contexto);
