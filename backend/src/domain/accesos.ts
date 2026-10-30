/**
 * Reglas de acceso por área del Service Operations Workspace (sin dependencias:
 * se prueban solas). Los datos vienen de `usuarios.es_admin_sistema` y de la
 * tabla `usuario_areas` (migración 20261029_01).
 *
 * "Administración" no es un área asignable: todos tienen su parte personal
 * (perfil, solicitudes, actividad) y solo los administradores del sistema
 * gestionan usuarios, áreas y solicitudes.
 */
export const AREAS = ['cotizaciones', 'mantenimiento', 'food_safety'] as const;
export type Area = (typeof AREAS)[number];

export interface Accesos {
  esAdmin: boolean;
  /** Áreas en las que puede trabajar (un administrador las tiene todas). */
  areas: Area[];
}

export const SIN_ACCESOS: Accesos = { esAdmin: false, areas: [] };

export function esArea(valor: unknown): valor is Area {
  return typeof valor === 'string' && (AREAS as readonly string[]).includes(valor);
}

/** Áreas válidas, sin repetir y en el orden fijo de AREAS. */
export function ordenarAreas(valores: readonly unknown[]): Area[] {
  return AREAS.filter((a) => valores.includes(a));
}

/** Lo que el usuario puede usar: un administrador tiene todas las áreas. */
export function accesosEfectivos(esAdmin: boolean, asignadas: readonly unknown[]): Accesos {
  return { esAdmin, areas: esAdmin ? [...AREAS] : ordenarAreas(asignadas) };
}

/** ¿Tiene al menos una de las áreas permitidas? */
export function puedeEntrar(accesos: Accesos, permitidas: readonly Area[]): boolean {
  return accesos.esAdmin || permitidas.some((a) => accesos.areas.includes(a));
}

/**
 * Valida la lista de áreas que envía el panel de administración.
 * Devuelve null si no es una lista o trae un área desconocida.
 */
export function leerAreas(valor: unknown): Area[] | null {
  if (!Array.isArray(valor) || !valor.every(esArea)) return null;
  return ordenarAreas(valor);
}

/** Diferencia entre las áreas actuales y las nuevas (para guardar y para la bitácora). */
export function cambiosDeAreas(actuales: readonly Area[], nuevas: readonly Area[]) {
  return {
    agregar: nuevas.filter((a) => !actuales.includes(a)),
    quitar: actuales.filter((a) => !nuevas.includes(a)),
  };
}

export const ESTADOS_SOLICITUD = ['pendiente', 'aprobada', 'rechazada'] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number];

/** Texto libre opcional (motivo o nota): recortado, máx. 500, vacío → null. */
export function textoOpcional(valor: unknown, max = 500): string | null {
  const t = String(valor ?? '').trim();
  if (!t) return null;
  return t.slice(0, max);
}

export interface UsuarioParaLista {
  id: string;
  nombre: string | null;
  email?: string | null;
  departamento?: string | null;
  rol?: string | null;
  activo?: boolean | null;
  es_admin_sistema?: boolean | null;
}

/**
 * Quién puede aparecer en las listas de un área (responsable, colaboradores,
 * SAM/FSE…): usuarios activos con esa área asignada, más los administradores
 * del sistema (que tienen todas). Devuelve también los activos que NO la
 * tienen, para que las sugerencias por historial no los vuelvan a ofrecer.
 */
export function separarPorArea(
  usuarios: readonly UsuarioParaLista[],
  filasAreas: ReadonlyArray<{ usuario_id: string; area: string }>,
  area: Area,
): { dentro: UsuarioParaLista[]; fuera: UsuarioParaLista[] } {
  const conArea = new Set(filasAreas.filter((f) => f.area === area).map((f) => f.usuario_id));
  const activos = usuarios.filter((u) => u.activo !== false);
  const dentro = activos.filter((u) => u.es_admin_sistema || conArea.has(u.id));
  const fuera = activos.filter((u) => !u.es_admin_sistema && !conArea.has(u.id));
  return { dentro, fuera };
}
