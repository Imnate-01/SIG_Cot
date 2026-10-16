import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Estructura común de las pantallas públicas (login y registro) con la identidad SIG:
 * panel lateral arena con logo, nombre de la app y lista de puntos clave (solo escritorio)
 * y columna de formulario sobre fondo blanco. La identidad SIG es de fondo claro, por lo
 * que estas pantallas no cambian con el modo oscuro.
 */
export interface AuthShellProps {
  appName: string;
  appTagline: string;
  items: string[];
  footer: string;
  children: ReactNode;
}

export default function AuthShell({ appName, appTagline, items, footer, children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen bg-white font-sig text-sig-ink">
      <aside className="hidden w-[400px] flex-none flex-col border-r border-sig-line bg-sig-sand p-10 md:flex">
        <div>
          <Image src="/sig-logo.webp" alt="SIG" width={74} height={48} priority unoptimized className="h-12 w-auto" />
          <div className="mt-6">
            <p className="text-xl font-bold text-sig-ink">{appName}</p>
            <p className="text-sm text-sig-muted">{appTagline}</p>
          </div>
        </div>

        <ul className="mt-12 border-t border-sig-line">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3 border-b border-sig-line py-3 text-sm text-sig-ink">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-sig-blue" aria-hidden />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-auto text-xs text-sig-muted">{footer}</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">{children}</main>
    </div>
  );
}

/** Clases de los campos de texto, iguales en login y registro. */
export const campoClase =
  "h-10 w-full rounded border border-sig-line-strong bg-white px-3 text-sm text-sig-ink placeholder:text-sig-muted/70 outline-none transition-shadow focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)]";
