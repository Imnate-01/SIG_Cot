import api from "./api";

const BASE = '/food-safety-audit';

export interface PersonInCharge {
  nombre: string;
  puesto: string;
  empresa: string;
}

export interface AuthorizationParty {
  nombre: string;
  puesto: string;
  empresa: string;
  firma_url?: string;
}

export interface CreateAuditDto {
  cliente_empresa: string;
  fecha_auditoria: string;
  location_of_audit: string;
  llenadora: string;
  llenadora_serial: string;
  llenadora_horas_op?: number | null;
  personas_a_cargo: PersonInCharge[];
  autorizacion_sig: AuthorizationParty;
  autorizacion_cliente: AuthorizationParty;
}

export const foodSafetyAuditApi = {
  list:    ()                              => api.get(`${BASE}/listado`),
  get:     (id: number)                   => api.get(`${BASE}/${id}`),
  create:  (data: CreateAuditDto)         => api.post(`${BASE}`, data),
  update:  (id: number, data: Partial<CreateAuditDto>) => api.put(`${BASE}/${id}`, data),
  saveWizard:(id: number, data: any)              => api.put(`${BASE}/${id}/wizard`, data),
  pdf:     (id: number)                   => api.get(`${BASE}/${id}/pdf`, { responseType: 'blob' }),
  delete:  (id: number)                   => api.delete(`${BASE}/${id}`),

  // ── Imágenes de evidencia ──
  images: {
    list: (auditId: number, cop_finding_id?: number) =>
      api.get(`${BASE}/${auditId}/images`, { params: cop_finding_id ? { cop_finding_id } : {} }),

    upload: (auditId: number, formData: FormData) =>
      api.post(`${BASE}/${auditId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),

    updateCaption: (auditId: number, imgId: number, caption: string, orden?: number) =>
      api.patch(`${BASE}/${auditId}/images/${imgId}`, { caption, orden }),

    delete: (auditId: number, imgId: number) =>
      api.delete(`${BASE}/${auditId}/images/${imgId}`),
  },
};

