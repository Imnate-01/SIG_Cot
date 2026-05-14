/** Helpers para renderizar secciones técnicas del PDF */

const n = (v: any, unit = '') =>
  v !== null && v !== undefined ? `${v}${unit}` : '<span style="color:#94a3b8">—</span>';

/** Tabla genérica de parámetros con HH/HS/SP/L/LL */
function paramTable(
  title: string,
  icon: string,
  rows: Array<{ label: string; unit: string; hh?: any; hs?: any; sp?: any; l?: any; ll?: any; actual?: any }>,
): string {
  const trs = rows.map(r => {
    const a = r.actual;
    let cls = 'actual-empty';
    if (a !== null && a !== undefined) {
      const hh = r.hh ?? Infinity, ll = r.ll ?? -Infinity;
      cls = (a > hh || a < ll) ? 'actual-err' : 'actual-ok';
    }
    return `<tr>
      <td>${r.label}</td>
      <td style="text-align:center;color:#94a3b8;font-size:7.5pt">${r.unit}</td>
      <td class="hh">${n(r.hh)}</td><td class="hs">${n(r.hs)}</td>
      <td class="sp">${n(r.sp)}</td><td class="ls">${n(r.l)}</td>
      <td class="hh">${n(r.ll)}</td>
      <td class="${cls}">${n(a)}</td>
    </tr>`;
  }).join('');

  return `<div class="psec">
    <div class="psec-title">${icon} ${title}</div>
    <table class="ptable">
      <thead><tr>
        <th style="text-align:left;min-width:180px">Parámetro</th>
        <th>Unidad</th>
        <th class="hh">HH</th><th class="hs">HS</th>
        <th class="sp">SP</th><th>L</th><th class="hh">LL</th>
        <th>Actual</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>
  </div>`;
}

/** Extrae valor del objeto de valores del wizard */
const v = (vals: Record<string, any>, key: string) =>
  vals && vals[key] !== undefined ? vals[key] : null;

// ─── SECCIÓN 2: Dedusting & Sterile Air ───────────────────────────────────
export function sectionDedusting(wd: any): string {
  const vals = wd?.dedusterValues || {};
  return `
  <div class="section-break">
    <div class="section-heading">
      <div class="section-icon">2</div>
      <h2>Dedusting Unit &amp; Sterile Air Balance</h2>
    </div>
      ${paramTable('Dedusting Unit', '🔧', [
        { label: 'Tank Pressure Dedusting', unit: 'mbar', hh: 5.5, hs: 5.0, sp: 4.0, l: 3.5, ll: 3.0, actual: v(vals, 'Tank Pressure Dedusting') },
        { label: 'CAM ON',  unit: '°', sp: 60,  actual: v(vals, 'CAM ON') },
        { label: 'CAM OFF', unit: '°', sp: 220, actual: v(vals, 'CAM OFF') },
      ])}
      ${paramTable('Sterile Air Balance', '🌬️', [
        { label: 'Pressure sterile air fan Production',         unit: 'mbar', hh: 35, hs: 32, sp: 30, l: 28, ll: 25, actual: v(vals, 'Pressure sterile air fan Production') },
        { label: 'Pressure sterile air fan outside production', unit: 'mbar', hh: 10, hs: 5,  sp: 3,  l: null, ll: 0, actual: v(vals, 'Pressure sterile air fan outside production') },
        { label: 'Pressure loss prefilter',                    unit: 'mbar', hh: 5,  hs: 4,  sp: 2,  l: 0, ll: 0, actual: v(vals, 'Pressure loss prefilter') },
        { label: 'Pressure loss (HEPA) filter',                unit: 'mbar', hh: 8,  hs: 6,  sp: 2,  l: 0, ll: 0, actual: v(vals, 'Pressure loss (HEPA) filter') },
        { label: 'Exhaust output',                             unit: 'µbar', hh: 1500, hs: 1400, sp: 1200, l: 800, ll: 700, actual: v(vals, 'Exhaust output') },
        { label: 'Pressure loss flap exhaust',                 unit: 'µbar', sp: 100, actual: v(vals, 'Pressure loss flap exhaust') },
      ])}
      ${paramTable('Sterile Air Household', '📊', [
        { label: 'Infeed total',  unit: 'mbar', actual: v(vals, 'Infeed total') },
        { label: 'Exhaust total', unit: 'mbar', actual: v(vals, 'Exhaust total') },
      ])}
  </div>`;
}

