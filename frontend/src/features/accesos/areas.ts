/**
 * Áreas del Service Operations Workspace y a qué rutas pertenece cada una.
 * El backend es quien decide de verdad (requireArea); esto solo arma el menú,
 * la pantalla de Inicio y evita entrar a pantallas que van a responder 403.
 */
export const AREAS = ["cotizaciones", "mantenimiento", "food_safety"] as const;
export type Area = (typeof AREAS)[number];
/** Administración la tiene todo usuario (su parte personal); no se asigna. */
export type Seccion = Area | "administracion";

export interface Accesos {
  esAdmin: boolean;
  areas: Area[];
}

export const RUTAS_SECCION: Record<Seccion, readonly string[]> = {
  cotizaciones: ["/cotizaciones", "/cotizaciones-us", "/clientes", "/servicios", "/reportes"],
  mantenimiento: ["/pm"],
  food_safety: ["/food-safety-audit"],
  administracion: ["/configuracion", "/cuenta", "/usuarios", "/ayuda"],
};

/** Pantalla con la que abre cada sección desde Inicio. */
export const INICIO_SECCION: Record<Seccion, string> = {
  cotizaciones: "/cotizaciones",
  mantenimiento: "/pm",
  food_safety: "/food-safety-audit",
  administracion: "/configuracion",
};

/** Solo para administradores del sistema, aunque estén dentro de Administración. */
const RUTAS_SOLO_ADMIN = ["/usuarios"];

/** Quita el prefijo de idioma: /en/pm/nuevo → /pm/nuevo */
export function limpiarRuta(pathname: string): string {
  return pathname.replace(/^\/(es|en)(?=\/|$)/, "") || "/";
}

/** ¿La ruta es `base` o algo debajo de `base`? (/reportes no incluye /reportestec) */
export function rutaDentroDe(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(base + "/");
}

/** Sección a la que pertenece una ruta, o null si no es de ninguna (login, inicio…). */
export function seccionDeRuta(pathname: string): Seccion | null {
  const ruta = limpiarRuta(pathname);
  for (const seccion of Object.keys(RUTAS_SECCION) as Seccion[]) {
    if (RUTAS_SECCION[seccion].some((base) => rutaDentroDe(ruta, base))) return seccion;
  }
  return null;
}

export function tieneArea(accesos: Accesos, area: Area): boolean {
  return accesos.esAdmin || accesos.areas.includes(area);
}

/** ¿Puede abrir esta pantalla? Las rutas sin sección no se restringen aquí. */
export function puedeVerRuta(accesos: Accesos, pathname: string): boolean {
  const ruta = limpiarRuta(pathname);
  if (RUTAS_SOLO_ADMIN.some((base) => rutaDentroDe(ruta, base))) return accesos.esAdmin;
  const seccion = seccionDeRuta(ruta);
  if (seccion === null || seccion === "administracion") return true;
  return tieneArea(accesos, seccion);
}

/** Áreas de trabajo que puede pedir: las que no tiene y no tiene ya pendientes. */
export function areasSolicitables(accesos: Accesos, pendientes: readonly Area[]): Area[] {
  if (accesos.esAdmin) return [];
  return AREAS.filter((a) => !accesos.areas.includes(a) && !pendientes.includes(a));
}
