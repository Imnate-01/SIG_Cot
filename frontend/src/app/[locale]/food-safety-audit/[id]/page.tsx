"use client";

import React, { useEffect, useState } from "react";
import { foodSafetyAuditApi } from "@/services/foodSafetyAudit";
import AuditWizard from "@/components/food-safety-audit/AuditWizard";
import { Loader2, AlertTriangle } from "lucide-react";
import "../fsa.css";

interface Props {
  params: Promise<{ id: string }>;
}

export default function FoodSafetyAuditDetailPage({ params }: Props) {
  const [id, setId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(p => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    foodSafetyAuditApi.get(Number(id))
      .then(res => {
        if (res.data?.success) setReport(res.data.data);
        else setError("No se encontró el reporte.");
      })
      .catch(e => setError(e.message || "Error al cargar el reporte."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 12, color: "#64748b" }}>
        <Loader2 size={24} className="animate-spin" />
        <span style={{ fontSize: 15, fontWeight: 600 }}>Cargando reporte de auditoría...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 12, color: "#dc2626" }}>
        <AlertTriangle size={32} />
        <span style={{ fontSize: 15, fontWeight: 600 }}>{error || "Reporte no encontrado."}</span>
      </div>
    );
  }

  return <AuditWizard report={report} />;
}
