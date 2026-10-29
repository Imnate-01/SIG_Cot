import type { Response } from 'express';

/** Error con código HTTP explícito (lánzalo desde servicios/controladores). */
export class ErrorHttp extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ErrorHttp';
  }
}

/** Reglas CHECK conocidas → mensaje que entiende el usuario (en vez del genérico). */
const REGLAS_CHECK: Array<[RegExp, string]> = [
  [/pm_expedientes_check/, 'The end date cannot be before the start date.'],
  [/pm_tareas_check/, 'A task can only have "completed by" once it is completed.'],
];

type ErrorConCodigo ={ code?: string; status?: number; message?: string; details?: string; hint?: string };

/**
 * Traduce errores de Postgres/PostgREST a respuestas HTTP con sentido.
 * Antes todo respondía 500 con el mensaje crudo de la base de datos.
 */
export function clasificarError(error: unknown): { status: number; mensaje: string } {
  if (error instanceof ErrorHttp) return { status: error.status, mensaje: error.message };

  const e = (error || {}) as ErrorConCodigo;
  switch (e.code) {
    case 'PGRST116': return { status: 404, mensaje: 'Registro no encontrado' };          // .single() sin filas
    case 'P0002':    return { status: 404, mensaje: e.message || 'Registro no encontrado' }; // raise de nuestras funciones
    case '23505':    return { status: 409, mensaje: 'El registro ya existe' };
    case '23503':    return { status: 409, mensaje: 'El registro está relacionado con otros datos' };
    case '23502':    return { status: 400, mensaje: 'Falta un dato obligatorio' };
    case '23514': {
      // Mensajes propios (raise ... errcode '23514' de nuestras funciones) se muestran tal cual
      if (e.message && !/violates check constraint/i.test(e.message)) return { status: 400, mensaje: e.message };
      const regla = REGLAS_CHECK.find(([patron]) => patron.test(`${e.message ?? ''} ${e.details ?? ''}`));
      return { status: 400, mensaje: regla ? regla[1] : 'Un dato no cumple las reglas permitidas' };
    }
    case '22P02':
    case '22003':
    case '22007':
    case '22023':    return { status: 400, mensaje: 'Datos con formato inválido' };
    case '42501':    return { status: 403, mensaje: 'Sin permiso para esta operación' };
  }
  if (e.status === 401) return { status: 401, mensaje: 'No autorizado' };
  return { status: 500, mensaje: 'Error interno del servidor' };
}

const EN_PRODUCCION = process.env.NODE_ENV === 'production';

/**
 * Responde un error de forma uniforme: { success: false, error, message }.
 * En desarrollo incluye `detalle` con el mensaje original para depurar;
 * en producción no se expone el mensaje interno de la base de datos.
 */
export function responderError(res: Response, error: unknown) {
  const { status, mensaje } = clasificarError(error);
  const original = (error as ErrorConCodigo)?.message;
  if (status >= 500) console.error('[error 500]', error);
  return res.status(status).json({
    success: false,
    error: mensaje,
    message: mensaje,
    ...(!EN_PRODUCCION && original && original !== mensaje ? { detalle: original } : {}),
  });
}
