"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Check, Eye, EyeOff, Loader2, CircleAlert, CircleCheck } from "lucide-react";
import AuthShell, { campoClase } from "@/components/auth/AuthShell";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const router = useRouter();
  const [departamento, setDepartamento] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const t = useTranslations("Register");
  const tLogin = useTranslations("Login");

  const passwordStrength = () => {
    if (password.length === 0) return { text: "", color: "" };
    if (password.length < 8) return { text: t("strengthWeak"), color: "text-sig-danger" };
    if (password.length < 12) return { text: t("strengthMedium"), color: "text-sig-warning" };
    return { text: t("strengthStrong"), color: "text-sig-success" };
  };

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setErrorMsg(null);

    if (!nombre || !email || !departamento || !password || !password2) {
      setErrorMsg(t("errorEmpty"));
      return;
    }

    if (password !== password2) {
      setErrorMsg(t("errorMismatch"));
      return;
    }

    if (password.length < 8) {
      setErrorMsg(t("errorMinLength"));
      return;
    }

    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith("@sig.biz")) {
      setErrorMsg(t("errorDomain"));
      return;
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          email: emailLower,
          password,
          rol: "vendedor",
          departamento,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.message || t("errorConnection"));
        return;
      }

      setSuccessMsg(true);
      setTimeout(() => {
        toast.success(t("successToast"));
        router.push("/login");
      }, 1000);
    } catch (err) {
      console.error(err);
      setErrorMsg(t("errorConnection"));
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength();

  const campoLabel = "mb-1.5 block text-[13px] font-semibold text-sig-ink";
  const ojo = (visible: boolean, alternar: () => void) => (
    <button
      type="button"
      onClick={alternar}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sig-muted hover:text-sig-ink"
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );

  return (
    <AuthShell
      appName={t("sideTitle")}
      appTagline={t("sideSubtitle")}
      items={[
        `${t("benefit1Title")} · ${t("benefit1Desc")}`,
        `${t("benefit2Title")} · ${t("benefit2Desc")}`,
        `${t("benefit3Title")} · ${t("benefit3Desc")}`,
      ]}
      footer={tLogin("internalUse")}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo solo en móvil (en escritorio está en el panel lateral) */}
        <Image src="/sig-logo.webp" alt="SIG" width={62} height={40} priority unoptimized className="mb-8 h-10 w-auto md:hidden" />

        <h1 className="text-[28px] font-bold leading-tight text-sig-ink">
          {t("title")} {t("titleHighlight")}
        </h1>
        <p className="mt-2 text-sm text-sig-muted">
          {t("subtitle")} {t("subtitleHint")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="nombre" className={campoLabel}>{t("nameLabel")}</label>
            <input
              id="nombre"
              type="text"
              autoComplete="name"
              className={campoClase}
              placeholder={t("namePlaceholder")}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="email" className={campoLabel}>{t("emailLabel")}</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="username"
                className={`${campoClase} pr-10`}
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {email.toLowerCase().trim().endsWith("@sig.biz") && (
                <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-sig-success">
                  <Check size={18} />
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="departamento" className={campoLabel}>{t("deptLabel")}</label>
            <input
              id="departamento"
              type="text"
              className={campoClase}
              placeholder={t("deptPlaceholder")}
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password" className={campoLabel}>{t("passwordLabel")}</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className={`${campoClase} pr-10`}
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {ojo(showPassword, () => setShowPassword(!showPassword))}
            </div>
            {password && (
              <div className="mt-2 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-sm bg-sig-line">
                  <div
                    className={`h-full transition-all ${password.length < 8
                      ? "w-1/3 bg-sig-danger"
                      : password.length < 12
                        ? "w-2/3 bg-sig-warning"
                        : "w-full bg-sig-success"
                      }`}
                  />
                </div>
                <span className={`text-xs font-semibold ${strength.color}`}>{strength.text}</span>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="password2" className={campoLabel}>{t("confirmPasswordLabel")}</label>
            <div className="relative">
              <input
                id="password2"
                type={showPassword2 ? "text" : "password"}
                autoComplete="new-password"
                className={`${campoClase} pr-16`}
                placeholder={t("confirmPasswordPlaceholder")}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
              {password2 && password === password2 && (
                <span className="absolute inset-y-0 right-10 flex w-6 items-center justify-center text-sig-success">
                  <Check size={18} />
                </span>
              )}
              {ojo(showPassword2, () => setShowPassword2(!showPassword2))}
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="flex items-start gap-2 rounded border border-sig-danger/30 border-l-4 border-l-sig-danger bg-sig-danger-soft px-3 py-2.5 text-sm text-sig-danger">
              <CircleAlert size={18} className="mt-px flex-none" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div role="status" className="flex items-start gap-2 rounded border border-sig-success/30 border-l-4 border-l-sig-success bg-sig-success-soft px-3 py-2.5 text-sm text-sig-success">
              <CircleCheck size={18} className="mt-px flex-none" />
              <span>{t("success")}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded bg-sig-blue text-sm font-semibold text-white transition-colors hover:bg-sig-blue-hover focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--sig-blue-focus)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </button>
        </form>

        <div className="mt-8 flex items-center justify-between border-t border-sig-line pt-6 text-sm">
          <span className="text-sig-muted">{t("hasAccount")}</span>
          <button
            type="button"
            className="inline-flex h-9 items-center rounded border border-sig-line-strong bg-white px-3.5 font-semibold text-sig-ink hover:bg-sig-sand"
            onClick={() => router.push("/login")}
          >
            {t("login")}
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
