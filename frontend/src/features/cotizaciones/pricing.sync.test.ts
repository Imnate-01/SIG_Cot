/**
 * El módulo de precios existe en frontend y backend. Esta prueba falla si las
 * dos copias dejan de ser idénticas (solo corre cuando el backend está en el
 * mismo repositorio, p. ej. en local).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const frontendFile = resolve(__dirname, 'pricing.ts');
const backendFile = resolve(__dirname, '../../../../backend/src/domain/pricing.ts');

describe.skipIf(!existsSync(backendFile))('pricing: copias sincronizadas', () => {
  it('frontend y backend tienen el mismo pricing.ts', () => {
    const normalizar = (s: string) => s.replace(/\r\n/g, '\n');
    expect(normalizar(readFileSync(backendFile, 'utf8'))).toBe(normalizar(readFileSync(frontendFile, 'utf8')));
  });
});
