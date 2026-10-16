import { redirect } from "@/i18n/routing";

/**
 * La raíz ya no tiene landing page: es una herramienta interna.
 * Se envía al login; si el usuario ya tiene sesión, el login lo manda a su
 * pantalla de inicio (cotizaciones o Food Safety Audit según su rol).
 */
export default async function Inicio({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/login", locale });
}
