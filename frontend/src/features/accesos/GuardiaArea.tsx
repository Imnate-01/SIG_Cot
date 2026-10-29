"use client";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useAccesos } from "./AccesosProvider";
import { puedeVerRuta, seccionDeRuta, limpiarRuta } from "./areas";

/**
 * Si alguien abre la dirección de un área que no tiene (p. ej. escribe /pm sin
 * tener Mantenimiento), lo regresa a Inicio. Es solo comodidad: el backend
 * responde 403 de todos modos.
 */
export default function GuardiaArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Accesos");
  const { datos, cargando } = useAccesos();

  const protegida = seccionDeRuta(pathname) !== null || limpiarRuta(pathname) === "/usuarios";
  const permitido = !datos || puedeVerRuta(datos, pathname);

  useEffect(() => {
    if (datos && !permitido) {
      toast.error(t("noAccessTitle"), { description: t("noAccessDesc") });
      router.replace("/inicio");
    }
  }, [datos, permitido, router, t]);

  if (protegida && (cargando || !permitido)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" aria-busy="true">
        <Loader2 className="animate-spin text-sig-blue" aria-label={t("loading")} />
      </div>
    );
  }
  return <>{children}</>;
}
