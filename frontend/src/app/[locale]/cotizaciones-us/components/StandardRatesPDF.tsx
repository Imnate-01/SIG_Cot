import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image
} from "@react-pdf/renderer";

/* ===================== Tipos ===================== */
export interface UsRates {
  regular: number;
  overtime: number;
  premium: number;
  travel_reg: number;
  travel_sat: number;
  travel_sun: number;
}

export interface TravelLeg {
  id: string;
  date: string;
  from: string;
  to: string;
  reg_hrs: number;
  sat_hrs: number;
  sun_hrs: number;
  total: number;
}

export interface LaborDay {
  id: string;
  date: string;
  type: string; // e.g. "MONDAY REG"
  reg_hrs: number;
  ot_hrs: number;
  premium_hrs: number;
  total: number;
}

export interface CotizacionUsFormData {
  customer: string;
  city_state: string;
  scope_of_visit: string;
  equipment_to_service: string;
  payment_terms: string;
  quoted_by: string;
  quote_date: string;
  quote_number: string;
  travel_legs: TravelLeg[];
  labor_schedule: LaborDay[];
  preparation_amount: number;
  expenses_amount: number;
  calibration_amount: number;
  sales_accommodation_amount: number;
  travel_subtotal: number;
  labor_subtotal: number;
  grand_total: number;
  rates: UsRates;
}

interface StandardRatesPDFProps {
  formData: CotizacionUsFormData;
}

/* ===================== Estilos ===================== */
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, alignItems: 'flex-start' },
  logo: { width: 60, height: 60, objectFit: "contain", marginBottom: 5 },
  headerRight: { textAlign: "right" },
  title: { fontSize: 12, fontWeight: "bold", color: "#1e3a8a", marginBottom: 10 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { fontSize: 10, fontWeight: "bold", width: 120 },
  value: { fontSize: 10, flex: 1 },
  
  // Rates table
  ratesTable: { marginTop: 10, marginBottom: 10, borderTop: "1px solid #000", borderBottom: "1px solid #000", paddingVertical: 5 },
  ratesTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 4 },
  ratesRow: { flexDirection: "row", marginBottom: 2 },
  ratesType: { width: 160, fontSize: 9 },
  ratesDesc: { flex: 1, fontSize: 9 },

  // Sections
  sectionTitle: { fontSize: 10, fontWeight: "bold", backgroundColor: "#f3f4f6", padding: 4, marginTop: 10, marginBottom: 5 },
  tableHeader: { flexDirection: "row", borderBottom: "1px solid #000", paddingBottom: 2, marginBottom: 4, fontWeight: "bold", fontSize: 9 },
  tableRow: { flexDirection: "row", marginBottom: 3, fontSize: 9 },
  
  // Columns
  colDate: { width: 70 },
  colFrom: { width: 50 },
  colCity: { width: 120 },
  colHrs: { width: 30, textAlign: "right" },
  colCalc: { width: 140 },
  colTotal: { width: 60, textAlign: "right" },
  
  colLaborType: { width: 150 },

  // Summary
  summaryContainer: { marginTop: 15, alignSelf: "flex-end", width: 250 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, fontSize: 10 },
  summaryLabel: { fontWeight: "bold" },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", marginTop: 5, paddingTop: 5, borderTop: "2px solid #000", fontSize: 11, fontWeight: "bold" },

  // Footer
  footer: { marginTop: "auto", fontSize: 8 },
  quotedBy: { marginBottom: 10, fontSize: 10 },
  termsText: { fontSize: 7, textAlign: "justify", lineHeight: 1.2, color: "#4b5563" },
  revision: { fontSize: 7, marginTop: 10 }
});

