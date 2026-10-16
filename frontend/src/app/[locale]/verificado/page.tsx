"use client";

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { CircleCheck } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";

export default function VerificadoPage() {
  const router = useRouter();
  const t = useTranslations("Verificado");
  const tLogin = useTranslations("Login");

  return (
    <AuthShell
      appName={tLogin("appName")}
      appTagline={tLogin("appTagline")}
      items={[tLogin("moduleQuotes"), tLogin("moduleReports"), tLogin("moduleFsa")]}
      footer={tLogin("internalUse")}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo solo en móvil (en escritorio está en el panel lateral) */}
        <Image src="/sig-logo.webp" alt="SIG" width={62} height={40} priority unoptimized className="mb-8 h-10 w-auto md:hidden" />

        <CircleCheck size={40} strokeWidth={1.6} className="text-sig-success" aria-hidden />

        <h1 className="mt-5 text-[28px] font-bold leading-tight text-sig-ink">{t("title")}</h1>
        <p className="mt-2 text-sm font-semibold text-sig-ink">{t("subtitle")}</p>
        <p className="mt-1 text-sm text-sig-muted">{t("description")}</p>

        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-8 flex h-10 w-full items-center justify-center rounded bg-sig-blue text-sm font-semibold text-white transition-colors hover:bg-sig-blue-hover focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--sig-blue-focus)]"
        >
          {t("btnLogin")}
        </button>

        <p className="mt-6 border-t border-sig-line pt-6 text-xs text-sig-muted">{t("footer")}</p>
      </div>
    </AuthShell>
  );
}
