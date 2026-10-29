"use client";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Onboarding from "./Onboarding";
import { AccesosProvider } from "@/features/accesos/AccesosProvider";
import GuardiaArea from "@/features/accesos/GuardiaArea";

const RUTAS_PUBLICAS = ["/login", "/register", "/verificado", "/recuperar", "/restablecer"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Warm-up: despierta el backend (y por ende Supabase) en cuanto carga cualquier página.
  // Esto reduce la latencia percibida en el login cuando el proyecto de Supabase estuvo inactivo.
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${API_URL}/api/health`, { method: "GET" }).catch(() => {});
  }, []);

  // Rutas públicas: sin sesión, sin menú, sin onboarding. Soporta /en/login, /es/register, etc.
  const esPublica = pathname === "/" ||
    RUTAS_PUBLICAS.some((r) => pathname.endsWith(r)) ||
    pathname.match(/^\/(en|es)$/) !== null;
  // Inicio (elegir área) es de pantalla completa: con sesión pero sin menú lateral
  const esInicio = /^(\/(en|es))?\/inicio$/.test(pathname);
  const conMenu = !esPublica && !esInicio;

  return (
    <AccesosProvider activo={!esPublica}>
      <div className="min-h-screen bg-white dark:bg-zinc-950 font-sans text-black dark:text-gray-100">
        {/* El componente internamente decide si mostrarse o no (revisando localStorage) */}
        {conMenu && <Onboarding />}
        {conMenu && <Sidebar />}

        <main
          className={`min-h-screen transition-all duration-300 ease-in-out ${conMenu ? "lg:pl-60 max-lg:pt-14" : ""}`}
        >
          {esPublica ? children : <GuardiaArea>{children}</GuardiaArea>}
        </main>
      </div>
    </AccesosProvider>
  );
}
