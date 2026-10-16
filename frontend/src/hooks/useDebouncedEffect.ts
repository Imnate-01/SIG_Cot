import { useEffect, type DependencyList } from "react";

/**
 * Ejecuta `effect` cuando `deps` dejan de cambiar durante `delayMs` (autosave).
 */
export function useDebouncedEffect(effect: () => void, deps: DependencyList, delayMs: number) {
  useEffect(() => {
    const t = setTimeout(() => effect(), delayMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delayMs]);
}
