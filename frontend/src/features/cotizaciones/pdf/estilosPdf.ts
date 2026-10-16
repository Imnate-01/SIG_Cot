import { StyleSheet } from "@react-pdf/renderer";

/**
 * Estilos del PDF de cotización. Se escalan según el número de partidas para
 * que la cotización quepa en una sola hoja.
 */
export const buildPdfStyles = (itemCount: number) => {
    const scale = itemCount <= 3 ? 1 : itemCount <= 5 ? 0.9 : itemCount <= 7 ? 0.8 : itemCount <= 9 ? 0.72 : 0.65;
    return StyleSheet.create({
        page: { padding: 30 * scale + 5, fontSize: 10 * scale, fontFamily: "Helvetica" },
        header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 * scale, paddingBottom: 6 * scale, borderBottom: "2px solid #2563eb", alignItems: 'center' },
        logo: { width: 50 * scale + 10, height: 50 * scale + 10, marginBottom: 3 * scale, objectFit: "contain" as const },
        companyName: { fontSize: 13 * scale, fontWeight: "bold" },
        headerRight: { textAlign: "right" as const },
        section: { marginBottom: 6 * scale },
        sectionTitle: { fontSize: 9 * scale, fontWeight: "bold", backgroundColor: "#f3f4f6", padding: 3 * scale, marginBottom: 2 * scale },
        row: { flexDirection: "row" as const, marginBottom: 6 * scale },
        column: { flex: 1, marginRight: 8 * scale },
        label: { fontSize: 8 * scale, fontWeight: "bold", marginBottom: 1 },
        value: { fontSize: 9 * scale, marginBottom: 1, lineHeight: 1.3 },
        table: { marginTop: 6 * scale, marginBottom: 8 * scale },
        tableHeader: { flexDirection: "row" as const, backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db", padding: 4 * scale, fontWeight: "bold", fontSize: 8 * scale },
        tableRow: { flexDirection: "row" as const, borderBottom: "1px solid #e5e7eb", padding: 3 * scale, fontSize: 8 * scale },
        colDesc: { flex: 2 },
        colTiny: { width: 35, textAlign: "center" as const },
        colSmall: { width: 52, textAlign: "center" as const },
        total: { flexDirection: "row" as const, justifyContent: "space-between" as const, backgroundColor: "#dbeafe", padding: 4 * scale, marginTop: 2 * scale, fontWeight: "bold", fontSize: 9 * scale },
        footer: { textAlign: "center" as const, fontSize: 7 * scale, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 5 * scale, marginTop: 8 * scale },
        signatureSection: { marginTop: 10 * scale, marginBottom: 4 * scale },
        signatureText: { fontSize: 9 * scale, marginBottom: 3 * scale, color: "#000", lineHeight: 1.3 },
        signatureImage: { width: 80 * scale + 20, height: 40 * scale + 10, objectFit: "contain" as const, marginLeft: 0, marginBottom: 0 },
        signatureLine: { borderBottom: "1px solid #000", width: 150 * scale + 30, marginTop: 3 * scale, marginBottom: 2 * scale },
        signatureName: { fontSize: 9 * scale, fontWeight: "bold" },
        signatureJob: { fontSize: 9 * scale, fontWeight: "bold" },
        desgloseText: { fontSize: 7 * scale, color: "#4b5563", marginLeft: 4, marginTop: 1 },
        notaText: { fontSize: 7 * scale, color: "#6b7280", fontStyle: "italic" as const, marginTop: 1 },
        descripcionBadge: { fontSize: 8 * scale, color: "#4b5563", marginTop: 2, fontStyle: "italic" as const }
    });
};
