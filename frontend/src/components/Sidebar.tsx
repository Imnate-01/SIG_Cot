"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Cookies from "js-cookie";
import {
  LayoutDashboard,
  FilePlus,
  LogOut,
  Users,
  Tags,
  BarChart3,
  Settings,
  HelpCircle,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthMigration } from "@/hooks/useAuthMigration";
import LanguageSwitcher from "./LanguageSwitcher";

/** Rutas del menú, de la más específica a la más general. */
const RUTAS_MENU = [
  "/cotizaciones/nueva",
  "/cotizaciones-us/nueva",
  "/cotizaciones-us",
  "/cotizaciones",
  "/clientes",
  "/servicios",
  "/food-safety-audit/nuevo",
  "/food-safety-audit",
  "/reportes",
  "/configuracion",
  "/ayuda",
];

/** Devuelve la ruta del menú que corresponde a la URL actual (solo una, la más específica). */
function rutaActiva(pathname: string): string | undefined {
  const limpia = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
  return RUTAS_MENU.find((r) => limpia === r || limpia.startsWith(r + "/"));
}

/** Ítem de navegación: fila de 38 px, activo = fondo blanco + barra azul a la izquierda (como en BOM Manager). */
function NavItem({ href, icon: Icono, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  const pathname = usePathname();
  const on = rutaActiva(pathname) === href;
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`relative flex items-center gap-3 h-[38px] px-2.5 rounded text-sm transition-colors ${on
        ? "bg-white dark:bg-zinc-800 text-black dark:text-white font-bold"
        : "text-black dark:text-gray-200 font-medium hover:bg-white dark:hover:bg-zinc-800"
        }`}
    >
      <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-sm ${on ? "bg-sig-blue" : "bg-transparent"}`} />
      <Icono size={18} strokeWidth={1.6} />
      <span className="flex-1 truncate">{children}</span>
    </Link>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2.5 text-[11px] font-bold text-sig-muted uppercase tracking-wider mb-1.5">{titulo}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Sidebar");
  const tLogin = useTranslations("Login");

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const { userData } = useAuthMigration();

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

  /**
   * Detecta si el usuario pertenece al grupo de Ingeniería Aséptica / Calidad Aséptica.
   * Aplica a roles en español e inglés:
   * - "Aseptic Engineer", "Aseptic Engineering"
   * - "Ingeniero Aséptico", "Ingeniería Aséptica"
   * - "Calidad Aséptica", "Calidad"
   * - "Intern" (practicante del área)
   * - Cualquier rol que contenga: aseptic | aséptic | calidad | ingeniero | engineer
   */
  const rolLower   = (usuario.rol          || '').toLowerCase();
  const deptLower  = (usuario.departamento || '').toLowerCase();

  const ASEPTICO_KEYWORDS = [
    'aseptic', 'aséptic',   // inglés y español
    'calidad',               // Calidad Aséptica, etc.
    'ingeniero', 'engineer', // ingeniero/engineer aséptico o de campo
    'intern',                // practicante del área
  ];

  const esAseptico = ASEPTICO_KEYWORDS.some(
    (kw) => rolLower.includes(kw) || deptLower.includes(kw)
  );

  // Alias para mantener compatibilidad con el código existente
  const esIngeniero = esAseptico;

  const iniciales = (usuario.nombre || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("") || "U";

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        aria-label="Menú"
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-sig-line-strong rounded text-black hover:bg-sig-sand"
      >
        <Menu size={22} />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-60 bg-sig-sand dark:bg-zinc-900 border-r border-sig-line dark:border-zinc-800 flex flex-col z-50 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}
          lg:translate-x-0 lg:shadow-none
        `}
      >
        {/* HEADER: logo + nombre de la app */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between">
          <div className="flex flex-col gap-3.5">
            <Image src="/sig-logo.webp" alt="SIG" width={76} height={36} unoptimized priority className="h-9 w-auto object-contain dark:bg-white dark:p-1 dark:rounded" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-black dark:text-white leading-tight">{tLogin("appName")}</span>
              <span className="text-xs text-sig-muted leading-tight">{tLogin("appTagline")}</span>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            aria-label="Cerrar menú"
            className="lg:hidden text-sig-muted hover:text-black"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAV SCROLLABLE */}
        <nav className="flex-1 px-3 pt-2 pb-4 space-y-5 overflow-y-auto custom-scrollbar">

          {/* --- MENÚ EXCLUSIVO PARA VENTAS / ADMIN --- */}
          {!esIngeniero && (
            <>
              <Seccion titulo={t("commercial")}>
                <NavItem href="/cotizaciones" icon={LayoutDashboard}>{t("dashboard")}</NavItem>
                <NavItem href="/cotizaciones/nueva" icon={FilePlus}>{t("newQuotation")}</NavItem>
                <NavItem href="/cotizaciones-us" icon={LayoutDashboard}>US Standard Quotes</NavItem>
                <NavItem href="/cotizaciones-us/nueva" icon={FilePlus}>New US Quote</NavItem>
              </Seccion>

              <Seccion titulo={t("management")}>
                <NavItem href="/clientes" icon={Users}>{t("clients")}</NavItem>
                <NavItem href="/servicios" icon={Tags}>{t("ratesAndServices")}</NavItem>
              </Seccion>
            </>
          )}

          {/* --- SECCIÓN FOOD SAFETY AUDIT --- */}
          <Seccion titulo="Auditoría (FSA)">
            <NavItem href="/food-safety-audit" icon={ShieldCheck}>Food Safety Audit</NavItem>
            {esIngeniero && (
              <NavItem href="/food-safety-audit/nuevo" icon={FilePlus}>{t("newReport")}</NavItem>
            )}
            {!esIngeniero && (
              <NavItem href="/reportes" icon={BarChart3}>{t("salesMetrics")}</NavItem>
            )}
          </Seccion>

          {/* --- SECCIÓN SISTEMA: visible para TODOS los roles --- */}
          <Seccion titulo={t("system")}>
            <NavItem href="/configuracion" icon={Settings}>{t("settings")}</NavItem>
            <NavItem href="/ayuda" icon={HelpCircle}>{t("helpAndSupport")}</NavItem>
          </Seccion>

          {/* --- SELECTOR DE IDIOMA --- */}
          <LanguageSwitcher />
        </nav>

        {/* FOOTER: usuario, tema y cierre de sesión */}
        <div className="px-5 py-4 border-t border-sig-line dark:border-zinc-800 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0">
              {iniciales}
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-black dark:text-white truncate capitalize">{usuario.nombre}</span>
              <span className="text-xs text-sig-muted truncate">{usuario.rol || t("user")}</span>
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            className="w-full h-9 flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-black dark:text-gray-200 border border-sig-line-strong dark:border-zinc-700 rounded text-sm font-semibold hover:bg-sig-sand dark:hover:bg-zinc-700 transition-colors"
          >
            <LogOut size={15} />
            {t("logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
