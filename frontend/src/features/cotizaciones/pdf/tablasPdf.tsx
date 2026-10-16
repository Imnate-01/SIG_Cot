import React from "react";
import { Text, View } from "@react-pdf/renderer";
import type { buildPdfStyles } from "./estilosPdf";
import { totalServicioExterno, type ServicioExterno } from "../pricing";

/**
 * Piezas compartidas por los dos PDFs de cotización (vista previa y guardada).
 *
 * Tabla de servicios técnicos: Ing. | Hrs/Ing. | Hrs. totales | P. Unit. | Total
 * En todas las líneas se cumple Total = Hrs. totales × P. Unit., así el cliente
 * puede comprobar la cuenta (antes la columna "Cant.Hrs." mostraba horas por
 * ingeniero en unas líneas y horas totales en las de viaje).
 */

type Estilos = ReturnType<typeof buildPdfStyles>;

export const formatCurrency = (val: number) =>
  (Number(val) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function EncabezadoServiciosPDF({ s, isUS }: { s: Estilos; isUS: boolean }) {
  return (
    <View style={s.tableHeader}>
      <Text style={s.colDesc}>{isUS ? "Detail" : "Detalle"}</Text>
      <Text style={s.colTiny}>{isUS ? "Eng." : "Ing."}</Text>
      <Text style={s.colSmall}>{isUS ? "Hrs/Eng." : "Hrs/Ing."}</Text>
      <Text style={s.colSmall}>{isUS ? "Total hrs." : "Hrs. totales"}</Text>
      <Text style={s.colSmall}>{isUS ? "Unit P." : "P. Unit."}</Text>
      <Text style={s.colSmall}>Total</Text>
    </View>
  );
}

export interface FilaServicioPDFProps {
  s: Estilos;
  isUS: boolean;
  concepto: string;
  desglose?: Array<{ nombre?: string; horas?: number | string }> | null;
  nota?: string | null;
  /** null = no aplica (Costo de Vuelo) */
  ingenieros: number | null;
  horasPorIngeniero: string | null;
  horasTotales: string | null;
  precioUnitario: number;
  total: number;
  fontSizeTotal: number;
}

export function FilaServicioPDF(p: FilaServicioPDFProps) {
  const { s, isUS } = p;
  const desglose = (Array.isArray(p.desglose) ? p.desglose : []).filter((d) => d?.nombre || Number(d?.horas) > 0);
  return (
    <View style={s.tableRow} wrap={false}>
      <View style={s.colDesc}>
        <Text>{p.concepto}</Text>
        {desglose.map((d, idx) => (
          <Text key={idx} style={s.desgloseText}>
            • {d.nombre || (isUS ? `Eng. ${idx + 1}` : `Ing. ${idx + 1}`)}: {Number(d.horas) || 0}h
          </Text>
        ))}
        {p.nota ? <Text style={s.notaText}>{isUS ? "Note: " : "Nota: "}{p.nota}</Text> : null}
      </View>
      <Text style={s.colTiny}>{p.ingenieros ?? "N/A"}</Text>
      <Text style={s.colSmall}>{p.horasPorIngeniero ?? "N/A"}</Text>
      <Text style={[s.colSmall, { fontWeight: "bold" }]}>{p.horasTotales ?? "N/A"}</Text>
      <Text style={[s.colSmall, { fontWeight: "bold" }]}>${formatCurrency(p.precioUnitario)}</Text>
      <Text style={[s.colSmall, { fontWeight: "bold", fontSize: p.fontSizeTotal }]}>${formatCurrency(p.total)}</Text>
    </View>
  );
}

/** Tabla libre de servicios externos / entrenamientos. */
export function TablaServiciosExternosPDF({
  s, isUS, titulo, servicios,
}: { s: Estilos; isUS: boolean; titulo?: string; servicios: ServicioExterno[] }) {
  if (servicios.length === 0) return null;
  return (
    <View style={s.table}>
      <Text style={s.sectionTitle}>
        {(titulo || "").trim() || (isUS ? "Additional services" : "Servicios adicionales")}
      </Text>
      <View style={s.tableHeader}>
        <Text style={s.colTiny}>{isUS ? "No." : "Orden"}</Text>
        <Text style={s.colDesc}>{isUS ? "Detail" : "Detalle"}</Text>
        <Text style={s.colSmall}>{isUS ? "Qty." : "Cant."}</Text>
        <Text style={s.colSmall}>{isUS ? "Unit P." : "P. Unit."}</Text>
        <Text style={s.colSmall}>Total</Text>
      </View>
      {servicios.map((sv, idx) => (
        <View key={idx} style={s.tableRow} wrap={false}>
          <Text style={s.colTiny}>{idx + 1}</Text>
          <Text style={s.colDesc}>{sv.detalle}</Text>
          <Text style={s.colSmall}>{Number(sv.cantidad) || 0}</Text>
          <Text style={[s.colSmall, { fontWeight: "bold" }]}>${formatCurrency(Number(sv.precioUnitario) || 0)}</Text>
          <Text style={[s.colSmall, { fontWeight: "bold" }]}>${formatCurrency(totalServicioExterno(sv))}</Text>
        </View>
      ))}
    </View>
  );
}

/** Subtotales y total. Si hay servicios externos, se desglosa de dónde sale el total. */
export function TotalesPDF({
  s, isUS, moneda, subtotalServicios, subtotalExternos, hayServicios, hayExternos,
}: {
  s: Estilos; isUS: boolean; moneda: string;
  subtotalServicios: number; subtotalExternos: number; hayServicios: boolean; hayExternos: boolean;
}) {
  const total = subtotalServicios + subtotalExternos;
  return (
    <View>
      {hayServicios && hayExternos ? (
        <>
          <View style={s.total}>
            <Text>{isUS ? "Technical services subtotal:" : "Subtotal servicios técnicos:"}</Text>
            <Text>${formatCurrency(subtotalServicios)} {moneda}</Text>
          </View>
          <View style={s.total}>
            <Text>{isUS ? "Additional services subtotal:" : "Subtotal servicios adicionales:"}</Text>
            <Text>${formatCurrency(subtotalExternos)} {moneda}</Text>
          </View>
        </>
      ) : (
        <View style={s.total}>
          <Text>Subtotal:</Text>
          <Text>${formatCurrency(total)} {moneda}</Text>
        </View>
      )}
      <View style={[s.total, { backgroundColor: "#dbeafe" }]}>
        <Text>TOTAL:</Text>
        <Text>${formatCurrency(total)} {moneda}</Text>
      </View>
    </View>
  );
}
