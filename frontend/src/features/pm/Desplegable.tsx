"use client";

/**
 * Listas desplegables del módulo PM.
 *
 *   CampoSugerencias  campo de texto libre con sugerencias (planta, máquina, contacto, SAM/FSE)
 *   SelectorBuscable  selección obligatoria de una lista con búsqueda (cliente)
 *
 * Comparten el panel: grupos con encabezado, icono por tipo, dos líneas (valor y
 * detalle), coincidencias resaltadas, palomita en la opción elegida, navegación
 * con teclado (↑ ↓ Inicio Fin Enter Esc) y posición fija calculada para que un
 * modal con scroll no lo recorte (se abre hacia arriba si no cabe abajo).
 */

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Cog, CornerDownLeft, Factory, History, Search, User, UserRound, X } from "lucide-react";

export type IconoOpcion = "planta" | "maquina" | "persona" | "contacto" | "cliente" | "historial";

export interface OpcionLista {
  /** Lo que se guarda (texto en CampoSugerencias, id en SelectorBuscable). */
  valor: string;
  /** Texto principal si es distinto del valor (p. ej. nombre del cliente). */
  etiqueta?: string;
  /** Segunda línea, más tenue. */
  detalle?: string;
  /** Encabezado de sección; las opciones del mismo grupo deben ir juntas. */
  grupo?: string;
  icono?: IconoOpcion;
}

const ICONOS: Record<IconoOpcion, React.ElementType> = {
  planta: Factory, maquina: Cog, persona: UserRound, contacto: User, cliente: Building2, historial: History,
};

const base =
  "h-10 w-full rounded border border-sig-line-strong dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-black dark:text-white outline-none transition-shadow focus:border-sig-blue focus:shadow-[0_0_0_2px_var(--sig-blue-focus)] disabled:opacity-60";

/** minúsculas y sin acentos, para buscar "queretaro" y encontrar "Querétaro" */
export const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todas las palabras buscadas deben aparecer (en cualquier orden) en el texto de la opción. */
export function filtrarOpciones(opciones: OpcionLista[], q: string): OpcionLista[] {
  const palabras = normalizar(q).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return opciones;
  return opciones.filter((o) => {
    const texto = normalizar(`${o.etiqueta ?? o.valor} ${o.detalle ?? ""} ${o.grupo ?? ""}`);
    return palabras.every((p) => texto.includes(p));
  });
}

/** Resalta en negritas las partes que coinciden con lo buscado. */
function Resaltado({ texto, q }: { texto: string; q: string }) {
  const palabras = normalizar(q).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return <>{texto}</>;
  const n = normalizar(texto);
  const marcas = new Array(texto.length).fill(false);
  for (const p of palabras) {
    let i = n.indexOf(p);
    while (i >= 0) { for (let k = i; k < i + p.length; k++) marcas[k] = true; i = n.indexOf(p, i + p.length); }
  }
  const partes: Array<{ t: string; m: boolean }> = [];
  for (let i = 0; i < texto.length; i++) {
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.m === marcas[i]) ultima.t += texto[i];
    else partes.push({ t: texto[i], m: marcas[i] });
  }
  return <>{partes.map((p, i) => (p.m ? <mark key={i} className="rounded-[2px] bg-sig-blue-soft px-0 text-inherit font-bold dark:bg-sky-900/60">{p.t}</mark> : <span key={i}>{p.t}</span>))}</>;
}

/** Posición fija del panel respecto al campo; se recalcula con scroll y resize. */
type PosPanel = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export function calcularPosicion(r: { left: number; width: number; top: number; bottom: number }, altoVentana: number, deseado = 320): PosPanel {
  const abajo = altoVentana - r.bottom - 12;
  const arriba = r.top - 12;
  // Abajo si cabe razonablemente o si hay más espacio abajo; si no, hacia arriba
  if (abajo >= Math.min(deseado, 200) || abajo >= arriba) {
    return { left: r.left, width: r.width, top: r.bottom + 6, maxHeight: Math.max(160, Math.min(deseado, abajo)) };
  }
  return { left: r.left, width: r.width, bottom: altoVentana - r.top + 6, maxHeight: Math.max(160, Math.min(deseado, arriba)) };
}