// ─── SECCIÓN 3: H₂O₂ ─────────────────────────────────────────────────────
export function sectionH2O2(wd: any): string {
  const vals = wd?.h2o2Values || {};
  const prov = wd?.h2o2Proveedor || '—';
  const tipo = wd?.h2o2Tipo || '—';
  const conc = wd?.h2o2Concentracion ?? '—';

  const t1234Params = [
    { label: 'Spray qty H₂O₂ Prod. A/wine (≥500ml)', unit: 'µl/s', hh: 380, hs: 355, sp: 330, l: 305, ll: 280, key: 'Spray qty H₂O₂ Prod. A/wine (≥500ml)' },
    { label: 'Spray qty H₂O₂ Prod. AL (≥500ml)',    unit: 'µl/s', hh: 500, hs: 475, sp: 450, l: 425, ll: 400, key: 'Spray qty H₂O₂ Prod. AL (≥500ml)' },
    { label: 'Spray qty H₂O₂ Prod. Reduced',        unit: 'µl/s', hh: 275, hs: 250, sp: 225, l: 200, ll: 175, key: 'Spray qty H₂O₂ Prod. Reduced' },
    { label: 'Spray qty H₂O₂ Sterilization',        unit: 'µl/s', hh: 350, hs: 325, sp: 300, l: 275, ll: 250, key: 'Spray qty H₂O₂ Sterilization' },
  ];

  return `
  <div class="section-break">
    <div class="section-heading">
      <div class="section-icon">3</div>
      <h2>H₂O₂ — Dosificación y Parámetros</h2>
    </div>
      <div class="psec">
        <div class="psec-title">⚗️ Datos del H₂O₂</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;padding:4mm 0">
          <div><div class="info-label">Proveedor</div><div class="info-value">${prov}</div></div>
          <div><div class="info-label">Tipo</div><div class="info-value">${tipo}</div></div>
          <div><div class="info-label">Concentración</div><div class="info-value">${conc}%</div></div>
        </div>
      </div>
      ${paramTable('Dosificación H₂O₂ — Tracks 1/2', '💧', t1234Params.map(p => ({ ...p, actual: v(vals, `t12_${p.key}`) })))}
      ${paramTable('Dosificación H₂O₂ — Tracks 3/4', '💧', t1234Params.map(p => ({ ...p, actual: v(vals, `t34_${p.key}`) })))}
      ${paramTable('Parámetros Generales H₂O₂', '⚙️', [
        { label: 'H₂O₂ medium temperature',                     unit: '°C',   hh: 290, hs: 285, sp: 270, l: 255, ll: 250, actual: v(vals, 'gen_H₂O₂ medium temperature') },
        { label: 'Temperature upper H₂O₂ heater',               unit: '°C',   hh: 180, hs: 180, sp: 160, l: 140, ll: 140, actual: v(vals, 'gen_Temperature upper H₂O₂ heater') },
        { label: 'Transporting air H₂O₂ Sterilization',         unit: 'l/min',hh: 183, sp: 166, ll: 150, actual: v(vals, 'gen_Transporting air H₂O₂ Sterilization') },
        { label: 'Transporting air Production',                  unit: 'l/min',hh: 220, sp: 200, ll: 180, actual: v(vals, 'gen_Transporting air Production') },
        { label: 'Pressure transporting air (dosing piston)',    unit: 'mbar', hh: 2000, hs: 1800, sp: 1000, l: 600, ll: 500, actual: v(vals, 'gen_Pressure transporting air (dosing piston)') },
        { label: 'Pressure transporting air (analogue 2015)',    unit: 'mbar', hh: 4500, hs: 4000, sp: 3000, l: 1500, ll: 1000, actual: v(vals, 'gen_Pressure transporting air (analogue 2015)') },
      ])}
    </div>
  </div>`;
}