const formatCurrency = (val: number) => val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ===================== Componente PDF ===================== */
const StandardRatesPDF: React.FC<StandardRatesPDFProps> = ({ formData }) => {
  const { rates } = formData;

  const totalTravelHrs = formData.travel_legs.reduce((sum, leg) => sum + leg.reg_hrs + leg.sat_hrs + leg.sun_hrs, 0);
  const totalLaborHrs = formData.labor_schedule.reduce((sum, day) => sum + day.reg_hrs + day.ot_hrs + day.premium_hrs, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Encabezado */}
        <View style={styles.header}>
          <Image style={styles.logo} src="/SIG_logo.png" />
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 10 }}><Text style={{ fontWeight: "bold" }}>QUOTE #:</Text> {formData.quote_number || "PENDING"}</Text>
          </View>
        </View>
        
        <Text style={styles.title}>SIG SERVICE QUOTE - STANDARD RATES USD</Text>
        
        <View style={styles.row}>
          <Text style={styles.label}>CUSTOMER:</Text>
          <Text style={styles.value}>{formData.customer || "N/A"}</Text>
          <Text style={{ width: 70, fontWeight: "bold" }}>CITY/STATE:</Text>
          <Text style={{ flex: 1 }}>{formData.city_state || "N/A"}</Text>
        </View>
        
        <View style={styles.row}>
          <Text style={styles.label}>SCOPE OF VISIT:</Text>
          <Text style={styles.value}>{formData.scope_of_visit || "N/A"}</Text>
        </View>
        
        {formData.equipment_to_service && (
          <View style={styles.row}>
            <Text style={styles.label}>EQUIPMENT TO BE SERVICED:</Text>
            <Text style={styles.value}>{formData.equipment_to_service}</Text>
          </View>
        )}

        {formData.payment_terms && (
          <View style={styles.row}>
            <Text style={styles.label}>PAYMENT TERMS:</Text>
            <Text style={styles.value}>{formData.payment_terms}</Text>
          </View>
        )}

        {/* Tabla de Tarifas */}
        <View style={styles.ratesTable}>
          <Text style={styles.ratesTitle}>FIELD SERVICE RATES - USA</Text>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>REGULAR TIME ${formatCurrency(rates.regular)}/HR</Text>
            <Text style={styles.ratesDesc}>M-F 8AM-4PM</Text>
          </View>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>OVERTIME ${formatCurrency(rates.overtime)}/HR</Text>
            <Text style={styles.ratesDesc}>M-F 4PM-8AM/WEEKDAYS OVER 8HRS</Text>
          </View>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>PREMIUM TIME ${formatCurrency(rates.premium)}/HR</Text>
            <Text style={styles.ratesDesc}>SATURDAY, SUNDAY & HOLIDAYS</Text>
          </View>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>TRAVEL TIME ${formatCurrency(rates.travel_reg)}/HR</Text>
            <Text style={styles.ratesDesc}>TRAVEL TIME DOOR TO DOOR MONDAY - FRIDAY</Text>
          </View>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>PREMIUM 1 TRAVEL TIME ${formatCurrency(rates.travel_sat)}/HR</Text>
            <Text style={styles.ratesDesc}>TRAVEL TIME ON SATURDAY</Text>
          </View>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>PREMIUM 2 TRAVEL TIME ${formatCurrency(rates.travel_sun)}/HR</Text>
            <Text style={styles.ratesDesc}>TRAVEL TIME ON SUNDAYS & HOLIDAYS</Text>
          </View>
          <View style={styles.ratesRow}>
            <Text style={styles.ratesType}>EXPENSES AT COST</Text>
            <Text style={styles.ratesDesc}>INCLUDES: AIRFARE OR MILEAGE, HOTEL, MEALS, MISC.</Text>
          </View>
        </View>

        {/* TRAVEL TIME */}
        <Text style={styles.sectionTitle}>TRAVEL TIME</Text>
        {formData.travel_legs.map((leg, index) => (
          <View key={`travel-${index}`}>
            <View style={styles.tableRow}>
              <Text style={styles.colDate}>{leg.date}</Text>
              <Text style={styles.colFrom}>FROM:</Text>
              <Text style={styles.colCity}>{leg.from}</Text>
              
              {leg.reg_hrs > 0 ? (
                <>
                  <Text style={styles.colHrs}>{leg.reg_hrs}</Text>
                  <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.travel_reg)} = ${formatCurrency(leg.reg_hrs * rates.travel_reg)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.colHrs}></Text>
                  <Text style={styles.colCalc}></Text>
                </>
              )}
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.colDate}></Text>
              <Text style={styles.colFrom}>TO:</Text>
              <Text style={styles.colCity}>{leg.to}</Text>
              
              {leg.sat_hrs > 0 ? (
                <>
                  <Text style={styles.colHrs}>{leg.sat_hrs}</Text>
                  <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.travel_sat)} = ${formatCurrency(leg.sat_hrs * rates.travel_sat)}</Text>
                </>
              ) : leg.sun_hrs > 0 ? (
                <>
                  <Text style={styles.colHrs}>{leg.sun_hrs}</Text>
                  <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.travel_sun)} = ${formatCurrency(leg.sun_hrs * rates.travel_sun)}</Text>
                </>
              ) : (
                <>
                   <Text style={styles.colHrs}></Text>
                   <Text style={styles.colCalc}></Text>
                </>
              )}
            </View>
          </View>
        ))}
        <View style={[styles.tableRow, { marginTop: 4, fontWeight: "bold" }]}>
          <Text style={{ width: 120 }}>TOTAL HRS = {totalTravelHrs}</Text>
          <Text style={{ flex: 1 }}>TRAVEL SUBTOTAL = ${formatCurrency(formData.travel_subtotal)}</Text>
        </View>

        {/* LABOR */}
        <Text style={styles.sectionTitle}>LABOR</Text>
        {formData.labor_schedule.map((day, index) => (
          <View key={`labor-${index}`}>
            <View style={styles.tableRow}>
              <Text style={styles.colDate}>{day.date}</Text>
              <Text style={styles.colLaborType}>{day.type}</Text>
              
              {/* Display primary logic based on what type is filled */}
              {(day.type.includes("SUNDAY") || day.type.includes("SATURDAY")) ? (
                <>
                  <Text style={styles.colHrs}>{day.premium_hrs || ''}</Text>
                  <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.premium)} = ${formatCurrency(day.premium_hrs * rates.premium)}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.colHrs}>{day.reg_hrs || ''}</Text>
                  <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.regular)} = ${formatCurrency(day.reg_hrs * rates.regular)}</Text>
                </>
              )}
            </View>
            
            {/* Si es día normal y tiene OT */}
            {(!day.type.includes("SUNDAY") && !day.type.includes("SATURDAY") && (day.ot_hrs > 0 || day.reg_hrs > 0)) && (
              <View style={styles.tableRow}>
                <Text style={styles.colDate}></Text>
                <Text style={styles.colLaborType}>OT</Text>
                <Text style={styles.colHrs}>{day.ot_hrs || ''}</Text>
                <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.overtime)} = ${formatCurrency(day.ot_hrs * rates.overtime)}</Text>
              </View>
            )}
          </View>
        ))}
        <View style={[styles.tableRow, { marginTop: 4, fontWeight: "bold" }]}>
          <Text style={{ width: 120 }}>TOTAL HRS = {totalLaborHrs}</Text>
          <Text style={{ flex: 1 }}>LABOR SUBTOTAL = ${formatCurrency(formData.labor_subtotal)}</Text>
        </View>

        {/* PREPARATION TIME */}
        <Text style={styles.sectionTitle}>PREPARATION TIME</Text>
        <View style={styles.tableRow}>
          <Text style={{ width: 220 }}>REG</Text>
          <Text style={styles.colHrs}>{formData.preparation_amount / rates.regular || ''}</Text>
          <Text style={styles.colCalc}>HRS X ${formatCurrency(rates.regular)} = ${formatCurrency(formData.preparation_amount)}</Text>
        </View>

        {/* EXPENSES */}
        <Text style={styles.sectionTitle}>EXPENSES</Text>
        <View style={styles.tableRow}>
          <Text style={{ flex: 1 }}>BILLED AT COST (INCLUDES: AIRFARE OR MILEAGE, HOTEL, MEALS, MISC.)</Text>
          <Text style={{ width: 180, fontWeight: "bold" }}>EXPENSE SUBTOTAL = ${formatCurrency(formData.expenses_amount)}</Text>
        </View>

        {/* SUMMARY COLUMNS */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>TRAVEL SUBTOTAL =</Text>
            <Text>${formatCurrency(formData.travel_subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>LABOR SUBTOTAL =</Text>
            <Text>${formatCurrency(formData.labor_subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>EXPENSE SUBTOTAL =</Text>
            <Text>${formatCurrency(formData.expenses_amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>PREPARATION SUBTOTAL =</Text>
            <Text>${formatCurrency(formData.preparation_amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>(SEE PAGE 2) CALIBRATION SUBTOTAL =</Text>
            <Text>${formatCurrency(formData.calibration_amount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>SALES ACCOMMODATION SUBTOTAL =</Text>
            <Text>${formatCurrency(formData.sales_accommodation_amount)}</Text>
          </View>
          
          <View style={styles.grandTotal}>
            <Text>GRAND TOTAL =</Text>
            <Text>${formatCurrency(formData.grand_total)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.quotedBy}>Quoted by {formData.quoted_by} on: {formData.quote_date}</Text>
          
          <Text style={styles.termsText}>
            "Terms and Conditions: If there is an existing written agreement between Customer and SIG governing the sale of the products or services quoted herein, the terms of that agreement shall apply. In the absence of such agreement, this Quotation and any resulting orders are subject to SIG's General Terms and Conditions of Sale, a current copy of which can be found at https://www.sig.biz/en/general-terms-and-conditions-for-customers ("GTC"). By placing an order, Customer agrees to be bound by the GTC, which are incorporated by reference. Any terms in Customer's purchase order or other documents that are different from, or in addition to, the GTC are expressly rejected and shall have no effect unless accepted by SIG in a signed writing."
          </Text>
          
          <Text style={styles.revision}>SQ_STANDARDRATES_2026_REV1</Text>
        </View>

      </Page>
    </Document>
  );
};

export default StandardRatesPDF;
