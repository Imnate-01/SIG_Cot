/**
 * Devuelve un objeto nuevo solo con las llaves permitidas que vienen definidas.
 * Evita "mass assignment": que el cliente escriba columnas que no debería
 * (id, activo, creado_por, etc.) mandándolas en el body.
 */
export function pickFields<K extends string>(
  source: unknown,
  allowed: readonly K[],
): Partial<Record<K, unknown>> {
  const result: Partial<Record<K, unknown>> = {};
  if (!source || typeof source !== 'object') return result;
  const obj = source as Record<string, unknown>;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}
