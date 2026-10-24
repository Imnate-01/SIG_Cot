import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatearFecha, type PmDetalle } from "../pm";
import type { EstadoReporte, Reporte } from "../reporte";

/** Colores de la identidad SIG (mismos que globals.css). */
const C = {
  azul: "#145EFC", tinta: "#000000", gris: "#73706D", arena: "#F2EFEB", linea: "#E5DFD9",
  verde: "#167665", verdeSuave: "#E4F1ED", rojo: "#C4262E", rojoSuave: "#FBE4E6", amarillo: "#A09B05", amarilloSuave: "#F7F5C6",
};

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 40, paddingHorizontal: 28, fontSize: 8.5, fontFamily: "Helvetica", color: C.tinta },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `2px solid ${C.azul}`, paddingBottom: 8, marginBottom: 12 },
  logo: { width: 54, height: 30, objectFit: "contain" },
  titulo: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, color: C.gris, marginTop: 2 },
  derecha: { textAlign: "right" },
  datos: { flexDirection: "row", flexWrap: "wrap", border: `1px solid ${C.linea}`, borderRadius: 3, padding: 8, marginBottom: 10 },
  dato: { width: "25%", marginBottom: 5, paddingRight: 6 },
  etiqueta: { fontSize: 6.5, color: C.gris, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 1 },
  valor: { fontSize: 8.5 },
  resumen: { flexDirection: "row", marginBottom: 12 },
  kpi: { flex: 1, backgroundColor: C.arena, borderRadius: 3, padding: 7, marginRight: 6 },
  kpiNum: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  kpiTxt: { fontSize: 6.5, color: C.gris, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginTop: 1 },
  etapa: { flexDirection: "row", justifyContent: "space-between", backgroundColor: C.arena, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  etapaTxt: { fontFamily: "Helvetica-Bold", fontSize: 8.5, textTransform: "uppercase" },
  cab: { flexDirection: "row", borderBottom: `1px solid ${C.linea}`, paddingVertical: 3, paddingHorizontal: 6, fontFamily: "Helvetica-Bold", fontSize: 7, color: C.gris },
  fila: { flexDirection: "row", borderBottom: `1px solid ${C.linea}`, paddingVertical: 4, paddingHorizontal: 6 },
  cId: { width: 38, fontFamily: "Helvetica-Bold", color: C.gris },
  cTarea: { flex: 2.4, paddingRight: 6 },
  cFecha: { width: 64 },
  cEstado: { width: 60 },
  cQuien: { width: 110, paddingRight: 4 },
  cEv: { width: 96, paddingRight: 4 },
  cNotas: { flex: 1.6 },
  pequeño: { fontSize: 7, color: C.gris, marginTop: 1 },
  chip: { fontSize: 7, fontFamily: "Helvetica-Bold", paddingVertical: 1, paddingHorizontal: 3, borderRadius: 2, alignSelf: "flex-start" },
  notas: { border: `1px solid ${C.linea}`, borderRadius: 3, padding: 8, marginTop: 12 },
  pie: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.gris, borderTop: `1px solid ${C.linea}`, paddingTop: 4 },
});

const CHIP: Record<EstadoReporte, { backgroundColor: string; color: string }> = {
  Completed: { backgroundColor: C.verdeSuave, color: C.verde },
  Overdue: { backgroundColor: C.rojoSuave, color: C.rojo },
  "Due soon": { backgroundColor: C.amarilloSuave, color: C.tinta },
  Pending: { backgroundColor: C.arena, color: C.gris },
};

const ESTADO_PM: Record<string, string> = { active: "Active", completed: "Completed", cancelled: "Cancelled" };

