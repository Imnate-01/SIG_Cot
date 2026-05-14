"use client";

import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export interface WizardStep {
  id: number;
  label: string;
  sublabel: string;
  completed: boolean;
}

interface WizardSidebarProps {
  steps: WizardStep[];
  currentStep: number;
  folio?: string;
  clienteEmpresa?: string;
  onStepClick: (step: number) => void;
}

export function WizardSidebar({
  steps,
  currentStep,
  folio,
  clienteEmpresa,
  onStepClick
}: WizardSidebarProps) {
  return (
    <aside className="fsa-step-sidebar">
      {/* Header */}
      <div className="fsa-step-sidebar-header">
        <div className="fsa-step-sidebar-title">Food Safety Audit</div>
        <div className="fsa-step-sidebar-folio">{folio || "Nuevo reporte"}</div>
        {clienteEmpresa && (
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{clienteEmpresa}</div>
        )}
      </div>

      {/* Pasos */}
      <nav className="fsa-step-list">
        {steps.map((step) => {
          const isActive    = currentStep === step.id;
          const isCompleted = step.completed;
          const isPending   = !isCompleted && !isActive;

          return (
            <div
              key={step.id}
              onClick={() => isCompleted || isActive ? onStepClick(step.id) : undefined}
              className={`fsa-step-item ${isActive ? "active" : isCompleted ? "completed" : "pending"}`}
              style={{ cursor: isCompleted || isActive ? "pointer" : "default" }}
            >
              <div className={`fsa-step-badge ${isActive ? "active" : isCompleted ? "completed" : "pending"}`}>
                {isCompleted
                  ? <CheckCircle2 size={14} />
                  : isActive
                  ? step.id
                  : <Circle size={12} style={{ opacity: 0.4 }} />
                }
              </div>
              <div>
                <div className="fsa-step-label">{step.label}</div>
                <div className="fsa-step-sublabel">{step.sublabel}</div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Progreso en footer del sidebar */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 6 }}>
          PROGRESO GENERAL
        </div>
        <div className="fsa-progress-bar" style={{ marginBottom: 6 }}>
          <div
            className="fsa-progress-fill"
            style={{ width: `${Math.round((steps.filter(s => s.completed).length / steps.length) * 100)}%` }}
          />
        </div>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
          {steps.filter(s => s.completed).length} de {steps.length} pasos completados
        </div>
      </div>
    </aside>
  );
}
