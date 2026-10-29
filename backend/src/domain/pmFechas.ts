/**
 * Orden seguro para guardar fechas de un PM.
 *
 * La tabla exige fecha_fin >= fecha_inicio en cada UPDATE. El inicio se cambia
 * con la función pm_cambiar_fecha_inicio (recalcula tareas) y el fin con un
 * UPDATE normal, así que hay dos pasos. Si el nuevo inicio cae después del fin
 * anterior, guardar primero el inicio rompe la regla (era el error de la
 * revisión: "Un dato no cumple las reglas permitidas"); en ese caso va primero el fin.
 */
export function ordenGuardadoFechas(finAnterior: string | null, nuevoInicio: string | null): 'fin_primero' | 'inicio_primero' {
  return nuevoInicio && finAnterior && nuevoInicio > finAnterior ? 'fin_primero' : 'inicio_primero'
}
