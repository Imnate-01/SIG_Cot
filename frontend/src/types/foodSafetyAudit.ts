export type AuditStatus = 'borrador' | 'en_revision' | 'finalizado';

export type AuditSectionKey =
  | 'dedusting'
  | 'sterile_air'
  | 'h2o2'
  | 'preheating'
  | 'sst'
  | 'cip'
  | 'misc';

export type CopSection =
  | 'alimentacion_envase' | 'magazine' | 'dedusting'
  | 'preheating_drying'   | 'llenado'  | 'ultrasonido'
  | 'mesa_salida'         | 'cadena_celdas'
  | 'bloque_valvulas'     | 'areas_circundantes';

export interface EvidenceImage {
  id: number;
  url_thumbnail: string;
  url_report: string;
  caption: string;
  orden: number;
}

export interface CopFinding {
  id: number;
  seccion_cop: CopSection;
  cam_on: number | null;
  cam_off: number | null;
  descripcion: string;
  tiene_falla: boolean;
  images: EvidenceImage[];
}

export interface SectionParam {
  id: number;
  feature: string;
  unidad: string;
  valor_hh: number;
  valor_hs: number;
  valor_sp: number;
  valor_l: number;
  valor_ll: number;
  ultimo_valor: number | null;
  valor_actual: number | null;
  dentro_rango: boolean;
  observacion: string;
  track: number | null;
}

export interface PersonInCharge {
  nombre:  string;
  puesto:  string;
  empresa: string;
}

export interface AuthorizationParty {
  nombre:  string;
  puesto:  string;
  empresa: string;
  firma_url?: string;
}

export interface AuditCoverPage {
  cliente_empresa:          string;
  fecha_auditoria:          string;
  location_of_audit:        string;
  llenadora:                string;
  llenadora_serial:         string;
  llenadora_horas_op:       number | null;
  personas_a_cargo:         PersonInCharge[];
  autorizacion_sig:         AuthorizationParty;
  autorizacion_cliente:     AuthorizationParty;
}

export interface CipFlow {
  id: number;
  paso: 'pre_rinsing' | 'otros';
  track: number;
  cabezal: number;
  tipo_cabezal: string;
  flujo_ml_s: number;
  volumen_total_hmi: number;
  volumen_total_cip: number;
}

export interface AuditReport {
  id: number;
  folio: string;
  llenadora: string;
  cliente_empresa: string;
  planta: string;
  auditor_id: number;
  auditor_nombre: string;
  estado: AuditStatus;
  fecha_auditoria: string;
  cop_findings: CopFinding[];
  params: Record<AuditSectionKey, SectionParam[]>;
  cip_flows: CipFlow[];
  observaciones_gen: string;
  created_at: string;
}
