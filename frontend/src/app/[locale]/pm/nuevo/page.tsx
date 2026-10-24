"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import api from "@/services/api";
import { ETAPAS_ESTANDAR, etiquetaSemana, formatearFecha, sumarDias } from "@/features/pm/pm";
import { Campo, btnPrimario, btnSecundario, campo } from "@/features/pm/ui";

interface ClienteOpcion {
  id: number;
  nombre: string;
  empresa?: string | null;
  contacto_nombre?: string | null;
  correo?: string | null;
  telefono?: string | null;
  cliente_direcciones?: Array<{ empresa_planta_nombre?: string | null }>;
}

const VACIO = {
  cliente_id: "", planta: "", linea: "", contacto_nombre: "", contacto_telefono: "", contacto_correo: "",
  sam: "", po_numero: "", fse_filler: "", fse_downline: "", fecha_inicio: "", fecha_fin: "",
};

const mensajeError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

/** Alta de un PM: al guardarlo se generan las 31 tareas con sus fechas límite. */
export default function PmNuevoPage() {
  const t = useTranslations("PM");
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api.get("/clientes")
      .then(({ data }) => setClientes(data.data || []))
      .catch(() => toast.error(t("customersLoadError")));
  }, [t]);

  const cliente = useMemo(() => clientes.find((c) => String(c.id) === form.cliente_id), [clientes, form.cliente_id]);
  const plantas = useMemo(
    () => [...new Set((cliente?.cliente_direcciones || []).map((d) => d.empresa_planta_nombre).filter((x): x is string => !!x))],
    [cliente],
  );
  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** Al elegir cliente se sugieren sus datos de contacto (editables). */
  const elegirCliente = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const c = clientes.find((x) => String(x.id) === e.target.value);
    setForm((f) => ({
      ...f,
      cliente_id: e.target.value,
      contacto_nombre: f.contacto_nombre || c?.contacto_nombre || "",
      contacto_correo: f.contacto_correo || c?.correo || "",
      contacto_telefono: f.contacto_telefono || c?.telefono || "",
    }));
  };

  const finInvalido = !!form.fecha_inicio && !!form.fecha_fin && form.fecha_fin < form.fecha_inicio;

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (finInvalido) return;
    setGuardando(true);
    try {
      const { data } = await api.post("/pm", { ...form, cliente_id: Number(form.cliente_id) });
      toast.success(t("created"));
      router.push(`/pm/${data.data.id}`);
    } catch (err) {
      toast.error(mensajeError(err, t("createError")));
      setGuardando(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Link href="/pm" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-sig-muted hover:text-black dark:hover:text-white">
        <ArrowLeft size={16} /> {t("backToList")}
      </Link>
      <h1 className="mb-6 text-3xl font-bold leading-tight text-black dark:text-white">{t("newPm")}</h1>

      <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <h2 className="mb-4 text-base font-bold text-black dark:text-white">{t("sectionCustomer")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={`${t("fieldCustomer")} *`} className="sm:col-span-2">
                <select required className={campo} value={form.cliente_id} onChange={elegirCliente}>
                  <option value="">{t("selectCustomer")}</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.empresa && c.empresa !== c.nombre ? ` — ${c.empresa}` : ""}</option>)}
                </select>
              </Campo>
              <Campo label={t("fieldPlant")}>
                <input className={campo} list="pm-plantas" value={form.planta} onChange={set("planta")} />
                <datalist id="pm-plantas">{plantas.map((p) => <option key={p} value={p} />)}</datalist>
              </Campo>
              <Campo label={t("fieldLine")}><input className={campo} value={form.linea} onChange={set("linea")} /></Campo>
              <Campo label={t("fieldContact")}><input className={campo} value={form.contacto_nombre} onChange={set("contacto_nombre")} /></Campo>
              <Campo label={t("fieldPhone")}><input className={campo} type="tel" value={form.contacto_telefono} onChange={set("contacto_telefono")} /></Campo>
              <Campo label={t("fieldEmail")} className="sm:col-span-2"><input className={campo} type="email" value={form.contacto_correo} onChange={set("contacto_correo")} /></Campo>
            </div>
          </section>

          <section className="rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <h2 className="mb-4 text-base font-bold text-black dark:text-white">{t("sectionTeam")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={t("fieldSam")}><input className={campo} value={form.sam} onChange={set("sam")} /></Campo>
              <Campo label={t("fieldPo")}><input className={campo} value={form.po_numero} onChange={set("po_numero")} /></Campo>
              <Campo label={t("fieldFseFiller")}><input className={campo} value={form.fse_filler} onChange={set("fse_filler")} /></Campo>
              <Campo label={t("fieldFseDownline")}><input className={campo} value={form.fse_downline} onChange={set("fse_downline")} /></Campo>
            </div>
          </section>

          <section className="rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <h2 className="mb-4 text-base font-bold text-black dark:text-white">{t("sectionDates")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={`${t("fieldStart")} *`}><input required type="date" className={campo} value={form.fecha_inicio} onChange={set("fecha_inicio")} /></Campo>
              <Campo label={t("fieldEnd")}>
                <input type="date" className={campo} min={form.fecha_inicio || undefined} value={form.fecha_fin} onChange={set("fecha_fin")} />
              </Campo>
            </div>
            {finInvalido && <p className="mt-2 text-sm font-semibold text-sig-danger" role="alert">{t("endBeforeStart")}</p>}
          </section>

          <div className="flex justify-end gap-3">
            <Link href="/pm" className={btnSecundario}>{t("cancel")}</Link>
            <button type="submit" className={btnPrimario} disabled={guardando || finInvalido || !form.cliente_id || !form.fecha_inicio}>
              {guardando && <Loader2 size={16} className="animate-spin" />} {t("createPm")}
            </button>
          </div>
        </div>

        <aside className="h-fit rounded border border-sig-line dark:border-zinc-700 bg-sig-sand dark:bg-zinc-900 p-5 lg:sticky lg:top-6">
          <h2 className="text-base font-bold text-black dark:text-white">{t("previewTitle")}</h2>
          <p className="mb-4 mt-1 text-xs text-sig-muted">{form.fecha_inicio ? t("previewBody") : t("previewEmpty")}</p>
          <ol>
            {ETAPAS_ESTANDAR.map((e, i) => {
              const ultima = i === ETAPAS_ESTANDAR.length - 1;
              const diaPm = e.semanas === 0;
              return (
                <li key={e.nombre} className="grid grid-cols-[52px_minmax(0,1fr)] gap-3">
                  <div className={`pt-0.5 text-right text-xs font-bold tabular-nums ${diaPm ? "text-sig-blue" : "text-black dark:text-white"}`}>{etiquetaSemana(e.semanas)}</div>
                  <div className={`relative pl-6 ${ultima ? "" : "pb-4"}`}>
                    {!ultima && <span className="absolute bottom-0 left-[6px] top-4 w-px bg-sig-line-strong dark:bg-zinc-600" aria-hidden />}
                    <span className={`absolute left-0 top-1 h-3.5 w-3.5 border-2 ${diaPm ? "rotate-45 rounded-[2px] border-sig-blue bg-sig-blue-soft" : "rounded-full border-sig-line-strong bg-white dark:bg-zinc-900"}`} aria-hidden />
                    <div className="flex items-start justify-between gap-2 text-sm">
                      <span className="font-semibold text-black dark:text-white">{e.nombre}</span>
                      <span className="whitespace-nowrap font-semibold tabular-nums text-black dark:text-white">{form.fecha_inicio ? formatearFecha(sumarDias(form.fecha_inicio, e.semanas * 7)) : "—"}</span>
                    </div>
                    <div className="text-xs text-sig-muted">{t("tasksCount", { count: e.tareas })}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </aside>
      </form>
    </div>
  );
}
