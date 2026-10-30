"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/routing";
import api from "@/services/api";
import { ETAPAS_ESTANDAR, etiquetaSemana, formatearFecha, sumarDias } from "@/features/pm/pm";
import { Campo, btnPrimario, btnSecundario, campo } from "@/features/pm/ui";
import { CampoSugerencias, SelectorBuscable } from "@/features/pm/Desplegable";
import {
  aplicarSugerencias, contactoSugerido, contactosDe, equipoAnterior, opcionesCliente, opcionesMaquina, opcionesPersona, opcionesPlanta,
  type ClienteAutollenado, type PmPrevio,
} from "@/features/pm/autollenado";

type ClienteOpcion = ClienteAutollenado;
interface UsuarioOpcion { id: string; nombre: string | null; email: string | null; departamento?: string | null }

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
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [previos, setPrevios] = useState<PmPrevio[]>([]);
  // Lo que se llenó solo: si el usuario no lo cambió, se puede reemplazar al cambiar cliente/planta
  const auto = useRef<Partial<Record<keyof typeof VACIO, string>>>({});
  const clientePedido = useRef("");

  useEffect(() => {
    api.get("/clientes")
      .then(({ data }) => setClientes(data.data || []))
      .catch(() => toast.error(t("customersLoadError")));
    api.get("/usuarios").then(({ data }) => setUsuarios(data.data || [])).catch(() => {});
  }, [t]);

  const cliente = useMemo(() => clientes.find((c) => String(c.id) === form.cliente_id), [clientes, form.cliente_id]);
  // Solo el catálogo de clientes de Estados Unidos
  const opcionesClientes = useMemo(() => opcionesCliente(clientes), [clientes]);
  const plantas = useMemo(() => opcionesPlanta(cliente), [cliente]);
  const maquinas = useMemo(() => opcionesMaquina(cliente, form.planta), [cliente, form.planta]);
  const contactos = useMemo(() => contactosDe(cliente, form.planta), [cliente, form.planta]);
  const personas = useMemo(() => ({
    sam: opcionesPersona(previos, "sam", usuarios),
    fse_filler: opcionesPersona(previos, "fse_filler", usuarios),
    fse_downline: opcionesPersona(previos, "fse_downline", usuarios),
  }), [previos, usuarios]);

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setValor = (k: keyof typeof VACIO) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const sugerir = (sugeridos: Partial<Record<keyof typeof VACIO, string>>) =>
    setForm((f) => {
      const r = aplicarSugerencias(f, auto.current, sugeridos);
      auto.current = r.auto;
      return r.form;
    });

  /**
   * Al elegir cliente (comentario 1): planta (si solo hay una), contacto de la planta
   * y SAM/FSE del último PM de ese cliente. Todo queda editable.
   */
  const elegirCliente = async (id: string) => {
    const c = clientes.find((x) => String(x.id) === id);
    setForm((f) => ({ ...f, cliente_id: id }));
    setPrevios([]);
    if (!c) return;
    const lista = opcionesPlanta(c);
    const planta = lista.length === 1 ? lista[0].valor : "";
    const maqs = opcionesMaquina(c, planta);
    const contacto = contactoSugerido(c, planta);
    sugerir({
      planta, linea: maqs.length === 1 ? maqs[0].valor : "",
      contacto_nombre: contacto.nombre, contacto_correo: contacto.correo, contacto_telefono: contacto.telefono,
    });
    clientePedido.current = id;
    try {
      const { data } = await api.get("/pm", { params: { cliente_id: id } });
      if (clientePedido.current !== id) return; // ya eligió otro cliente
      const pms: PmPrevio[] = data.data || [];
      setPrevios(pms);
      sugerir(equipoAnterior(pms));
    } catch { /* sin historial: no se sugiere equipo */ }
  };

  /** Al elegir una planta conocida se sugiere su contacto y, si tiene una sola máquina, esa. */
  const elegirPlanta = (planta: string) => {
    const contacto = contactoSugerido(cliente, planta);
    const maqs = opcionesMaquina(cliente, planta);
    sugerir({
      linea: maqs.length === 1 ? maqs[0].valor : "",
      contacto_nombre: contacto.nombre, contacto_correo: contacto.correo, contacto_telefono: contacto.telefono,
    });
  };

  /** Al elegir un contacto de la lista se llenan su correo y teléfono. */
  const elegirContacto = (nombre: string) => {
    const c = contactos.find((x) => x.nombre === nombre);
    if (c) setForm((f) => ({ ...f, contacto_nombre: c.nombre, contacto_correo: c.correo || f.contacto_correo, contacto_telefono: c.telefono || f.contacto_telefono }));
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
            <h2 className="mb-1 text-base font-bold text-black dark:text-white">{t("sectionCustomer")}</h2>
            <p className="mb-4 text-xs text-sig-muted">{t("autofillHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={`${t("fieldCustomer")} *`} className="sm:col-span-2">
                <SelectorBuscable
                  value={form.cliente_id} onChange={elegirCliente} opciones={opcionesClientes} icono="cliente"
                  placeholder={t("selectCustomer")} buscarPlaceholder={t("searchCustomer")} vacio={t("noCustomersFound")} ariaLabel={t("fieldCustomer")}
                />
              </Campo>
              <Campo label={t("fieldPlant")}>
                <CampoSugerencias value={form.planta} onChange={setValor("planta")} onElegir={elegirPlanta} opciones={plantas} placeholder={cliente && plantas.length ? t("pickOrType") : undefined} />
              </Campo>
              <Campo label={t("fieldLine")}>
                <CampoSugerencias value={form.linea} onChange={setValor("linea")} opciones={maquinas} placeholder={cliente && maquinas.length ? t("pickOrType") : undefined} />
              </Campo>
              <Campo label={t("fieldContact")}>
                <CampoSugerencias value={form.contacto_nombre} onChange={setValor("contacto_nombre")} onElegir={elegirContacto} opciones={contactos.map((c) => ({ valor: c.nombre, detalle: c.correo || c.telefono || undefined, icono: "contacto" as const }))} />
              </Campo>
              <Campo label={t("fieldPhone")}><input className={campo} type="tel" value={form.contacto_telefono} onChange={set("contacto_telefono")} /></Campo>
              <Campo label={t("fieldEmail")} className="sm:col-span-2"><input className={campo} type="email" value={form.contacto_correo} onChange={set("contacto_correo")} /></Campo>
            </div>
          </section>

          <section className="rounded border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 p-5">
            <h2 className="mb-1 text-base font-bold text-black dark:text-white">{t("sectionTeam")}</h2>
            <p className="mb-4 text-xs text-sig-muted">{previos.length > 0 ? t("teamFromPreviousPm") : t("teamHint")}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={t("fieldSam")}><CampoSugerencias value={form.sam} onChange={setValor("sam")} opciones={personas.sam} /></Campo>
              <Campo label={t("fieldPo")}><input className={campo} value={form.po_numero} onChange={set("po_numero")} /></Campo>
              <Campo label={t("fieldFseFiller")}><CampoSugerencias value={form.fse_filler} onChange={setValor("fse_filler")} opciones={personas.fse_filler} /></Campo>
              <Campo label={t("fieldFseDownline")}><CampoSugerencias value={form.fse_downline} onChange={setValor("fse_downline")} opciones={personas.fse_downline} /></Campo>
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
