"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CircleAlert, CircleCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import AuthShell, { campoClase } from "@/components/auth/AuthShell";

/**
 * Paso 2 de la recuperación: el enlace del correo de Supabase llega aquí con
 * `#access_token=...&type=recovery` (o `#error=...` si expiró).
 */
function leerFragmento(): { token: string | null; error: string | null } {
  if (typeof window === "undefined") return { token: null, error: null };
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const error = params.get("error_description") || params.get("error");
  const token = params.get("type") === "recovery" ? params.get("access_token") : null;
  return { token, error: error ? error.replace(/\+/g, " ") : null };
}

export default function RestablecerPage() {
  const t = useTranslations("Restablecer");
  const tLogin = useTranslations("Login");
  const [token, setToken] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [ver, setVer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  useEffect(() => {
    // Si el enlace trae #error (expirado/usado) no hay token y se muestra el aviso
    const { token: tk } = leerFragmento();
    // El fragmento solo existe en el navegador; se lee una vez al montar
    setToken(tk);
    setListo(true);
    // Quitar el token de la barra de direcciones
    if (tk) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t("errorMinLength"));
    if (password !== password2) return setError(t("errorMismatch"));
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || t("errorConnection"));
      setExito(data?.message || t("success"));
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : t("errorConnection"));
    } finally {
      setLoading(false);
    }
  };

  const enlaceInvalido = listo && !token && !exito;

  return (
    <AuthShell
      appName={tLogin("appName")}
      appTagline={tLogin("appTagline")}
      items={[tLogin("moduleQuotes"), tLogin("moduleReports"), tLogin("moduleFsa")]}
      footer={tLogin("internalUse")}
    >
      <div className="w-full max-w-[400px]">
        <Image src="/sig-logo.webp" alt="SIG" width={62} height={40} priority unoptimized className="mb-8 h-10 w-auto md:hidden" />
        <h1 className="text-[28px] font-bold leading-tight text-sig-ink">{t("title")}</h1>
        <p className="mt-2 text-sm text-sig-muted">{t("subtitle")}</p>

        {exito ? (
          <div role="status" className="mt-8 flex items-start gap-2 rounded border border-sig-success/30 border-l-4 border-l-sig-success bg-sig-success-soft px-3 py-2.5 text-sm text-sig-success">
            <CircleCheck size={18} className="mt-px flex-none" />
            <span>{exito}</span>
          </div>
        ) : enlaceInvalido ? (
          <div role="alert" className="mt-8 flex items-start gap-2 rounded border border-sig-danger/30 border-l-4 border-l-sig-danger bg-sig-danger-soft px-3 py-2.5 text-sm text-sig-danger">
            <CircleAlert size={18} className="mt-px flex-none" />
            <span>{t("invalidLink")} <Link href="/recuperar" className="font-semibold underline">{t("requestNew")}</Link></span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-sig-ink">{t("passwordLabel")}</label>
              <div className="relative">
                <input id="password" type={ver ? "text" : "password"} autoComplete="new-password" className={`${campoClase} pr-10`} placeholder={t("passwordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setVer(!ver)} aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sig-muted hover:text-sig-ink">
                  {ver ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="password2" className="mb-1.5 block text-[13px] font-semibold text-sig-ink">{t("confirmLabel")}</label>
              <input id="password2" type={ver ? "text" : "password"} autoComplete="new-password" className={campoClase} value={password2} onChange={(e) => setPassword2(e.target.value)} />
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded border border-sig-danger/30 border-l-4 border-l-sig-danger bg-sig-danger-soft px-3 py-2.5 text-sm text-sig-danger">
                <CircleAlert size={18} className="mt-px flex-none" />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading || !listo} className="flex h-10 w-full items-center justify-center gap-2 rounded bg-sig-blue text-sm font-semibold text-white transition-colors hover:bg-sig-blue-hover disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" />{t("saving")}</> : t("submit")}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-sig-line pt-6 text-sm">
          <Link href="/login" className="font-semibold text-sig-blue hover:text-sig-ink hover:underline">{t("backToLogin")}</Link>
        </div>
      </div>
    </AuthShell>
  );
}
