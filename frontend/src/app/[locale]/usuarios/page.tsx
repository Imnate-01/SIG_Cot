"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, KeyRound, Loader2, Pencil, Plus, Search, ShieldAlert, UserCheck, UserX, X } from "lucide-react";
import api from "@/services/api";

/**
 * Administración de usuarios: crear cuentas (ya confirmadas, con contraseña
 * temporal), restablecer contraseñas, cambiar rol/departamento y desactivar.
 * Solo para los roles de ROLES_ADMIN_USUARIOS (backend).
 */
interface UsuarioAdmin {
  id: string;
  nombre: string | null;
  email: string;
  rol: string | null;
  departamento: string | null;
  activo: boolean | null;
  email_confirmado: boolean;
  ultimo_acceso: string | null;
}

interface FormUsuario { nombre: string; email: string; departamento: string; rol: string; password: string }
const FORM_VACIO: FormUsuario = { nombre: "", email: "", departamento: "", rol: "vendedor", password: "" };

const mensajeError = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const campo = "h-10 w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm text-black dark:text-white outline-none focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]";
const btnPrimario = "inline-flex h-9 items-center justify-center gap-2 rounded bg-sig-blue px-4 text-sm font-semibold text-white hover:bg-sig-blue-hover disabled:opacity-60";
const btnSecundario = "inline-flex h-9 items-center justify-center gap-2 rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 text-sm font-semibold text-black dark:text-white hover:bg-sig-sand dark:hover:bg-zinc-700 disabled:opacity-60";

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-md border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="flex items-center justify-between border-b border-sig-line dark:border-zinc-700 px-5 py-4">
          <h2 className="text-lg font-bold text-black dark:text-white">{titulo}</h2>
          <button onClick={onClose} className="rounded p-1 text-sig-muted hover:bg-sig-sand dark:hover:bg-zinc-800" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const t = useTranslations("Usuarios");
  const [permiso, setPermiso] = useState<"cargando" | "si" | "no">("cargando");
  const [mensajePermiso, setMensajePermiso] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm] = useState<FormUsuario>(FORM_VACIO);
  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", rol: "", departamento: "" });
  const [credenciales, setCredenciales] = useState<{ email: string; password: string; nuevo: boolean } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      const { data } = await api.get("/admin/usuarios");
      setUsuarios(data.data || []);
      setPermiso("si");
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setPermiso("no");
        setMensajePermiso(mensajeError(e, ""));
      } else {
        setPermiso("si");
        toast.error(t("errorLoad"), { description: mensajeError(e, "") });
      }
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { cargar(); }, [cargar]);

  const rolesExistentes = useMemo(
    () => Array.from(new Set(usuarios.map((u) => (u.rol || "").trim()).filter(Boolean))).sort(),
    [usuarios],
  );

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return !q || [u.nombre, u.email, u.rol, u.departamento].some((v) => (v || "").toLowerCase().includes(q));
  });

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.departamento.trim()) return toast.error(t("errorRequired"));
    if (!form.email.trim().toLowerCase().endsWith("@sig.biz")) return toast.error(t("errorDomain"));
    if (form.password && form.password.length < 8) return toast.error(t("errorMinLength"));
    try {
      setGuardando(true);
      const { data } = await api.post("/admin/usuarios", form);
      setModalNuevo(false);
      setForm(FORM_VACIO);
      setCredenciales({ email: data.data.email, password: data.data.password_temporal, nuevo: true });
      cargar();
    } catch (err) {
      toast.error(t("errorCreate"), { description: mensajeError(err, "") });
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async (u: UsuarioAdmin) => {
    if (!window.confirm(t("confirmReset", { email: u.email }))) return;
    try {
      const { data } = await api.post(`/admin/usuarios/${u.id}/password`, {});
      setCredenciales({ email: u.email, password: data.data.password_temporal, nuevo: false });
    } catch (err) {
      toast.error(t("errorReset"), { description: mensajeError(err, "") });
    }
  };

  const cambiarActivo = async (u: UsuarioAdmin) => {
    const activar = u.activo === false;
    if (!activar && !window.confirm(t("confirmDeactivate", { email: u.email }))) return;
    try {
      await api.patch(`/admin/usuarios/${u.id}`, { activo: activar });
      toast.success(activar ? t("activated") : t("deactivated"));
      cargar();
    } catch (err) {
      toast.error(t("errorUpdate"), { description: mensajeError(err, "") });
    }
  };

  const guardarEdicion = async (e: FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    try {
      setGuardando(true);
      await api.patch(`/admin/usuarios/${editando.id}`, formEdit);
      setEditando(null);
      toast.success(t("updated"));
      cargar();
    } catch (err) {
      toast.error(t("errorUpdate"), { description: mensajeError(err, "") });
    } finally {
      setGuardando(false);
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard?.writeText(texto).then(() => toast.success(t("copied"))).catch(() => toast.error(t("copyError")));
  };

  const fecha = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");

  if (permiso === "no") {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 p-8">
        <div className="mx-auto max-w-xl rounded-md border border-sig-line dark:border-zinc-700 p-8">
          <ShieldAlert className="text-sig-warning" size={32} />
          <h1 className="mt-4 text-2xl font-bold text-black dark:text-white">{t("noPermissionTitle")}</h1>
          <p className="mt-2 text-sm text-sig-muted">{mensajePermiso || t("noPermissionDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold leading-tight text-black dark:text-white">{t("title")}</h1>
            <p className="mt-1 text-sm text-sig-muted">{t("subtitle")}</p>
          </div>
          <button onClick={() => { setForm(FORM_VACIO); setModalNuevo(true); }} className={btnPrimario}><Plus size={16} /> {t("newUser")}</button>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-sig-muted" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t("search")} className={`${campo} pl-9 bg-sig-sand dark:bg-zinc-800 border-sig-line`} />
        </div>

        {cargando ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sig-blue" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-sig-muted">
                  {[t("colName"), t("colRole"), t("colDept"), t("colLastAccess"), t("colStatus"), ""].map((h, i) => (
                    <th key={i} className="border-b border-black dark:border-zinc-500 pb-2 pr-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.id} className="border-b border-sig-line dark:border-zinc-800 align-middle">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-black dark:text-white">{u.nombre || "—"}</div>
                      <div className="text-xs text-sig-muted">{u.email}</div>
                    </td>
                    <td className="py-3 pr-4 text-black dark:text-gray-200">{u.rol || "—"}</td>
                    <td className="py-3 pr-4 text-black dark:text-gray-200">{u.departamento || "—"}</td>
                    <td className="py-3 pr-4 text-sig-muted whitespace-nowrap">{fecha(u.ultimo_acceso)}</td>
                    <td className="py-3 pr-4">
                      {u.activo === false ? (
                        <span className="rounded-sm bg-sig-danger-soft px-2 py-0.5 text-xs font-semibold text-sig-danger">{t("inactive")}</span>
                      ) : !u.email_confirmado ? (
                        <span className="rounded-sm bg-sig-warning-soft px-2 py-0.5 text-xs font-semibold text-sig-warning">{t("unconfirmed")}</span>
                      ) : (
                        <span className="rounded-sm bg-sig-success-soft px-2 py-0.5 text-xs font-semibold text-sig-success">{t("active")}</span>
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex justify-end gap-1">
                        <button title={t("edit")} aria-label={t("edit")} onClick={() => { setEditando(u); setFormEdit({ nombre: u.nombre || "", rol: u.rol || "", departamento: u.departamento || "" }); }} className="rounded p-2 text-sig-muted hover:bg-sig-sand hover:text-black dark:hover:bg-zinc-800"><Pencil size={16} /></button>
                        <button title={t("resetPassword")} aria-label={t("resetPassword")} onClick={() => restablecer(u)} className="rounded p-2 text-sig-muted hover:bg-sig-sand hover:text-black dark:hover:bg-zinc-800"><KeyRound size={16} /></button>
                        <button title={u.activo === false ? t("activate") : t("deactivate")} aria-label={u.activo === false ? t("activate") : t("deactivate")} onClick={() => cambiarActivo(u)} className={`rounded p-2 hover:bg-sig-sand dark:hover:bg-zinc-800 ${u.activo === false ? "text-sig-success" : "text-sig-danger"}`}>{u.activo === false ? <UserCheck size={16} /> : <UserX size={16} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sig-muted">{t("empty")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <datalist id="roles-existentes">{rolesExistentes.map((r) => <option key={r} value={r} />)}</datalist>

      {modalNuevo && (
        <Modal titulo={t("newUser")} onClose={() => setModalNuevo(false)}>
          <form onSubmit={crear} className="space-y-4" noValidate>
            {([
              ["nombre", t("fieldName"), "text", "Nombre Apellido"],
              ["email", t("fieldEmail"), "email", "usuario@sig.biz"],
              ["departamento", t("fieldDept"), "text", "Back office"],
            ] as const).map(([k, label, type, ph]) => (
              <div key={k}>
                <label className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{label}</label>
                <input type={type} placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={campo} />
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldRole")}</label>
              <input list="roles-existentes" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })} className={campo} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldPassword")}</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("fieldPasswordPlaceholder")} className={campo} />
            </div>
            <div className="flex justify-end gap-2 border-t border-sig-line dark:border-zinc-700 pt-4">
              <button type="button" onClick={() => setModalNuevo(false)} className={btnSecundario}>{t("cancel")}</button>
              <button type="submit" disabled={guardando} className={btnPrimario}>{guardando && <Loader2 size={16} className="animate-spin" />}{t("create")}</button>
            </div>
          </form>
        </Modal>
      )}

      {editando && (
        <Modal titulo={t("editTitle", { email: editando.email })} onClose={() => setEditando(null)}>
          <form onSubmit={guardarEdicion} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldName")}</label>
              <input value={formEdit.nombre} onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })} className={campo} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldRole")}</label>
              <input list="roles-existentes" value={formEdit.rol} onChange={(e) => setFormEdit({ ...formEdit, rol: e.target.value })} className={campo} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-black dark:text-white">{t("fieldDept")}</label>
              <input value={formEdit.departamento} onChange={(e) => setFormEdit({ ...formEdit, departamento: e.target.value })} className={campo} />
            </div>
            <div className="flex justify-end gap-2 border-t border-sig-line dark:border-zinc-700 pt-4">
              <button type="button" onClick={() => setEditando(null)} className={btnSecundario}>{t("cancel")}</button>
              <button type="submit" disabled={guardando} className={btnPrimario}>{guardando && <Loader2 size={16} className="animate-spin" />}{t("save")}</button>
            </div>
          </form>
        </Modal>
      )}

      {credenciales && (
        <Modal titulo={credenciales.nuevo ? t("createdTitle") : t("resetTitle")} onClose={() => setCredenciales(null)}>
          <p className="text-sm text-sig-muted">{t("credentialsIntro")}</p>
          <dl className="mt-4 divide-y divide-sig-line dark:divide-zinc-700 border-y border-sig-line dark:border-zinc-700 text-sm">
            <div className="flex items-center justify-between py-3"><dt className="text-sig-muted">{t("fieldEmail")}</dt><dd className="font-semibold text-black dark:text-white">{credenciales.email}</dd></div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sig-muted">{t("tempPassword")}</dt>
              <dd className="flex items-center gap-2">
                <code className="rounded-sm bg-sig-sand dark:bg-zinc-800 px-2 py-1 font-mono text-black dark:text-white">{credenciales.password}</code>
                <button onClick={() => copiar(credenciales.password)} className="rounded p-1.5 text-sig-muted hover:bg-sig-sand hover:text-black" aria-label={t("copy")} title={t("copy")}><Copy size={16} /></button>
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-sig-muted">{t("credentialsNote")}</p>
          <div className="mt-5 flex justify-end">
            <button onClick={() => setCredenciales(null)} className={btnPrimario}>{t("done")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
