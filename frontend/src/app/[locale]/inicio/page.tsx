"use client";

import React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { FileText, Wrench, ShieldCheck, UserCog, Lock, Loader2, LogOut, RefreshCw } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { useAccesos } from "@/features/accesos/AccesosProvider";
import { INICIO_SECCION, type Seccion } from "@/features/accesos/areas";
import { limpiarSesion } from "@/features/accesos/sesion";

/**
 * Inicio del Service Operations Workspace: a donde llega cada persona después
 * de iniciar sesión. Muestra solo las áreas que tiene asignadas (las demás ni
 * aparecen) y su parte de Administración.
 */

const ESTILO: Record<Seccion, { barra: string; icono: string; Icono: React.ElementType }> = {
  cotizaciones: { barra: "bg-sig-blue", icono: "bg-sig-blue-soft text-sig-blue", Icono: FileText },
  mantenimiento: { barra: "bg-sig-success", icono: "bg-sig-success-soft text-sig-success", Icono: Wrench },
  food_safety: { barra: "bg-[#C8C846]", icono: "bg-sig-warning-soft text-black", Icono: ShieldCheck },
  administracion: { barra: "bg-[#DCA0FF]", icono: "bg-[#F5E6FF] text-black", Icono: UserCog },
};

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";
}

export default function InicioPage() {
  const t = useTranslations("Accesos");
  const router = useRouter();
  const { datos, cargando, error, recargar } = useAccesos();

  const salir = () => {
    limpiarSesion();
    router.push("/login");
  };

  if (cargando || (!datos && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center" aria-busy="true">
        <Loader2 className="animate-spin text-sig-blue" aria-label={t("loading")} />
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-sig-muted">{t("errorLoad")}</p>
        <button onClick={() => recargar()} className="inline-flex h-9 items-center gap-2 rounded border border-sig-line-strong px-4 text-sm font-semibold hover:bg-sig-sand">
          <RefreshCw size={16} /> {t("retry")}
        </button>
      </div>
    );
  }

  const nombre = datos.usuario.nombre || datos.usuario.email;
  const primerNombre = nombre.split(/\s+/)[0] || nombre;
  const secciones: Seccion[] = [...datos.areas, "administracion"];
  const claveAdmin = (k: Seccion) => (k === "administracion" && datos.esAdmin ? "administracionAdmin" : k);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-gray-100">
      <header className="flex h-[72px] items-center gap-5 border-b border-sig-line dark:border-zinc-800 px-5 sm:px-10">
        <Image src="/sig-logo.webp" alt="SIG" width={76} height={36} unoptimized priority className="h-9 w-auto object-contain dark:bg-white dark:p-1 dark:rounded" />
        <span className="hidden h-7 w-px bg-sig-line sm:block" aria-hidden="true" />
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm font-bold">{t("appName")}</span>
          <span className="text-xs text-sig-muted">{t("appTagline")}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white dark:bg-white dark:text-black">{iniciales(nombre)}</div>
          <div className="hidden min-w-0 flex-col leading-tight md:flex">
            <span className="truncate text-[13px] font-semibold capitalize">{nombre}</span>
            <span className="truncate text-xs text-sig-muted">{datos.esAdmin ? t("roleAdmin") : datos.usuario.rol || datos.usuario.departamento}</span>
          </div>
        </div>
        <button onClick={salir} className="inline-flex h-9 items-center gap-2 rounded border border-sig-line-strong dark:border-zinc-700 px-3.5 text-sm font-semibold hover:bg-sig-sand dark:hover:bg-zinc-800">
          <LogOut size={15} /> <span className="hidden sm:inline">{t("logout")}</span>
        </button>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-10 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-bold leading-tight capitalize">{t("greeting", { nombre: primerNombre.toLowerCase() })}</h1>
            <p className="text-sm text-sig-muted">{t("homeSubtitle")}</p>
          </div>

          {/* "Tu rol" solo lo ven los administradores del sistema */}
          {datos.esAdmin && (
            <div className="grid min-w-[300px] grid-cols-2 rounded border border-sig-line dark:border-zinc-800">
              <div className="flex flex-col gap-1.5 border-r border-sig-line dark:border-zinc-800 px-5 py-3.5">
                <span className="text-xs text-sig-muted">{t("yourRole")}</span>
                <span className="text-sm font-bold">{t("roleAdmin")}</span>
              </div>
              <div className="flex flex-col gap-1.5 px-5 py-3.5">
                <span className="text-xs text-sig-muted">{t("assignedAreas")}</span>
                <span className="text-[28px] font-bold leading-none">{datos.areas.length}</span>
              </div>
            </div>
          )}
        </div>

        <section className="flex flex-col gap-3" aria-labelledby="tus-areas">
          <h2 id="tus-areas" className="text-lg font-bold">{t("yourAreas")}</h2>

          {datos.areas.length === 0 && (
            <div className="rounded border border-dashed border-sig-line-strong bg-sig-sand dark:bg-zinc-900 px-6 py-5">
              <p className="text-sm font-bold">{t("noAreasTitle")}</p>
              <p className="mt-1 text-sm text-sig-muted">{t("noAreasDesc")}</p>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 border-t border-black dark:border-zinc-500 pt-4">
            {secciones.map((s) => {
              const { barra, icono, Icono } = ESTILO[s];
              const k = claveAdmin(s);
              const items = t.raw(`items.${k}`) as string[];
              const pendientes = s === "administracion" && datos.esAdmin ? datos.solicitudesPendientes : 0;
              return (
                <Link
                  key={s}
                  href={s === "administracion" && datos.esAdmin ? "/usuarios" : INICIO_SECCION[s]}
                  className="group relative flex min-h-[280px] flex-col gap-4 overflow-hidden rounded border border-sig-line dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 transition-colors hover:bg-sig-sand dark:hover:bg-zinc-800"
                >
                  <span className={`absolute inset-x-0 top-0 h-1 ${barra}`} aria-hidden="true" />
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded ${icono}`}><Icono size={20} strokeWidth={1.6} aria-hidden="true" /></div>
                    {pendientes > 0 ? (
                      <span className="rounded-full bg-black px-2 py-0.5 text-[11px] font-bold text-white">{t("pending", { n: pendientes })}</span>
                    ) : (
                      <span className="text-xs font-semibold text-sig-muted">{t(`tags.${k}`)}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-bold leading-tight">{t(`areas.${s}`)}</span>
                    <span className="text-sm text-sig-muted">{t(`descs.${k}`)}</span>
                  </div>
                  <ul className="flex flex-1 flex-col border-t border-sig-line dark:border-zinc-800">
                    {items.map((it) => (
                      <li key={it} className="border-b border-sig-line dark:border-zinc-800 py-2 text-[13px]">{it}</li>
                    ))}
                  </ul>
                  <span className="text-sm font-semibold text-sig-blue">{t("enter")} →</span>
                </Link>
              );
            })}
          </div>
        </section>

        {!datos.esAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded bg-sig-sand dark:bg-zinc-900 px-5 py-4">
            <span className="flex items-center gap-2.5 text-[13px]"><Lock size={16} strokeWidth={1.6} aria-hidden="true" /> {t("onlyAssigned")}</span>
            <Link href="/cuenta/solicitudes" className="text-[13px] font-semibold text-sig-blue hover:underline">{t("requestAccess")} →</Link>
          </div>
        )}
      </main>
    </div>
  );
}
