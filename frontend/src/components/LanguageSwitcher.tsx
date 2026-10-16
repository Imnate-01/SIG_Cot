"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";

export default function LanguageSwitcher() {
    const t = useTranslations("LanguageSwitcher");
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const switchLocale = (newLocale: string) => {
        router.replace(pathname, { locale: newLocale });
    };

    return (
        <div className="px-2.5 pt-1">
            <p className="text-[11px] font-bold text-sig-muted uppercase tracking-wider mb-1.5">
                {t("label")}
            </p>
            <div className="flex bg-white dark:bg-zinc-800 border border-sig-line dark:border-zinc-700 rounded p-0.5 gap-0.5">
                <button
                    onClick={() => switchLocale("es")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-sm text-xs font-semibold transition-all ${locale === "es"
                            ? "bg-sig-blue text-white"
                            : "text-sig-muted hover:text-black dark:hover:text-gray-200"
                        }`}
                >
                    ES
                </button>
                <button
                    onClick={() => switchLocale("en")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-sm text-xs font-semibold transition-all ${locale === "en"
                            ? "bg-sig-blue text-white"
                            : "text-sig-muted hover:text-black dark:hover:text-gray-200"
                        }`}
                >
                    EN
                </button>
            </div>
        </div>
    );
}