function usePosicionPanel(abierto: boolean, ancla: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<PosPanel | null>(null);
  useEffect(() => {
    if (!abierto) return;
    let cuadro = 0;
    const calcular = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        const el = ancla.current;
        if (el) setPos(calcularPosicion(el.getBoundingClientRect(), window.innerHeight));
      });
    };
    calcular();
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", calcular, true);
    return () => { cancelAnimationFrame(cuadro); window.removeEventListener("resize", calcular); window.removeEventListener("scroll", calcular, true); };
  }, [abierto, ancla]);
  return abierto ? pos : null;
}

interface PanelProps {
  id: string;
  opciones: OpcionLista[];
  total: number;
  q: string;
  activo: number;
  seleccionado: string;
  pos: ReturnType<typeof usePosicionPanel>;
  onElegir: (o: OpcionLista) => void;
  onActivo: (i: number) => void;
  vacio: React.ReactNode;
  pie?: React.ReactNode;
}

function Panel({ id, opciones, total, q, activo, seleccionado, pos, onElegir, onActivo, vacio, pie }: PanelProps) {
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (activo < 0) return;
    lista.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);
  if (!pos) return null;
  const filtrando = q.trim().length > 0;
  let grupoAnterior: string | undefined;

  return (
    <div
      className="fixed z-[200] flex flex-col overflow-hidden rounded-md border border-sig-line dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.25),0_2px_6px_rgba(0,0,0,0.08)] animate-fadeIn"
      style={{ left: pos.left, width: Math.max(pos.width, 260), top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {filtrando && opciones.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-sig-line dark:border-zinc-700 bg-sig-sand/60 dark:bg-zinc-800/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sig-muted">
          <Search size={11} /> {opciones.length} of {total}
        </div>
      )}
      <ul ref={lista} id={id} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
        {opciones.length === 0 ? (
          <li className="px-3 py-4 text-center text-sm text-sig-muted">{vacio}</li>
        ) : opciones.map((o, i) => {
          const Icono = o.icono ? ICONOS[o.icono] : null;
          const elegida = o.valor === seleccionado;
          const encabezado = o.grupo && o.grupo !== grupoAnterior ? o.grupo : null;
          grupoAnterior = o.grupo;
          return (
            <React.Fragment key={`${o.grupo ?? ""}-${o.valor}-${i}`}>
              {encabezado && (
                <li role="presentation" className={`px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-sig-muted ${i > 0 ? "mt-1 border-t border-sig-line dark:border-zinc-700" : ""}`}>
                  {encabezado}
                </li>
              )}
              <li
                id={`${id}-op-${i}`}
                data-indice={i}
                role="option"
                aria-selected={elegida}
                onMouseMove={() => activo !== i && onActivo(i)}
                onClick={() => onElegir(o)}
                className={`relative mx-1 flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 ${i === activo ? "bg-sig-blue-soft dark:bg-zinc-800" : ""}`}
              >
                {i === activo && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-sig-blue" aria-hidden />}
                {Icono && (
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${elegida ? "bg-sig-blue text-white" : "bg-sig-sand text-sig-muted dark:bg-zinc-800"}`}>
                    <Icono size={14} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${elegida ? "font-semibold text-sig-blue" : "text-black dark:text-white"}`}>
                    <Resaltado texto={o.etiqueta ?? o.valor} q={q} />
                  </span>
                  {o.detalle && <span className="block truncate text-xs text-sig-muted"><Resaltado texto={o.detalle} q={q} /></span>}
                </span>
                {elegida && <Check size={16} strokeWidth={2.5} className="shrink-0 text-sig-blue" aria-hidden />}
              </li>
            </React.Fragment>
          );
        })}
      </ul>
      {pie}
      <div className="hidden items-center gap-3 border-t border-sig-line dark:border-zinc-700 px-3 py-1.5 text-[11px] text-sig-muted sm:flex">
        <span><kbd className="font-sans font-semibold">↑↓</kbd> move</span>
        <span><kbd className="font-sans font-semibold">Enter</kbd> pick</span>
        <span><kbd className="font-sans font-semibold">Esc</kbd> close</span>
      </div>
    </div>
  );
}

/** Manejo de teclado compartido. Devuelve true si consumió la tecla. */
function teclas(e: React.KeyboardEvent, n: number, activo: number, setActivo: (i: number) => void, abrir: () => void, abierto: boolean): boolean {
  if (e.key === "ArrowDown") { e.preventDefault(); if (!abierto) abrir(); setActivo(n ? (activo + 1) % n : -1); return true; }
  if (e.key === "ArrowUp") { e.preventDefault(); if (!abierto) abrir(); setActivo(n ? (activo <= 0 ? n - 1 : activo - 1) : -1); return true; }
  if (abierto && e.key === "Home") { e.preventDefault(); setActivo(n ? 0 : -1); return true; }
  if (abierto && e.key === "End") { e.preventDefault(); setActivo(n - 1); return true; }
  return false;
}

/**
 * Texto libre con sugerencias. Al enfocar muestra todas las opciones; al
 * escribir filtra. Lo escrito se respeta aunque no esté en la lista.
 */
export function CampoSugerencias({
  value, onChange, opciones, onElegir, placeholder, ariaLabel, type = "text", vacio = "No suggestions",
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: OpcionLista[];
  onElegir?: (v: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  type?: string;
  vacio?: string;
}) {
  const id = useId();
  const ancla = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [filtrar, setFiltrar] = useState(false); // false = recién abierto: muestra todo
  const [activo, setActivo] = useState(-1);
  const pos = usePosicionPanel(abierto, ancla);
  const hay = opciones.length > 0;
  const q = filtrar ? value : "";
  const visibles = useMemo(() => filtrarOpciones(opciones, q).slice(0, 100), [opciones, q]);
  const exacta = opciones.some((o) => normalizar(o.valor) === normalizar(value.trim()));

  const abrir = () => {
    if (!hay) return;
    setFiltrar(false);
    setAbierto(true);
    setActivo(Math.max(0, opciones.findIndex((o) => o.valor === value)));
  };
  const cerrar = () => { setAbierto(false); setActivo(-1); };
  const elegir = (o: OpcionLista) => { onChange(o.valor); onElegir?.(o.valor); cerrar(); };

  return (
    <div ref={ancla} className="group relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) cerrar(); }}>
      <input
        ref={input}
        type={type}
        className={`${base} pl-3 ${hay ? "pr-16" : value ? "pr-9" : "pr-3"}`}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role={hay ? "combobox" : undefined}
        aria-expanded={hay ? abierto : undefined}
        aria-controls={hay && abierto ? id : undefined}
        aria-autocomplete={hay ? "list" : undefined}
        aria-activedescendant={abierto && activo >= 0 ? `${id}-op-${activo}` : undefined}
        autoComplete="off"
        onFocus={abrir}
        onClick={() => { if (!abierto) abrir(); }}
        onChange={(e) => { onChange(e.target.value); setFiltrar(true); setActivo(e.target.value ? 0 : -1); if (hay) setAbierto(true); }}
        onKeyDown={(e) => {
          if (!hay) return;
          if (teclas(e, visibles.length, activo, setActivo, abrir, abierto)) return;
          if (e.key === "Enter" && abierto) {
            e.preventDefault();
            if (activo >= 0 && visibles[activo]) elegir(visibles[activo]); else cerrar();
          } else if (e.key === "Escape" && abierto) { e.preventDefault(); cerrar(); }
          else if (e.key === "Tab") cerrar();
        }}
      />
      <span className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        {value && (
          <button
            type="button" tabIndex={-1} aria-label="Clear"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { onChange(""); setFiltrar(false); input.current?.focus(); if (hay) setAbierto(true); }}
            className="flex h-7 w-7 items-center justify-center rounded text-sig-muted opacity-0 transition-opacity hover:bg-sig-sand hover:text-black focus:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            <X size={14} />
          </button>
        )}
        {hay && (
          <button
            type="button" tabIndex={-1} aria-label={abierto ? "Hide options" : "Show options"}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { if (abierto) cerrar(); else { input.current?.focus(); abrir(); } }}
            className="flex h-8 w-8 items-center justify-center rounded text-sig-muted hover:bg-sig-sand hover:text-black dark:hover:bg-zinc-700 dark:hover:text-white"
          >
            <ChevronDown size={16} className={`transition-transform duration-150 ${abierto ? "rotate-180 text-sig-blue" : ""}`} />
          </button>
        )}
      </span>
      {hay && abierto && (
        <Panel
          id={id} opciones={visibles} total={opciones.length} q={q} activo={activo} seleccionado={value} pos={pos}
          onElegir={elegir} onActivo={setActivo} vacio={filtrar && value.trim() ? "No matches" : vacio}
          pie={filtrar && value.trim() && !exacta ? (
            <button
              type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={cerrar}
              className="flex w-full items-center gap-2 border-t border-sig-line dark:border-zinc-700 px-3 py-2 text-left text-sm text-black hover:bg-sig-sand dark:text-white dark:hover:bg-zinc-800"
            >
              <CornerDownLeft size={14} className="shrink-0 text-sig-muted" />
              <span className="min-w-0 truncate">Use “<span className="font-semibold">{value.trim()}</span>”</span>
            </button>
          ) : undefined}
        />
      )}
    </div>
  );
}

/**
 * Selección obligatoria de una lista con búsqueda (no acepta texto libre).
 * Cerrado muestra la opción elegida; al abrirlo el campo sirve para buscar.
 */
export function SelectorBuscable({
  value, onChange, opciones, placeholder = "Select…", buscarPlaceholder = "Search…", ariaLabel, vacio = "No results", icono,
}: {
  value: string;
  onChange: (v: string) => void;
  opciones: OpcionLista[];
  placeholder?: string;
  buscarPlaceholder?: string;
  ariaLabel?: string;
  vacio?: string;
  icono?: IconoOpcion;
}) {
  const id = useId();
  const ancla = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [activo, setActivo] = useState(-1);
  const pos = usePosicionPanel(abierto, ancla);
  const elegida = opciones.find((o) => o.valor === value);
  const visibles = useMemo(() => filtrarOpciones(opciones, q).slice(0, 200), [opciones, q]);
  const Icono = icono ? ICONOS[icono] : null;

  const abrir = () => {
    setQ("");
    setAbierto(true);
    setActivo(Math.max(0, opciones.findIndex((o) => o.valor === value)));
  };
  const cerrar = () => { setAbierto(false); setQ(""); setActivo(-1); };
  const elegir = (o: OpcionLista) => { onChange(o.valor); cerrar(); };

  return (
    <div ref={ancla} className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) cerrar(); }}>
      {Icono && <Icono size={16} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${abierto ? "text-sig-blue" : "text-sig-muted"}`} aria-hidden />}
      {abierto && !Icono && <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sig-blue" aria-hidden />}
      <input
        ref={input}
        className={`${base} cursor-pointer pr-9 ${Icono || abierto ? "pl-9" : "pl-3"} ${!abierto && elegida ? "font-semibold" : ""} placeholder:font-normal`}
        value={abierto ? q : elegida ? (elegida.etiqueta ?? elegida.valor) : ""}
        placeholder={abierto ? buscarPlaceholder : placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={abierto ? id : undefined}
        aria-autocomplete="list"
        aria-activedescendant={abierto && activo >= 0 ? `${id}-op-${activo}` : undefined}
        autoComplete="off"
        onFocus={abrir}
        onClick={() => { if (!abierto) abrir(); }}
        onChange={(e) => { setQ(e.target.value); setActivo(0); if (!abierto) setAbierto(true); }}
        onKeyDown={(e) => {
          if (teclas(e, visibles.length, activo, setActivo, abrir, abierto)) return;
          if (e.key === "Enter") { e.preventDefault(); if (abierto && activo >= 0 && visibles[activo]) elegir(visibles[activo]); else if (!abierto) abrir(); }
          else if (e.key === "Escape" && abierto) { e.preventDefault(); cerrar(); }
          else if (e.key === "Tab") cerrar();
        }}
      />
      <button
        type="button" tabIndex={-1} aria-label={abierto ? "Hide options" : "Show options"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { if (abierto) { cerrar(); input.current?.blur(); } else { input.current?.focus(); } }}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-sig-muted hover:bg-sig-sand hover:text-black dark:hover:bg-zinc-700 dark:hover:text-white"
      >
        <ChevronDown size={16} className={`transition-transform duration-150 ${abierto ? "rotate-180 text-sig-blue" : ""}`} />
      </button>
      {!abierto && elegida?.detalle && <span className="sr-only">{elegida.detalle}</span>}
      {abierto && (
        <Panel id={id} opciones={visibles} total={opciones.length} q={q} activo={activo} seleccionado={value} pos={pos} onElegir={elegir} onActivo={setActivo} vacio={vacio} />
      )}
    </div>
  );
}
