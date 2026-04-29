"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Cookies from "js-cookie";
import {
  LayoutDashboard,
  FilePlus,
  LogOut,
  UserCircle,
  Users,
  Tags,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  X,
  Wrench
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthMigration } from "@/hooks/useAuthMigration";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { userData, isMigrated } = useAuthMigration();

  const usuario = userData || {
    nombre: "Usuario",
    email: "...",
    rol: "",
    departamento: ""
  };

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    // Eliminar cookie (fuente de verdad para el middleware)
    Cookies.remove("auth_token");
    // Limpiar localStorage
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    localStorage.removeItem("user");
    localStorage.removeItem("onboarding_completed");
    router.push("/login");
  };

  const linkClass = (path: string) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${pathname.includes(path)
      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-200"
    }`;

  const esIngeniero = usuario.rol === 'ingeniero' ||
    (usuario.departamento && (
      usuario.departamento.toLowerCase().includes('técnico') ||
      usuario.departamento.toLowerCase().includes('servicio')
    ));

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:bg-gray-50"
      >
        <Menu size={24} />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col shadow-xl z-50 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:shadow-none
        `}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${esIngeniero ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
              S
            </div>
            <span className="font-bold text-lg text-gray-800 dark:text-gray-200 tracking-tight">SIG System</span>
          </div>
          <ThemeToggle />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAV SCROLLABLE */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">

          {/* --- MENÚ EXCLUSIVO PARA VENTAS / ADMIN --- */}
          {!esIngeniero && (
            <>
              <div>
                <p className="px-3 text-[11px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">{t("commercial")}</p>
                <div className="space-y-1">
                  <Link href="/cotizaciones" className={linkClass("/cotizaciones")}>
                    <LayoutDashboard size={18} />
                    {t("dashboard")}
                  </Link>
                  <Link href="/cotizaciones/nueva" className={linkClass("/cotizaciones/nueva")}>
                    <FilePlus size={18} />
                    {t("newQuotation")}
                  </Link>
                  <Link href="/cotizaciones-us" className={linkClass("/cotizaciones-us")}>
                    <LayoutDashboard size={18} />
                    US Standard Quotes
                  </Link>
                  <Link href="/cotizaciones-us/nueva" className={linkClass("/cotizaciones-us/nueva")}>
                    <FilePlus size={18} />
                    New US Quote
                  </Link>
                </div>
              </div>

              <div>
                <p className="px-3 text-[11px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">{t("management")}</p>
                <div className="space-y-1">
                  <Link href="/clientes" className={linkClass("/clientes")}>
                    <Users size={18} />
                    {t("clients")}
                  </Link>
                  <Link href="/servicios" className={linkClass("/servicios")}>
                    <Tags size={18} />
                    {t("ratesAndServices")}
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* --- SECCIÓN DE REPORTES TÉCNICOS --- */}
          <div>
            <p className="px-3 text-[11px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">{t("technicalService")}</p>
            <div className="space-y-1">
              <Link href="/reportestec" className={linkClass("/reportestec")}>
                <Wrench size={18} />
                {esIngeniero ? t("myReports") : t("technicalReports")}
              </Link>

              {esIngeniero && (
                <Link href="/reportestec/nuevo" className={linkClass("/reportestec/nuevo")}>
                  <FilePlus size={18} />
                  {t("newReport")}
                </Link>
              )}

              {!esIngeniero && (
                <Link href="/reportes" className={linkClass("/reportes")}>
                  <BarChart3 size={18} />
                  {t("salesMetrics")}
                </Link>
              )}
            </div>
          </div>

          {/* --- SECCIÓN SISTEMA --- */}
          <div>
            <p className="px-3 text-[11px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">{t("system")}</p>
            <div className="space-y-1">
              {!esIngeniero && (
                <Link href="/configuracion" className={linkClass("/configuracion")}>
                  <Settings size={18} />
                  {t("settings")}
                </Link>
              )}
              <Link href="/ayuda" className={linkClass("/ayuda")}>
                <HelpCircle size={18} />
                {t("helpAndSupport")}
              </Link>
            </div>
          </div>

          {/* --- SELECTOR DE IDIOMA --- */}
          <LanguageSwitcher />

        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="bg-white dark:bg-zinc-800 p-1.5 rounded-full border border-gray-200 dark:border-zinc-700">
              <UserCircle className="text-gray-400" size={28} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate capitalize">
                {usuario.nombre}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate font-mono">
                {esIngeniero ? t("fieldEngineer") : (usuario.rol || t("user"))}
              </p>
            </div>
          </div>

          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 rounded-lg transition-all text-xs font-bold uppercase border border-gray-200 dark:border-zinc-700 hover:border-red-100 dark:hover:border-red-900 bg-white dark:bg-zinc-800">
            <LogOut size={14} />
            {t("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}