"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Building2, Cpu, User, Users, BadgeCheck, Plus, Trash2, ArrowLeft } from "lucide-react";
import { foodSafetyAuditApi } from "@/services/foodSafetyAudit";
import { AuditCoverPage, PersonInCharge } from "@/types/foodSafetyAudit";
import "../fsa.css";

const DEFAULT_COVER: AuditCoverPage = {
  cliente_empresa: "",
  fecha_auditoria: "",
  location_of_audit: "",
  llenadora: "",
  llenadora_serial: "",
  llenadora_horas_op: null,
  personas_a_cargo: [{ nombre: "", puesto: "", empresa: "" }],
  autorizacion_sig: { nombre: "", puesto: "", empresa: "SIG Combibloc México" },
  autorizacion_cliente: { nombre: "", puesto: "", empresa: "" }
};

function PersonRow({
  person, index, onChange, onRemove, showRemove
}: {
  person: PersonInCharge;
  index: number;
  onChange: (p: PersonInCharge) => void;
  onRemove: () => void;
  showRemove: boolean;
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
      gap: 12, alignItems: "end",
      background: "#f8fafc", border: "1.5px solid #e2e8f0",
      borderRadius: 10, padding: "14px 16px",
      borderLeft: "4px solid #16a34a"
    }}>
      <div>
        <label className="fsa-label">Nombre *</label>
        <input className="fsa-input" type="text" required value={person.nombre}
          onChange={e => onChange({ ...person, nombre: e.target.value })}
          placeholder="Ej: Abraham Cabrera" />
      </div>
      <div>
        <label className="fsa-label">Puesto *</label>
        <input className="fsa-input" type="text" required value={person.puesto}
          onChange={e => onChange({ ...person, puesto: e.target.value })}
          placeholder="Ej: Quality Specialist" />
      </div>
      <div>
        <label className="fsa-label">Empresa *</label>
        <input className="fsa-input" type="text" required value={person.empresa}
          onChange={e => onChange({ ...person, empresa: e.target.value })}
          placeholder="Ej: SIG Combibloc México" />
      </div>
      {showRemove && (
        <button type="button" onClick={onRemove}
          style={{
            border: "none", background: "#fee2e2", color: "#dc2626",
            borderRadius: 8, width: 36, height: 36, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
            flexShrink: 0, marginBottom: 1
          }}
          title="Eliminar"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      marginBottom: 20
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: "linear-gradient(135deg, #dcfce7, #bbf7d0)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#15803d", flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default function NewFoodSafetyAuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState<AuditCoverPage>(DEFAULT_COVER);

  useEffect(() => {
    const userData = localStorage.getItem("user_data") || localStorage.getItem("user");
    if (userData) {
      try {
        const u = JSON.parse(userData);
        const nombre = u.nombre || u.user_metadata?.full_name || u.email?.split("@")[0] || "Auditor";
        setFormData(prev => ({
          ...prev,
          personas_a_cargo: [{ nombre, puesto: "Auditor", empresa: "SIG Combibloc México" }]
        }));
      } catch { /* silencioso */ }
    }
    const now = new Date();
    const month = now.toLocaleString("es-MX", { month: "long" });
    const year = now.getFullYear();
    const dateStr = `${month.charAt(0).toUpperCase() + month.slice(1)}, ${year}`;
    setFormData(prev => ({ ...prev, fecha_auditoria: dateStr }));
  }, []);

  const set = (field: keyof AuditCoverPage, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const addPerson = () =>
    setFormData(prev => ({ ...prev, personas_a_cargo: [...prev.personas_a_cargo, { nombre: "", puesto: "", empresa: "" }] }));

  const removePerson = (i: number) =>
    setFormData(prev => ({ ...prev, personas_a_cargo: prev.personas_a_cargo.filter((_, j) => j !== i) }));

  const updatePerson = (i: number, val: PersonInCharge) => {
    const arr = [...formData.personas_a_cargo];
    arr[i] = val;
    setFormData(prev => ({ ...prev, personas_a_cargo: arr }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await foodSafetyAuditApi.create(formData as any);
      if (res.data?.success && res.data?.data?.id) {
        router.push(`/food-safety-audit/${res.data.data.id}`);
      } else {
        setErrorMsg("No se pudo crear el reporte.");
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* ── Top bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "14px 40px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/food-safety-audit")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>
            <ArrowLeft size={14} /> Volver
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #14532d, #16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <ShieldCheck size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Nuevo Food Safety Audit</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Paso 0 de 6 — Datos generales del reporte</div>
            </div>
          </div>
        </div>
        {/* Progress pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {["Portada","COP","Dedusting","H₂O₂","Preheat","CIP","Misc"].map((s, i) => (
            <div key={s} style={{
              padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: i === 0 ? "#16a34a" : "#e2e8f0",
              color: i === 0 ? "#fff" : "#94a3b8"
            }}>{s}</div>
          ))}
        </div>
      </div>

      {/* ── Formulario ── */}
      <form onSubmit={handleSubmit} style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 120px" }}>
        {errorMsg && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10,
            padding: "12px 16px", color: "#dc2626", fontSize: 13, marginBottom: 24
          }}>
            {errorMsg}
          </div>
        )}

        {/* SECCIÓN 1: Datos del cliente */}
        <div className="fsa-section-card" style={{ marginBottom: 24 }}>
          <div className="fsa-section-card-body">
            <SectionHeader icon={<Building2 size={20} />} title="Información del Cliente" subtitle="Datos de la empresa auditada y ubicación de la auditoría" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="fsa-label">Client *</label>
                <input className="fsa-input" type="text" required value={formData.cliente_empresa}
                  onChange={e => set("cliente_empresa", e.target.value)} placeholder="Ej: Alpura, Cuautitlán" />
              </div>
              <div>
                <label className="fsa-label">Date of audit *</label>
                <input className="fsa-input" type="text" required value={formData.fecha_auditoria}
                  onChange={e => set("fecha_auditoria", e.target.value)} placeholder="Ej: Noviembre, 2025" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="fsa-label">Location of audit *</label>
                <input className="fsa-input" type="text" required value={formData.location_of_audit}
                  onChange={e => set("location_of_audit", e.target.value)} placeholder="Ej: Cuautitlán Izcalli, Estado de México" />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: Llenadora */}
        <div className="fsa-section-card" style={{ marginBottom: 24 }}>
          <div className="fsa-section-card-body">
            <SectionHeader icon={<Cpu size={20} />} title="Llenadora" subtitle="Identificación del equipo auditado" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="fsa-label">Filling machine type *</label>
                <input className="fsa-input" type="text" required value={formData.llenadora}
                  onChange={e => set("llenadora", e.target.value)} placeholder="Ej: CFA 1824-37" />
              </div>
              <div>
                <label className="fsa-label">Serial number *</label>
                <input className="fsa-input" type="text" required value={formData.llenadora_serial}
                  onChange={e => set("llenadora_serial", e.target.value)} placeholder="Ej: 874251005" />
              </div>
              <div>
                <label className="fsa-label">Operating hours</label>
                <input className="fsa-input" type="number" step="0.01"
                  value={formData.llenadora_horas_op ?? ""}
                  onChange={e => set("llenadora_horas_op", e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="Opcional" style={{ textAlign: "center", fontFamily: "monospace" }} />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: Personas a cargo */}
        <div className="fsa-section-card" style={{ marginBottom: 24 }}>
          <div className="fsa-section-card-body">
            <SectionHeader icon={<Users size={20} />} title="Persons in charge conducting the audit" subtitle="Mínimo una persona requerida" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              {formData.personas_a_cargo.map((p, i) => (
                <PersonRow key={i} person={p} index={i}
                  onChange={val => updatePerson(i, val)}
                  onRemove={() => removePerson(i)}
                  showRemove={formData.personas_a_cargo.length > 1} />
              ))}
            </div>
            <button type="button" onClick={addPerson} style={{
              display: "flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: "#16a34a",
              background: "#f0fdf4", border: "1.5px solid #bbf7d0",
              borderRadius: 8, padding: "8px 16px", cursor: "pointer"
            }}>
              <Plus size={16} /> Agregar otra persona
            </button>
          </div>
        </div>

        {/* SECCIÓN 4: Autorización SIG */}
        <div className="fsa-section-card" style={{ marginBottom: 24 }}>
          <div className="fsa-section-card-body">
            <SectionHeader icon={<BadgeCheck size={20} />} title="Authorization SIG Combibloc" subtitle="Responsable por parte de SIG que avala el reporte" />
            <PersonRow person={formData.autorizacion_sig} index={0}
              onChange={val => set("autorizacion_sig", val)}
              onRemove={() => {}} showRemove={false} />
          </div>
        </div>

        {/* SECCIÓN 5: Autorización Cliente */}
        <div className="fsa-section-card" style={{ marginBottom: 24 }}>
          <div className="fsa-section-card-body">
            <SectionHeader icon={<User size={20} />} title="Authorization Client" subtitle="Responsable por parte del cliente que recibe y firma el reporte" />
            <PersonRow person={formData.autorizacion_cliente} index={0}
              onChange={val => set("autorizacion_cliente", val)}
              onRemove={() => {}} showRemove={false} />
          </div>
        </div>
      </form>

      {/* ── Footer fijo de acciones ── */}
      <div className="fsa-wizard-footer">
        <button
          type="button"
          className="fsa-btn-secondary"
          onClick={() => router.push("/food-safety-audit")}
        >
          <ArrowLeft size={16} /> Cancelar
        </button>
        <button
          className="fsa-btn-primary"
          onClick={handleSubmit as any}
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar y Continuar"}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
