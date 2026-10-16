import { describe, it, expect } from 'vitest';
import { buscarFirmante, puestoFirmante, imagenFirma, FIRMA_PREDETERMINADA, PUESTO_PREDETERMINADO } from './firmantes';

describe('firmantes', () => {
  it('reconoce firmantes por fragmento del nombre (sin importar mayúsculas)', () => {
    expect(buscarFirmante('EDUARDO Pérez')?.puesto).toBe('Back Office Manager');
    expect(buscarFirmante('John Santoyo')?.firma).toBe('/santoyo.png');
    expect(buscarFirmante('Jonh')?.puesto).toBe('Service Sales Manager');
    expect(buscarFirmante('Julio')).toBeUndefined();
    expect(buscarFirmante(null)).toBeUndefined();
  });
  it('puesto: firmante > puesto registrado > predeterminado', () => {
    expect(puestoFirmante('Eduardo', 'Analista')).toBe('Back Office Manager');
    expect(puestoFirmante('Julio', 'Ingeniero')).toBe('Ingeniero');
    expect(puestoFirmante('Julio', '')).toBe(PUESTO_PREDETERMINADO);
    expect(puestoFirmante(undefined)).toBe(PUESTO_PREDETERMINADO);
  });
  it('firma predeterminada para cualquier otro nombre', () => {
    expect(imagenFirma('Julio Ruiz')).toBe(FIRMA_PREDETERMINADA);
    expect(imagenFirma('')).toBe(FIRMA_PREDETERMINADA);
  });
});
