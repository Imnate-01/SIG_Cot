
import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, DollarSign, User, Building2 } from 'lucide-react';
import Link from 'next/link';

export interface Cotizacion {
    id: number;
    numero_cotizacion: string;
    fecha_creacion: string;
    total: number;
    estado: string;
    estatus_po: string;
    clientes: { nombre: string; empresa: string };
    usuarios: { nombre: string };
    creado_por_nombre: string;
    descripcion?: string; // Nuevo campo opcional
}

interface KanbanCardProps {
    cotizacion: Cotizacion;
    index: number;
}

export const KanbanCard = ({ cotizacion, index }: KanbanCardProps) => {
    return (
        <Draggable draggableId={String(cotizacion.id)} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`
            bg-white dark:bg-zinc-800 
            p-4 rounded-xl shadow-sm border border-slate-200 dark:border-zinc-700 
            mb-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
            ${snapshot.isDragging ? 'shadow-lg rotate-2 scale-105 z-50 ring-2 ring-blue-500' : ''}
          `}
                >
                    {/* Header: Folio y Fecha */}
                    <div className="flex justify-between items-start mb-2">
                        <Link
                            href={`/cotizaciones/${cotizacion.id}`}
                            className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded hover:underline"
                        >
                            {cotizacion.numero_cotizacion}
                        </Link>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(cotizacion.fecha_creacion).toLocaleDateString()}
                        </span>
                    </div>



                    {/* Cliente */}
                    <div className="mb-3">
                        <h4 className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-1">
                            {cotizacion.clientes?.empresa || "Sin Empresa"}
                        </h4>

                        {/* Descripción — solo renderiza si existe */}
                        {cotizacion.descripcion && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1 line-clamp-1 border-l-2 border-blue-400 dark:border-blue-500 pl-2">
                                {cotizacion.descripcion}
                            </p>
                        )}

                        <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <User size={10} />
                            {cotizacion.clientes?.nombre || "Sin Contacto"}
                        </p>
                    </div>

                    {/* Footer: Total y Creador */}
                    <div className="flex justify-between items-end border-t border-slate-100 dark:border-zinc-700 pt-3 mt-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Total</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                                <DollarSign size={12} className="mr-0.5" />
                                {cotizacion.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Avatar pequeño del creador */}
                        <div
                            className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-zinc-600"
                            title={`Creado por: ${cotizacion.creado_por_nombre}`}
                        >
                            {cotizacion.creado_por_nombre?.charAt(0) || "?"}
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
};
