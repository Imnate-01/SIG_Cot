"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
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
  UserCog,
  ClipboardCheck,
  Bell,
  ShieldPlus,
  History,
  Home,
  GitCompareArrows,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthMigration } from "@/hooks/useAuthMigration";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAlertasPm } from "@/features/pm/useAlertasPm";
import { useAccesos } from "@/features/accesos/AccesosProvider";
import { seccionDeRuta, tieneArea, type Seccion } from "@/features/accesos/areas";
import { limpiarSesion } from "@/features/accesos/sesion";

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
  "/pm/alertas",
  "/pm/nuevo",
  "/pm",
  "/bom",
  "/usuarios",
  "/configuracion",
  "/cuenta/solicitudes",
  "/cuenta/actividad",
  "/ayuda",
];

/** Devuelve la ruta del menú que corresponde a la URL actual (solo una, la más específica). */
function rutaActiva(pathname: string): string | undefined {
  const limpia = pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
  return RUTAS_MENU.find((r) => limpia === r || limpia.startsWith(r + "/"));
}

/** Ítem de navegación: fila de 38 px, activo = fondo blanco + barra azul a la izquierda (como en BOM Manager). */
function NavItem({ href, icon: Icono, children, badge, badgeUrgente }: { href: string; icon: React.ElementType; children: React.ReactNode; badge?: number; badgeUrgente?: boolean }) {
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
      {!!badge && badge > 0 && (
        <span className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold leading-5 text-white ${badgeUrgente ? "bg-sig-danger" : "bg-sig-blue"}`} aria-label={`${badge}`}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
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
  const tA = useTranslations("Accesos");
  const { datos } = useAccesos();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { userData } = useAuthMigration();

  // Cada área tiene su propio menú: solo se muestra el del área en la que estás.
  // Una ruta sin área (p. ej. /reportestec) usa el menú de Administración.
  const seccion: Seccion = seccionDeRuta(pathname) ?? "administracion";
  const esAdmin = !!datos?.esAdmin;
  const conMantenimiento = !!datos && tieneArea(datos, "mantenimiento");
  const alertasPm = useAlertasPm(conMantenimiento);
  const pendientes = esAdmin ? datos?.solicitudesPendientes ?? 0 : 0;

  const usuario = {
    nombre: datos?.usuario.nombre || userData?.nombre || "Usuario",
    rol: datos?.usuario.rol || userData?.rol || "",
  };

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    limpiarSesion();
    router.push("/login");
  };

  const iniciales = (usuario.nombre || "U")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase())
    .join("") || "U";

  const subtitulo: Record<Seccion, string> = {
    cotizaciones: tA("tags.cotizaciones"),
    mantenimiento: tA("tags.mantenimiento"),
    food_safety: tA("tags.food_safety"),
    administracion: esAdmin ? tA("tags.administracionAdmin") : tA("tags.administracion"),
  };

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        aria-label="Menú"
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-sig-line-strong rounded text-black hover:bg-sig-sand"
      >
        <Menu size={22} />
        {seccion === "mantenimiento" && (alertasPm?.total ?? 0) > 0 && (
          <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white ${(alertasPm?.overdue ?? 0) > 0 ? "bg-sig-danger" : "bg-sig-blue"}`} aria-label={`${alertasPm?.total} PM alerts`} />
        )}
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
        {/* HEADER: logo + área actual */}
        <div className="px-5 pt-5 pb-4 flex items-start justify-between">
          <div className="flex flex-col gap-3.5">
            <Image src="/sig-logo.webp" alt="SIG" width={76} height={36} unoptimized priority className="h-9 w-auto object-contain dark:bg-white dark:p-1 dark:rounded" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-black dark:text-white leading-tight">{tA(`areas.${seccion}`)}</span>
              <span className="text-xs text-sig-muted leading-tight">{subtitulo[seccion]}</span>
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

        {/* Cambiar de área: regresa a Inicio, que solo muestra las áreas asignadas */}
        <Link
          href="/inicio"
          className="mx-3 mb-3 flex items-center justify-between rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-2 hover:border-sig-line-strong"
        >
          <span className="flex flex-col leading-tight">
            <span className="text-[11px] text-sig-muted">{tA("currentArea")}</span>
            <span className="text-[13px] font-semibold text-black dark:text-white">{tA(`areas.${seccion}`)}</span>
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-sig-blue"><Home size={13} aria-hidden="true" />{tA("change")}</span>
        </Link>

        {/* NAV SCROLLABLE */}
        <nav className="flex-1 px-3 pt-2 pb-4 space-y-5 overflow-y-auto custom-scrollbar">

          {seccion === "cotizaciones" && (
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
                <NavItem href="/reportes" icon={BarChart3}>{t("salesMetrics")}</NavItem>
              </Seccion>
            </>
          )}

          {seccion === "mantenimiento" && (
            <Seccion titulo={t("pmTracker")}>
              <NavItem href="/pm" icon={ClipboardCheck}>{t("pmTracker")}</NavItem>
              <NavItem href="/pm/alertas" icon={Bell} badge={alertasPm?.total} badgeUrgente={(alertasPm?.overdue ?? 0) > 0}>{t("pmAlerts")}</NavItem>
              <NavItem href="/pm/nuevo" icon={FilePlus}>{t("newPm")}</NavItem>
            </Seccion>
          )}

          {seccion === "mantenimiento" && (
            <Seccion titulo={t("bomSection")}>
              <NavItem href="/bom" icon={GitCompareArrows}>{t("compareBoms")}</NavItem>
            </Seccion>
          )}

          {seccion === "food_safety" && (
            <Seccion titulo="Food Safety Audit">
              <NavItem href="/food-safety-audit" icon={ShieldCheck}>Food Safety Audit</NavItem>
              <NavItem href="/food-safety-audit/nuevo" icon={FilePlus}>{t("newReport")}</NavItem>
            </Seccion>
          )}

          {seccion === "administracion" && (
            <>
              {esAdmin && (
                <Seccion titulo={tA("nav.system")}>
                  <NavItem href="/usuarios" icon={UserCog}>{tA("nav.users")}</NavItem>
                  <NavItem href="/cuenta/solicitudes" icon={ShieldPlus} badge={pendientes}>{tA("nav.requests")}</NavItem>
                </Seccion>
              )}
              <Seccion titulo={tA("nav.account")}>
                <NavItem href="/configuracion" icon={Settings}>{tA("nav.myProfile")}</NavItem>
                {!esAdmin && <NavItem href="/cuenta/solicitudes" icon={ShieldPlus}>{tA("nav.requests")}</NavItem>}
                <NavItem href="/cuenta/actividad" icon={History}>{tA("nav.activity")}</NavItem>
                <NavItem href="/ayuda" icon={HelpCircle}>{tA("nav.help")}</NavItem>
              </Seccion>
            </>
          )}

          {/* --- SELECTOR DE IDIOMA --- */}
          <LanguageSwitcher />
        </nav>

        {/* FOOTER: usuario, tema y cierre de sesión */}
        <div className="px-5 py-4 border-t border-sig-line dark:border-zinc-800 space-y-3">
          <Link href="/configuracion" className="flex items-center gap-2.5 rounded -mx-1 px-1 py-0.5 hover:bg-white dark:hover:bg-zinc-800">
            <div className="w-8 h-8 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center shrink-0">
              {iniciales}
            </div>
            <div className="flex flex-col leading-tight min-w-0 flex-1">
              <span className="text-[13px] font-semibold text-black dark:text-white truncate capitalize">{usuario.nombre}</span>
              <span className="text-xs text-sig-muted truncate">{esAdmin ? tA("roleAdmin") : usuario.rol || t("user")}</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 h-9 flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 text-black dark:text-gray-200 border border-sig-line-strong dark:border-zinc-700 rounded text-sm font-semibold hover:bg-sig-sand dark:hover:bg-zinc-700 transition-colors"
            >
              <LogOut size={15} />
              {t("logout")}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>
    </>
  );
}