// ─── SECCIÓN 4: Preheating & SST ─────────────────────────────────────────
export function sectionPreheating(wd: any): string {
  const vals = wd?.preheatingValues || {};
  const tracks = [1, 2, 3, 4];

  const trackRows = (() => {
    const params = [
      { label: 'pdyn preheating (NW 19)', key: 'pdyn_preh', unit: 'mmwc', sp: 34 },
      { label: 'Temp. preheating',        key: 'temp_preh', unit: '°C',   sp: 100 },
      { label: 'pdyn drying (NW 19)',     key: 'pdyn_dry',  unit: 'mmwc', sp: 26 },
      { label: 'Temp. drying',            key: 'temp_dry',  unit: '°C',   sp: 100 },
    ];
    const header = `<tr><th style="text-align:left">Parámetro</th><th>Unit</th><th class="sp">SP</th>${tracks.map(t => `<th>Tr ${t}</th>`).join('')}</tr>`;
    const body = params.map(p => {
      const tds = tracks.map(t => {
        const val = vals[`${p.key}_tr${t}`];
        const ok = val !== null && val !== undefined && Math.abs(val - p.sp) <= 2;
        return `<td class="${val !== null && val !== undefined ? (ok ? 'actual-ok' : 'actual-err') : 'actual-empty'}">${n(val)}</td>`;
      }).join('');
      return `<tr><td>${p.label}</td><td style="color:#94a3b8;font-size:7.5pt">${p.unit}</td><td class="sp">${p.sp}±2</td>${tds}</tr>`;
    }).join('');
    return `<div class="psec"><div class="psec-title">🔥 Medición por Track (Nozzles)</div><table class="ptable"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
  })();

  return `
  <div class="section-break">
    <div class="section-heading">
      <div class="section-icon">4</div>
      <h2>Preheating, Drying &amp; SST</h2>
    </div>
      ${trackRows}
      ${paramTable('Setpoints de Temperatura por Volumen', '📐', [
        { label: 'Temp. Preheating 500ml / Drive ON',      unit: '°C', sp: 130, actual: v(vals,'Temp. Preheating 500ml / Drive ON') },
        { label: 'Temp. Preheating 750ml / Drive ON',      unit: '°C', sp: 170, actual: v(vals,'Temp. Preheating 750ml / Drive ON') },
        { label: 'Temp. Preheating 960-1000ml / Drive ON', unit: '°C', sp: 230, actual: v(vals,'Temp. Preheating 960-1000ml / Drive ON') },
        { label: 'Temp. Preheating All / Drive OFF',       unit: '°C', sp: 100, actual: v(vals,'Temp. Preheating All / Drive OFF') },
        { label: 'Temp. Drying 500ml / Drive ON',          unit: '°C', sp: 120, actual: v(vals,'Temp. Drying 500ml / Drive ON') },
        { label: 'Temp. Drying 750ml / Drive ON',          unit: '°C', sp: 140, actual: v(vals,'Temp. Drying 750ml / Drive ON') },
        { label: 'Temp. Drying 960-1000ml / Drive ON',     unit: '°C', sp: 180, actual: v(vals,'Temp. Drying 960-1000ml / Drive ON') },
        { label: 'Temp. Drying All / Drive OFF',            unit: '°C', sp: 100, actual: v(vals,'Temp. Drying All / Drive OFF') },
      ])}
      ${paramTable('Steam Sterilization (SST)', '♨️', [
        { label: 'Steam supply',     unit: '°C', hh: 170, hs: 165, sp: 155, l: 130, ll: 125, actual: v(vals,'Steam supply') },
        { label: 'Temperatures SST', unit: '°C', hh: 140, hs: 135, sp: 125, l: 121, ll: 115, actual: v(vals,'Temperatures SST') },
      ])}
      ${paramTable('Steam Barriers', '🔒', [
        { label: 'Steam barrier behind controller (R)', unit: '°C', hh: 140, hs: 135, sp: 125, l: 115, ll: 102, actual: v(vals,'Steam barrier behind controller (R)') },
        { label: 'Steam barrier behind controller (A)', unit: '°C', hh: 140, hs: 135, sp: 115, l: 110, ll: 102, actual: v(vals,'Steam barrier behind controller (A)') },
        { label: 'Steam barrier (R) — passive',         unit: '°C', hh: 140, hs: 135, sp: 40,  l: 30,  ll: 25,  actual: v(vals,'Steam barrier (R) — passive') },
        { label: 'Steam injection tr 1/2',              unit: '°C', hh: 140, hs: 135, sp: 125, l: 110, ll: 102, actual: v(vals,'Steam injection tr 1/2') },
        { label: 'Steam injection tr 3/4',              unit: '°C', hh: 140, hs: 135, sp: 125, l: 110, ll: 102, actual: v(vals,'Steam injection tr 3/4') },
      ])}
      ${paramTable('Condensate Barrier (Dairy)', '💧', [
        { label: 'Condensate barrier with steam',      unit: '°C', hh: 140, hs: 135, sp: 115, l: 110, ll: 102, actual: v(vals,'Condensate barrier with steam') },
        { label: 'Condensate barrier flushing',        unit: '°C', hh: 135, hs: 130, sp: 90,  l: 80,  ll: 75,  actual: v(vals,'Condensate barrier flushing') },
        { label: 'Condensate barrier with condensate', unit: '°C', hh: 75,  hs: 65,  sp: 35,  l: 25,  ll: 20,  actual: v(vals,'Condensate barrier with condensate') },
      ])}
  </div>`;
}

// ─── SECCIÓN 5: CIP ──────────────────────────────────────────────────────
export function sectionCIP(wd: any): string {
  const vals = wd?.cipValues || {};
  const flows: any[] = wd?.cipFlows || [];

  const flowRows = (paso: string) => {
    const f = flows.filter(r => r.paso === paso);
    if (!f.length) return '<tr><td colspan="6" style="text-align:center;color:#94a3b8;font-style:italic">Sin registros</td></tr>';
    return f.map(r => `<tr>
      <td style="text-align:center">Tr ${r.track}</td>
      <td style="text-align:center">Cab ${r.cabezal}</td>
      <td>${r.tipo_cabezal || '—'}</td>
      <td style="text-align:center">${n(r.flujo_ml_s)}</td>
      <td style="text-align:center">${n(r.volumen_hmi)}</td>
      <td style="text-align:center">${n(r.volumen_cip)}</td>
    </tr>`).join('');
  };

  return `
  <div class="section-break">
    <div class="section-heading">
      <div class="section-icon">5</div>
      <h2>CIP — Cleaning in Place</h2>
    </div>
      ${paramTable('Parámetros de Medios de Limpieza', '🌡️', [
        { label: 'Temperatura agua',              unit: '°C',  hh: 100, sp: 20,    ll: 0,    actual: v(vals,'Temperatura agua') },
        { label: 'Temperatura soda cáustica',     unit: '°C',  hh: 80, hs: 75, sp: 70, l: 65, ll: 60, actual: v(vals,'Temperatura soda cáustica') },
        { label: 'Temperatura ácido',             unit: '°C',  hh: 75, hs: 70, sp: 65, l: 60, ll: 55, actual: v(vals,'Temperatura ácido') },
        { label: 'Total flow volume during CIP',  unit: 'l/h', sp: 10000, ll: 8000, actual: v(vals,'Total flow volume during CIP') },
      ])}
      <div class="psec">
        <div class="psec-title">⚗️ Concentración de Agentes</div>
        <table class="ptable" style="width:60%">
          <thead><tr><th style="text-align:left">Agente</th><th>Conductividad (mS/cm)</th><th>Concentración (%)</th></tr></thead>
          <tbody>
            <tr><td>Soda Cáustica</td><td style="text-align:center">${n(v(vals,'cip_soda_conductividad'))}</td><td style="text-align:center">${n(v(vals,'cip_soda_concentracion'))}</td></tr>
            <tr><td>Ácido</td><td style="text-align:center">${n(v(vals,'cip_acido_conductividad'))}</td><td style="text-align:center">${n(v(vals,'cip_acido_concentracion'))}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="psec">
        <div class="psec-title">🚿 Flujos — Pre-Rinsing (cabezal individual)</div>
        <table class="ptable">
          <thead><tr><th>Track</th><th>Cabezal</th><th style="text-align:left">Tipo Filling Head</th><th>Flujo (ml/s)</th><th>Vol. HMI (l)</th><th>Vol. CIP (l)</th></tr></thead>
          <tbody>${flowRows('pre_rinsing')}</tbody>
        </table>
      </div>
      <div class="psec">
        <div class="psec-title">🚿 Flujos — Otros pasos CIP</div>
        <table class="ptable">
          <thead><tr><th>Track</th><th>Cabezal</th><th style="text-align:left">Tipo Filling Head</th><th>Flujo (ml/s)</th><th>Vol. HMI (l)</th><th>Vol. CIP (l)</th></tr></thead>
          <tbody>${flowRows('otros')}</tbody>
        </table>
      </div>
  </div>`;
}

// ─── SECCIÓN 6: Misceláneos ───────────────────────────────────────────────
export function sectionMisc(wd: any): string {
  const misc = wd?.miscValues || {};
  const obs  = wd?.observacionesGen || '';

  const yesNo = (key: string) => {
    const v = misc[key];
    if (v === 'si') return '<span style="color:#15803d;font-weight:700">✓ Sí</span>';
    if (v === 'no') return '<span style="color:#dc2626;font-weight:700">✗ No</span>';
    return '<span style="color:#94a3b8">—</span>';
  };

  const tankParams = [
    { key: 'Pressure_product_tank___Production', label: 'Pressure product tank — Production', unit: 'mbar' },
    { key: 'Pressure_product_tank__A___R____Cleaning', label: 'Pressure product tank — Cleaning', unit: 'mbar' },
    { key: 'Pressure_product_tank__A___R____Sterilization', label: 'Pressure product tank — Sterilization', unit: 'mbar' },
    { key: 'Pressure_product_tank___Cooling', label: 'Pressure product tank — Cooling', unit: 'mbar' },
    { key: 'Pressure_product_tank___Special_filling', label: 'Pressure product tank — Special filling', unit: 'mbar' },
    { key: 'Level_product_tank', label: 'Level product tank', unit: '%' },
    { key: 'Time_cooling_down_filling_heads', label: 'Time cooling down filling heads', unit: 'min' },
  ];

  const tankRows = tankParams.map(p => {
    const val = misc[`pres_tanque_${p.key}`];
    return `<tr><td>${p.label}</td><td style="text-align:center;color:#94a3b8;font-size:7.5pt">${p.unit}</td><td style="text-align:center">${n(val)}</td></tr>`;
  }).join('');

  return `
  <div class="section-break">
    <div class="section-heading">
      <div class="section-icon">6</div>
      <h2>Esterilización, Misceláneos &amp; Cierre</h2>
    </div>
      <div class="psec">
        <div class="psec-title">🔬 Pasos Funcionales &amp; H₂O₂</div>
        <table class="ptable" style="width:60%">
          <tbody>
            <tr><td>Paso funcional SST</td><td>${yesNo('sst_funcional')}</td></tr>
            <tr><td>Paso funcional AZS</td><td>${yesNo('azs_funcional')}</td></tr>
            <tr><td>Concentración de H₂O₂</td><td>${misc['h2o2_concentracion'] !== undefined ? misc['h2o2_concentracion'] + '%' : '—'}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="psec">
        <div class="psec-title">🛢️ Presión del Tanque de Producto</div>
        <table class="ptable" style="width:70%">
          <thead><tr><th style="text-align:left">Parámetro</th><th>Unidad</th><th>Valor Actual</th></tr></thead>
          <tbody>${tankRows}</tbody>
        </table>
      </div>
      ${obs ? `<div class="psec"><div class="psec-title">📝 Observaciones Generales</div><div class="obs-box">${obs}</div></div>` : ''}
  </div>`;
}
