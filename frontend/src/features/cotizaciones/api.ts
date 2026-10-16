/**
 * Llamadas al backend para los catálogos del formulario de cotizaciones.
 * (Antes este código estaba copiado 4 veces entre "nueva" y "editar".)
 */
import api from "@/services/api";
import { conceptoRequiereDesglose, type TarifasCliente } from "./pricing";
import type { ClientePredefinido, Tarifa, UsuarioRegistrado } from "./types";

/** El backend responde { success, data }; algunos endpoints viejos devolvían el arreglo directo. */
function extraerLista<T>(respuesta: unknown): T[] {
  if (Array.isArray(respuesta)) return respuesta as T[];
  const data = (respuesta as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? (data as T[]) : [];
}

interface ServicioApi {
  id: number | string;
  concepto: string;
  unidad: Tarifa["unidad"];
  precio_sin_contrato: number | string;
  precio_con_contrato: number | string;
  moneda?: string;
  categoria?: string | null;
}

export function mapearServicio(s: ServicioApi): Tarifa {
  return {
    id: s.id,
    concepto: s.concepto,
    unidad: s.unidad,
    precio_sin_contrato: Number(s.precio_sin_contrato),
    precio_con_contrato: Number(s.precio_con_contrato),
    moneda: s.moneda,
    requiere_desglose: conceptoRequiereDesglose(s.concepto),
    categoria: s.categoria || "Servicio Técnico",
  };
}

/** Catálogo de servicios activos de una región (MX, US, CA). */
export async function obtenerServicios(region: string): Promise<Tarifa[]> {
  const { data } = await api.get(`/servicios?region=${encodeURIComponent(region)}`);
  return extraerLista<ServicioApi>(data).map(mapearServicio);
}

export async function obtenerClientes(): Promise<ClientePredefinido[]> {
  const { data } = await api.get("/clientes");
  return extraerLista<ClientePredefinido>(data);
}

export async function obtenerUsuarios(): Promise<UsuarioRegistrado[]> {
  const { data } = await api.get("/usuarios");
  return extraerLista<UsuarioRegistrado>(data);
}

/** Tarifas especiales del cliente: { [servicio_id]: precio_contrato }. */
export async function obtenerTarifasCliente(clienteId: string | number): Promise<TarifasCliente> {
  const { data } = await api.get(`/tarifas-cliente/${encodeURIComponent(String(clienteId))}`);
  const tarifas: TarifasCliente = {};
  for (const tc of extraerLista<{ servicio_id: number | string; precio_contrato: number | string }>(data)) {
    tarifas[String(tc.servicio_id)] = Number(tc.precio_contrato);
  }
  return tarifas;
}
