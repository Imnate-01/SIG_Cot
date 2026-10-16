"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react";
import { Link } from "@/i18n/routing";
import AuthShell, { campoClase } from "@/components/auth/AuthShell";

/** Paso 1 de la recuperación: pedir el enlace por correo. */
export default function RecuperarPage() {
  const t = useTranslations("Recuperar");
  const tLogin = useTranslations("Login");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const correo = email.trim().toLowerCase();
    if (!correo.endsWith("@sig.biz")) {
      setError(t("errorDomain"));
      return;
    }
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || t("errorConnection"));
      setEnviado(data?.message || t("sent"));
    } catch (err) {
      setError(err instanceof Error && err.message !== "Failed to fetch" ? err.message : t("errorConnection"));
    } finally {
      setLoading(false);
    }
  };

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

        {enviado ? (
          <div role="status" className="mt-8 flex items-start gap-2 rounded border border-sig-success/30 border-l-4 border-l-sig-success bg-sig-success-soft px-3 py-2.5 text-sm text-sig-success">
            <CircleCheck size={18} className="mt-px flex-none" />
            <span>{enviado}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-sig-ink">{t("emailLabel")}</label>
              <input id="email" type="email" autoComplete="username" className={campoClase} placeholder="usuario@sig.biz" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded border border-sig-danger/30 border-l-4 border-l-sig-danger bg-sig-danger-soft px-3 py-2.5 text-sm text-sig-danger">
                <CircleAlert size={18} className="mt-px flex-none" />
                <span>{error}</span>
              </div>
            )}
            <button type="submit" disabled={loading} className="flex h-10 w-full items-center justify-center gap-2 rounded bg-sig-blue text-sm font-semibold text-white transition-colors hover:bg-sig-blue-hover disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" />{t("sending")}</> : t("submit")}
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-sig-muted">{t("adminHint")}</p>

        <div className="mt-8 border-t border-sig-line pt-6 text-sm">
          <Link href="/login" className="font-semibold text-sig-blue hover:text-sig-ink hover:underline">{t("backToLogin")}</Link>
        </div>
      </div>
    </AuthShell>
  );
}
