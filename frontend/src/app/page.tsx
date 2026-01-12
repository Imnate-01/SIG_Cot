"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Search,
  ClipboardCheck,
  Users,
  ShieldCheck,
  BarChart3,
  Sparkles,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  desc,
  tone = "blue",
}: {
  icon: any;
  title: string;
  desc: string;
  tone?: "blue" | "indigo" | "emerald" | "slate";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-4">
        <div
          className={`h-12 w-12 rounded-2xl border flex items-center justify-center ${tones[tone]}`}
        >
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  desc,
}: {
  n: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold">
          {n}
        </div>
        <div>
          <div className="font-extrabold text-slate-900">{title}</div>
          <div className="mt-1 text-sm text-slate-600 leading-relaxed">
            {desc}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-100">
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 border-b border-slate-100 bg-white/75 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold shadow-sm">
              S
            </div>
            <div className="leading-tight">
              <div className="font-extrabold tracking-tight text-slate-900">
                SIG Cotizaciones
              </div>
              <div className="text-xs text-slate-500">
                Plataforma interna • Control y trazabilidad
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-blue-700 transition shadow-sm"
            >
              Solicitar acceso <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative overflow-hidden pt-32 pb-16 lg:pt-44 lg:pb-24">
        {/* background glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[1100px] rounded-full bg-blue-50 blur-3xl opacity-70 -z-10" />
        <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-indigo-50 blur-3xl opacity-70 -z-10" />

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-extrabold text-slate-600">
                <Sparkles size={14} className="text-blue-600" />
                Cotiza, da seguimiento y documenta sin perder el control
              </div>

              <h1 className="mt-6 text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
                Unifica tu flujo de{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  cotizaciones
                </span>{" "}
                en SIG
              </h1>

              <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
                Centraliza cotizaciones, clientes, órdenes de compra y documentos
                en una plataforma clara, rápida y auditable para equipos SAM /
                BackOffice.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 font-extrabold text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Entrar <ArrowRight size={18} />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-extrabold text-slate-900 border border-slate-200 hover:bg-slate-50 transition"
                >
                  Solicitar acceso
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Historial y trazabilidad
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Búsqueda rápida
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Documentación centralizada
                </span>
              </div>
            </div>

            {/* Visual mock */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 p-5 flex items-center justify-between">
                <div className="font-extrabold text-slate-900">Vista general</div>
                <div className="text-xs font-bold text-slate-500">
                  Estados • Clientes • PO • Documentos
                </div>
              </div>
              <div className="p-6 grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold">Cotización</div>
                    <span className="text-xs font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
                      En revisión
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Cliente • PO • partidas • totales • notas
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-white border border-slate-200 overflow-hidden">
                    <div className="h-full w-[62%] bg-slate-900" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      Búsquedas
                    </div>
                    <div className="mt-2 text-2xl font-extrabold">
                      Rápidas
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Folio, cliente, PO, palabra clave
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500">
                      Documentos
                    </div>
                    <div className="mt-2 text-2xl font-extrabold">
                      Central
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      PDF, evidencia y exportables
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 text-white p-4">
                  <div className="font-extrabold">Pensado para auditoría</div>
                  <div className="text-sm text-white/80 mt-1">
                    Cada cambio queda registrado para seguimiento y control.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES */}
      <section className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight">
              ¿Qué puedes hacer en SIG Cotizaciones?
            </h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Un landing moderno resume capacidades reales: creación, seguimiento,
              búsqueda y control documental.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={FileText}
              title="Cotizaciones centralizadas"
              desc="Crea, edita y mantiene histórico. Evita archivos sueltos y versiones perdidas."
              tone="blue"
            />
            <FeatureCard
              icon={Search}
              title="Búsqueda eficiente"
              desc="Encuentra por folio, cliente, PO o texto. Menos tiempo buscando, más operando."
              tone="slate"
            />
            <FeatureCard
              icon={ClipboardCheck}
              title="Seguimiento y estatus"
              desc="Controla el avance (revisión, enviada, aprobada, facturación, etc.) con claridad."
              tone="indigo"
            />
            <FeatureCard
              icon={Users}
              title="Gestión de clientes"
              desc="Datos fiscales y contactos consistentes para evitar errores en documentos."
              tone="emerald"
            />
            <FeatureCard
              icon={BarChart3}
              title="Visibilidad operativa"
              desc="Consulta pendientes, recientes y actividad del equipo para tomar decisiones."
              tone="slate"
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Control y trazabilidad"
              desc="Operación auditable: quién cambió qué, cuándo, y con qué contexto."
              tone="blue"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Flujo claro, sin fricción
            </h2>
            <p className="mt-3 text-slate-600 leading-relaxed">
              Un proceso simple y repetible para que el equipo trabaje igual,
              siempre.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Step
              n="1"
              title="Captura y estructura"
              desc="Registra información del cliente, partidas y condiciones en un formato consistente."
            />
            <Step
              n="2"
              title="Revisión y seguimiento"
              desc="Actualiza estatus y conserva el historial para evitar confusión y retrabajo."
            />
            <Step
              n="3"
              title="Documentación y cierre"
              desc="Genera documentos y centraliza evidencia para facturación, PO y auditoría."
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute -top-24 left-0 h-[420px] w-[420px] rounded-full bg-blue-600 blur-[120px] opacity-20" />
        <div className="mx-auto max-w-7xl px-6 text-center relative">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Listo para trabajar con control real
          </h2>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Accede a SIG Cotizaciones y mantén trazabilidad, búsqueda y documentación
            en un solo lugar.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 font-extrabold text-slate-900 hover:bg-slate-100 transition"
            >
              Iniciar sesión <ArrowRight size={18} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-7 py-3 font-extrabold text-white hover:bg-white/15 transition"
            >
              Solicitar acceso
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            © {new Date().getFullYear()} SIG Combibloc • SIG Cotizaciones
          </div>
          <div className="text-sm text-slate-500">Plataforma interna</div>
        </div>
      </footer>
    </div>
  );
}
