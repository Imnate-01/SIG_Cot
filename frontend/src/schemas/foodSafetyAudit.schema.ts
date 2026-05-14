import { z } from 'zod';

const PersonSchema = z.object({
  nombre:  z.string().min(2, 'El nombre es requerido'),
  puesto:  z.string().min(2, 'El puesto es requerido'),
  empresa: z.string().min(2, 'La empresa es requerida'),
});

export const CoverPageSchema = z.object({
  cliente_empresa:      z.string().min(2, 'El cliente es requerido'),
  fecha_auditoria:      z.string().min(4, 'La fecha es requerida'),
  location_of_audit:    z.string().min(5, 'La ubicación es requerida'),
  llenadora:            z.string().min(2, 'El tipo de llenadora es requerido'),
  llenadora_serial:     z.string().min(1, 'El número de serie es requerido'),
  llenadora_horas_op:   z.number().positive().nullable().optional(),
  personas_a_cargo:     z.array(PersonSchema).min(1, 'Al menos una persona a cargo es requerida'),
  autorizacion_sig:     PersonSchema,
  autorizacion_cliente: PersonSchema,
});
