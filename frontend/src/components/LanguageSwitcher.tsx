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
        <div className="px-3 pt-2">
            <p className="text-[11px] font-extrabold text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                {t("label")}
            </p>
            <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 gap-1">
                <button
                    onClick={() => switchLocale("es")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-bold transition-all ${locale === "es"
                            ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                >
                    🇲🇽 ES
                </button>
                <button
                    onClick={() => switchLocale("en")}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-bold transition-all ${locale === "en"
                            ? "bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                >
                    🇺🇸 EN
                </button>
            </div>
        </div>
    );
}
