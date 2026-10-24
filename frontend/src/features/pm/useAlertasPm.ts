"use client";
import { useCallback, useEffect, useState } from "react";
import api from "@/services/api";
import { hoyISO } from "./pm";

export interface ResumenAlertas { total: number; overdue: number; due_soon: number }

/** Evento que avisa al contador del menú que algo cambió (p. ej. se completó una tarea). */
export const EVENTO_ALERTAS = "pm:alertas-cambiaron";
export const avisarCambioAlertas = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_ALERTAS));
};

const CADA_MS = 5 * 60 * 1000;

/**
 * Conteo de alertas del usuario para el menú. Se actualiza al montar, cada 5
 * minutos, al volver a la pestaña y cuando el detalle de un PM avisa un cambio.
 * Si el backend aún no tiene el módulo, simplemente no muestra nada.
 */
export function useAlertasPm(activo = true) {
  const [resumen, setResumen] = useState<ResumenAlertas | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get("/pm/alertas", { params: { hoy: hoyISO(), alcance: "mias" } });
      setResumen(data.resumen ?? null);
    } catch {
      setResumen(null);
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    const primera = setTimeout(cargar, 0);
    const intervalo = setInterval(cargar, CADA_MS);
    const alVolver = () => { if (document.visibilityState === "visible") cargar(); };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener(EVENTO_ALERTAS, cargar);
    return () => {
      clearTimeout(primera);
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener(EVENTO_ALERTAS, cargar);
    };
  }, [activo, cargar]);

  return resumen;
}
