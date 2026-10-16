/**
 * Helpers para llamar funciones de Postgres (RPC) con un camino de respaldo.
 *
 * Las funciones atómicas viven en supabase/migrations/. Si el backend se
 * despliega antes de aplicar la migración, PostgREST responde PGRST202
 * ("función no encontrada") y usamos la implementación anterior.
 */
type ErrorPostgrest = { code?: string; message?: string } | null | undefined;

export function esFuncionNoDisponible(error: ErrorPostgrest): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || /could not find the function/i.test(error.message || '');
}

const avisados = new Set<string>();

/** Avisa UNA vez por proceso que falta aplicar la migración. */
export function avisarMigracionPendiente(funcion: string) {
  if (avisados.has(funcion)) return;
  avisados.add(funcion);
  console.warn(
    `[migración pendiente] La función ${funcion}() no existe en la base de datos; ` +
      'se usa el camino anterior (NO atómico). Aplica supabase/migrations/20261016_01_rpc_escrituras_atomicas.sql',
  );
}

/** Escapa %, _ y \ para usar un texto literal dentro de LIKE/ILIKE. */
export function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
