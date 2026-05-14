-- =============================================================
-- RLS (Row Level Security) — Módulo Food Safety Audit
-- Ejecutar en el Editor SQL de Supabase
-- =============================================================

-- 1. Activar RLS en todas las tablas del módulo FSA
ALTER TABLE food_safety_audit_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_cop_findings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_evidence_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_section_params        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_cip_flows             ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 2. Políticas para food_safety_audit_reports
--    Solo el auditor propietario puede ver/editar/eliminar sus reportes
-- =============================================================
CREATE POLICY "fsa_reports_owner_select" ON food_safety_audit_reports
  FOR SELECT USING (auditor_id = auth.uid());

CREATE POLICY "fsa_reports_owner_insert" ON food_safety_audit_reports
  FOR INSERT WITH CHECK (auditor_id = auth.uid());

CREATE POLICY "fsa_reports_owner_update" ON food_safety_audit_reports
  FOR UPDATE USING (auditor_id = auth.uid());

CREATE POLICY "fsa_reports_owner_delete" ON food_safety_audit_reports
  FOR DELETE USING (auditor_id = auth.uid());

-- =============================================================
-- 3. Políticas para audit_cop_findings
--    Accesible si el reporte padre pertenece al usuario
-- =============================================================
CREATE POLICY "fsa_cop_owner_select" ON audit_cop_findings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_cop_findings.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_cop_owner_insert" ON audit_cop_findings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_cop_findings.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_cop_owner_update" ON audit_cop_findings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_cop_findings.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_cop_owner_delete" ON audit_cop_findings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_cop_findings.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

-- =============================================================
-- 4. Políticas para audit_evidence_images
-- =============================================================
CREATE POLICY "fsa_images_owner_select" ON audit_evidence_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_evidence_images.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_images_owner_insert" ON audit_evidence_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_evidence_images.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_images_owner_update" ON audit_evidence_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_evidence_images.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_images_owner_delete" ON audit_evidence_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_evidence_images.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

-- =============================================================
-- 5. Políticas para audit_section_params y audit_cip_flows
-- =============================================================
CREATE POLICY "fsa_params_owner_all" ON audit_section_params
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_section_params.audit_id
        AND r.auditor_id = auth.uid()
    )
  );

CREATE POLICY "fsa_cip_owner_all" ON audit_cip_flows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM food_safety_audit_reports r
      WHERE r.id = audit_cip_flows.audit_id
        AND r.auditor_id = auth.uid()
    )
  );
