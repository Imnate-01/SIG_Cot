/**
 * Tipos del formulario de cotizaciones (compartidos por crear, editar y el PDF).
 */

export interface Proveedor { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; rfc?: string; }
export interface FacturarA { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
export interface ShipTo { nombre: string; direccion: string; colonia: string; ciudad: string; cp: string; }
export interface Contacto { nombre: string; email: string; telefono: string; }
export interface Condiciones { precios: string; moneda: string; maquina: string; observaciones: string; entidad?: "MX" | "US" | "CA"; scopeOfVisit?: string; equipmentToService?: string; paymentTerms?: string; tituloServiciosExternos?: string; }
export interface CotizacionFormData {
  proveedor: Proveedor;
  facturarA: FacturarA;
  shipTo: ShipTo;
  shipToMismoQueFacturar: boolean;
  contactoPrincipal: Contacto;
  contactoSecundario: Contacto;
  condiciones: Condiciones;
  descripcion: string;
  tipo_servicio: string;
}
export interface ClienteDireccion {
  id: string | number;
  tipo: "sold_to" | "ship_to";
  empresa_planta_nombre: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  cp: string;
  contacto_nombre: string;
  contacto_correo: string;
  contacto_telefono: string;
}

export interface ClienteMaquina {
  id: string | number;
  modelo_maquina: string;
  serie: string;
  machine_id: string;
  direccion_id?: number | null;
}

export interface ClientePredefinido {
  id: string | number;
  nombre: string;
  empresa?: string;
  contacto_nombre?: string;
  correo?: string;
  telefono?: string;
  direccion: string;
  colonia: string;
  ciudad: string;
  cp: string;
  pais?: string;
  cliente_direcciones?: ClienteDireccion[];
  cliente_maquinas?: ClienteMaquina[];
}

export interface UsuarioRegistrado { id: string; nombre: string; email: string; telefono: string; puesto?: string; departamento?: string; }

export interface Tarifa {
  id: string | number;
  concepto: string;
  unidad: "hora" | "dia";
  precio_sin_contrato: number;
  precio_con_contrato: number;
  moneda?: string;
  requiere_desglose?: boolean;
  categoria?: string;
}

export interface DesgloseIngeniero { uid: string; nombre: string; horas: number; }
export interface ServicioTarifado { id: number; tarifaId: string; ingenieros: number; cantidad: number; conContrato: boolean; detalles?: string; desglose: DesgloseIngeniero[]; total: number; esPrecioManual?: boolean; precioManual?: number; }

/** Fila de la tabla libre de servicios externos / entrenamientos (formulario). */
export interface ServicioExternoForm { id: number; detalle: string; cantidad: number | string; precioUnitario: number | string; }
