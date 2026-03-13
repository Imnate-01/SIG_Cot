"use client";
import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Cpu } from "lucide-react";

interface MachineOption {
  id: string | number;
  modelo_maquina: string;
  serie: string;
  machine_id: string;
  direccion_id?: number | null;
}

interface MachineComboboxProps {
  value: string;
  onChange: (value: string) => void;
  machines: MachineOption[];
  placeholder?: string;
  disabled?: boolean;
}

const MachineCombobox: React.FC<MachineComboboxProps> = ({
  value,
  onChange,
  machines,
  placeholder = "Buscar o seleccionar máquina...",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.machine_id.toLowerCase().includes(q) ||
      m.modelo_maquina.toLowerCase().includes(q) ||
      m.serie.toLowerCase().includes(q)
    );
  });

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-combobox-item]");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          selectMachine(filtered[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const selectMachine = (m: MachineOption) => {
    onChange(m.machine_id);
    setSearch("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const clearSelection = () => {
    onChange("");
    setSearch("");
    inputRef.current?.focus();
  };

  const selectedMachine = machines.find((m) => m.machine_id === value);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input field */}
      <div
        className={`
          flex items-center gap-2 w-full px-4 py-3 border-2 rounded-xl
          transition-all duration-200 cursor-text
          ${disabled ? "bg-gray-100 dark:bg-zinc-800/50 cursor-not-allowed opacity-60" : "bg-white dark:bg-zinc-800"}
          ${isOpen
            ? "border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/10 dark:ring-blue-400/10 shadow-lg shadow-blue-500/5"
            : "border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600"
          }
        `}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Cpu size={18} className={`shrink-0 transition-colors ${isOpen ? "text-blue-500 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}`} />

        {selectedMachine && !isOpen ? (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
              {selectedMachine.modelo_maquina}
            </span>
            <span className="text-gray-900 dark:text-white text-sm truncate">
              {selectedMachine.machine_id}
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-xs truncate hidden sm:inline">
              (Serie: {selectedMachine.serie})
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={isOpen ? search : value}
            onChange={(e) => {
              setSearch(e.target.value);
              onChange(e.target.value);
              if (!isOpen) setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => { if (!disabled) setIsOpen(true); }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
        )}

        {value && !disabled && (
          <button
            onClick={(e) => { e.stopPropagation(); clearSelection(); }}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 dark:text-gray-500 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        )}

        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown list */}
      {isOpen && !disabled && (
        <div
          ref={listRef}
          className="
            absolute z-50 w-full mt-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700
            rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30
            max-h-64 overflow-y-auto overflow-x-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
          {/* Search bar inside dropdown */}
          <div className="sticky top-0 p-2 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <Search size={14} className="text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Filtrar por modelo, serie o ID..."
                className="flex-1 bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                autoFocus
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <Cpu size={24} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron máquinas</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Intenta con otro término o escribe manualmente</p>
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((m, idx) => (
                <button
                  key={m.id}
                  data-combobox-item
                  onClick={() => selectMachine(m)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg transition-all duration-100
                    flex items-start gap-3 group
                    ${idx === highlightedIndex
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                    }
                    ${value === m.machine_id ? "ring-1 ring-blue-200 dark:ring-blue-800 bg-blue-50/50 dark:bg-blue-900/10" : ""}
                  `}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Cpu size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                        {m.modelo_maquina}
                      </span>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {m.machine_id}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                      Serie: {m.serie}
                    </p>
                  </div>
                  {value === m.machine_id && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-1">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MachineCombobox;