/** Reporte del PM: datos, avance y cada tarea por etapa con responsable, evidencia y notas. */
export default function ReportePmPDF({ pm, reporte, generado, logoUrl }: { pm: PmDetalle; reporte: Reporte; generado: string; logoUrl: string }) {
  const r = reporte.resumen;
  const datos: Array<[string, string | null]> = [
    ["Customer contact", pm.contacto_nombre], ["Customer phone", pm.contacto_telefono], ["Customer email", pm.contacto_correo], ["SAM", pm.sam],
    ["Customer PO #", pm.po_numero], ["Lead FSE — Filler", pm.fse_filler], ["Lead FSE — Downline", pm.fse_downline], ["Status", ESTADO_PM[pm.estado] || pm.estado],
    ["PM start date", formatearFecha(pm.fecha_inicio)], ["PM end date", formatearFecha(pm.fecha_fin)],
  ];
  const kpis: Array<[string, string, string?]> = [
    [`${r.completadas}/${r.total}`, `Tasks completed (${r.porcentaje}%)`],
    [String(r.restantes), "Remaining"],
    [String(r.vencidas), "Overdue", r.vencidas ? C.rojo : undefined],
    [String(r.archivos + r.cotizaciones), "Evidence attached"],
    [String(r.faltaEvidencia), "Required evidence missing", r.faltaEvidencia ? C.rojo : undefined],
  ];
  return (
    <Document title={`PM report — ${pm.clientes?.nombre || ""}`} author="SIG · PM Tracker">
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <View style={s.header} fixed>
          <Image style={s.logo} src={logoUrl} />
          <View style={s.derecha}>
            <Text style={s.titulo}>PM Execution Report</Text>
            <Text style={s.sub}>{pm.clientes?.nombre || "—"}{[pm.planta, pm.linea].filter(Boolean).length ? ` · ${[pm.planta, pm.linea].filter(Boolean).join(" · ")}` : ""}</Text>
          </View>
        </View>

        <View style={s.datos}>
          {datos.map(([k, v]) => (
            <View key={k} style={s.dato}><Text style={s.etiqueta}>{k}</Text><Text style={s.valor}>{v || "—"}</Text></View>
          ))}
        </View>

        <View style={s.resumen}>
          {kpis.map(([n, t, color], i) => (
            <View key={t} style={[s.kpi, i === kpis.length - 1 ? { marginRight: 0 } : {}]}>
              <Text style={[s.kpiNum, color ? { color } : {}]}>{n}</Text><Text style={s.kpiTxt}>{t}</Text>
            </View>
          ))}
        </View>

        {reporte.etapas.map((e) => (
          <View key={e.nombre} wrap={false} style={{ marginBottom: 2 }}>
            <View style={s.etapa}>
              <Text style={s.etapaTxt}>{e.nombre}</Text>
              <Text style={{ fontSize: 8 }}>Due {e.fecha} · {e.completadas}/{e.total}</Text>
            </View>
            <View style={s.cab}>
              <Text style={s.cId}>ID</Text><Text style={s.cTarea}>Task</Text><Text style={s.cFecha}>Due</Text><Text style={s.cEstado}>Status</Text>
              <Text style={s.cQuien}>Completed by / responsible</Text><Text style={s.cEv}>Evidence</Text><Text style={s.cNotas}>Notes / exceptions</Text>
            </View>
            {e.filas.map((f) => (
              <View key={f.codigo} style={s.fila}>
                <Text style={s.cId}>{f.codigo}</Text>
                <Text style={s.cTarea}>{f.titulo}</Text>
                <Text style={s.cFecha}>{f.fecha}</Text>
                <View style={s.cEstado}><Text style={[s.chip, CHIP[f.estado]]}>{f.estado}</Text></View>
                <View style={s.cQuien}>
                  <Text>{f.responsable || "—"}</Text>
                  {f.cuando ? <Text style={s.pequeño}>{f.cuando}</Text> : null}
                  {f.colaboradores ? <Text style={s.pequeño}>With: {f.colaboradores}</Text> : null}
                </View>
                <Text style={[s.cEv, f.evidencias.startsWith("Missing") ? { color: C.rojo, fontFamily: "Helvetica-Bold" } : {}]}>{f.evidencias || "—"}</Text>
                <Text style={s.cNotas}>{f.notas || ""}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.notas} wrap={false}>
          <Text style={[s.etiqueta, { marginBottom: 4 }]}>Open notes / unusual items / follow-up actions</Text>
          <Text>{pm.notas_abiertas || "—"}</Text>
        </View>

        <View style={s.pie} fixed>
          <Text>SIG · PM Tracker · Generated {generado}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
