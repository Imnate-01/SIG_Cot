import { SIG_LOGO_B64 } from './sig_logo_b64';
import { sectionDedusting, sectionH2O2, sectionPreheating, sectionCIP, sectionMisc } from './fsaPdfSections';

export function buildFsaPdfHtml(report: any): { html: string, headerTemplate: string, footerTemplate: string } {
  const copFindings: any[] = report.cop_findings || [];
  const personas: any[]    = report.personas_a_cargo || [];
  const wd: any            = report.wizard_data || {};

  // ── helpers ──
  const val = (v: any, fallback = '—') => (v !== null && v !== undefined && v !== '') ? String(v) : fallback;

  const statusColor = (estado: string) => {
    if (estado === 'finalizado') return '#16a34a';
    if (estado === 'en_revision') return '#d97706';
    return '#64748b';
  };

  const statusLabel = (estado: string) => {
    if (estado === 'finalizado') return 'Finalizado';
    if (estado === 'en_revision') return 'En Revisión';
    return 'Borrador';
  };

  const now = new Date().toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // ── COP rows ──
  const copRows = copFindings.map(f => {
    const imgs = (f.images || []).slice(0, 4);
    const imgGrid = imgs.length === 0 ? '' : `
      <div class="img-grid img-grid-${Math.min(imgs.length, 4)}">
        ${imgs.map((img: any, idx: number) => `
          <figure class="img-figure">
            <img src="${img.url_report || img.url_thumbnail || ''}" alt="Evidencia ${idx + 1}" class="evidence-img" />
            ${img.caption ? `<figcaption>Fig. ${idx + 1}: ${img.caption}</figcaption>` : ''}
          </figure>
        `).join('')}
      </div>`;

    return `
      <div class="cop-block ${f.tiene_falla ? 'cop-falla' : 'cop-ok'}">
        <div class="cop-header">
          <div class="cop-title-row">
            <span class="cop-section-name">${val(f.seccion_cop)}</span>
            <span class="cop-badge ${f.tiene_falla ? 'badge-fail' : 'badge-ok'}">
              ${f.tiene_falla ? '⚠ Hallazgo' : '✓ Conforme'}
            </span>
          </div>
          <div class="cop-angles">
            CAM ON: <strong>${val(f.cam_on)}°</strong> &nbsp;|&nbsp; CAM OFF: <strong>${val(f.cam_off)}°</strong>
          </div>
        </div>
        ${f.descripcion ? `<p class="cop-desc">${f.descripcion}</p>` : ''}
        ${imgGrid}
      </div>`;
  }).join('');

  // ── HTML ──
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Food Safety Audit — ${val(report.folio)}</title>
<style>
  /* ── RESET & BASE ── */
  *{box-sizing:border-box;margin:0;padding:0}
  html{font-size:10pt;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1e293b}
  body{background:#fff}

  /* ── PAGE LAYOUT ── */
  @page{size:A4;}
  /* Cover page gets its own page */
  .page-cover{
    position:relative;
    page-break-after:always;
    display:block;
  }
  /* Main content wrapper — flows continuously, no forced breaks */
  .page-body{
    display:block;
  }
  /* Final signatures page forces its own page */
  .page-final{
    page-break-before:always;
    display:block;
  }
  /* Each major section starts on a fresh page */
  .section-break{
    page-break-before:always;
    padding-top:4mm;
  }



  /* ── CONTENT AREA (inside page-body, respects fixed header/footer) ── */
  .content{
    display:block;
  }

  /* ══ COVER PAGE ══ */
  .cover-watermark{
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    opacity:.04;pointer-events:none;
  }
  .cover-watermark img{width:160mm}

  .cover-hero{
    text-align:center;
    padding:8mm 0 10mm;
    border-bottom:3px solid #1e3a8a;
    margin-bottom:8mm;
  }
  .cover-hero img{height:18mm;margin-bottom:5mm}
  .cover-hero h1{font-size:20pt;font-weight:900;color:#1e3a8a;letter-spacing:-.02em;line-height:1.1}
  .cover-hero .cover-subtitle{font-size:10pt;color:#64748b;margin-top:4px}
  .cover-hero .cover-folio{
    display:inline-block;margin-top:8mm;
    background:#1e3a8a;color:#fff;
    font-size:14pt;font-weight:900;letter-spacing:.1em;
    font-family:monospace;padding:5px 20px;border-radius:8px;
  }

  /* Cover info table */
  .cover-table{width:100%;border-collapse:collapse;margin-top:6mm}
  .cover-table tr:not(:last-child) td{border-bottom:1px solid #e2e8f0}
  .cover-table td{padding:5mm 6mm;vertical-align:top;font-size:9pt}
  .cover-table td:first-child{
    width:50%;font-weight:700;color:#1e3a8a;
    background:#eff6ff;border-right:2px solid #bfdbfe;
  }
  .cover-table td:last-child{color:#1e293b}

  .person-block{padding:2mm 0;border-bottom:.5px solid #e2e8f0}
  .person-block:last-child{border:none;padding-bottom:0}
  .person-block strong{display:block;font-size:9pt;color:#1e293b}
  .person-block span{font-size:8pt;color:#64748b}

  /* ══ SECTION HEADERS ══ */
  .section-heading{
    display:flex;align-items:center;gap:6px;
    margin-bottom:5mm;margin-top:4mm;
    padding-bottom:3mm;border-bottom:2px solid #1e3a8a;
    page-break-after:avoid;
  }
  .section-heading h2{font-size:13pt;font-weight:900;color:#1e3a8a}
  .section-heading .section-icon{
    width:8mm;height:8mm;border-radius:50%;
    background:#1e3a8a;color:#fff;
    display:flex;align-items:center;justify-content:center;
    font-size:10pt;flex-shrink:0;
  }

  /* ══ COP ══ */
  .cop-block{
    border:1px solid #e2e8f0;border-radius:6px;
    margin-bottom:5mm;overflow:hidden;
    page-break-inside:avoid;
  }
  .cop-falla{border-left:4px solid #dc2626}
  .cop-ok{border-left:4px solid #16a34a}
  .cop-header{
    display:flex;align-items:flex-start;justify-content:space-between;
    background:#f8fafc;padding:3mm 4mm;
    border-bottom:1px solid #e2e8f0;
  }
  .cop-title-row{display:flex;align-items:center;gap:8px}
  .cop-section-name{font-size:10pt;font-weight:800;color:#1e293b;text-transform:capitalize}
  .cop-badge{
    display:inline-block;padding:1px 7px;border-radius:99px;
    font-size:7pt;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
  }
  .badge-ok{background:#dcfce7;color:#15803d;border:1px solid #86efac}
  .badge-fail{background:#fee2e2;color:#dc2626;border:1px solid #fca5a5}
  .cop-angles{font-size:7.5pt;color:#64748b;margin-top:2px}
  .cop-desc{
    font-size:8.5pt;color:#334155;line-height:1.6;
    padding:3mm 4mm;background:#fff;
  }

  /* Image grids */
  .img-grid{display:grid;gap:4mm;padding:4mm;background:#fff}
  .img-grid-1{grid-template-columns:1fr}
  .img-grid-2{grid-template-columns:1fr 1fr}
  .img-grid-3,.img-grid-4{grid-template-columns:1fr 1fr}
  .img-figure{margin:0}
  .evidence-img{width:100%;border-radius:4px;border:1px solid #e2e8f0;object-fit:cover;max-height:55mm}
  figcaption{font-size:7pt;color:#64748b;text-align:center;margin-top:2px;font-style:italic}

  /* ══ PARAM TABLE ══ */
  .psec{margin-bottom:5mm;page-break-inside:avoid}
  .psec-title{
    font-size:9pt;font-weight:800;color:#1e3a8a;
    background:#eff6ff;padding:2mm 4mm;
    border-left:3px solid #1e3a8a;margin-bottom:2mm;
  }
  .ptable{width:100%;border-collapse:collapse;font-size:8pt}
  .ptable th{
    background:#1e3a8a;color:#fff;
    padding:2mm 3mm;text-align:center;
    font-size:7pt;font-weight:700;text-transform:uppercase;
    white-space:nowrap;
  }
  .ptable th:first-child{text-align:left}
  .ptable tr{page-break-inside:avoid}
  .ptable td{padding:2mm 3mm;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle}
  .ptable td:first-child{text-align:left;font-weight:600;color:#334155;max-width:55mm}
  .ptable tbody tr:nth-child(even){background:#f8fafc}
  .hh{color:#dc2626;font-weight:700}
  .hs{color:#f97316}
  .sp{color:#2563eb;font-weight:700}
  .ls{color:#f97316}
  .actual-ok{background:#f0fdf4;color:#15803d;font-weight:700}
  .actual-err{background:#fef2f2;color:#dc2626;font-weight:700}
  .actual-empty{color:#94a3b8}
  .info-label{font-size:8pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}
  .info-value{font-size:10pt;font-weight:700;color:#1e293b}

  /* ══ SUMMARY TABLE ══ */
  .summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-bottom:6mm}
  .summary-card{
    border:1.5px solid #e2e8f0;border-radius:6px;
    padding:4mm 5mm;text-align:center;
  }
  .summary-card .s-num{font-size:20pt;font-weight:900;line-height:1}
  .summary-card .s-label{font-size:7.5pt;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
  .s-ok .s-num{color:#15803d}
  .s-fail .s-num{color:#dc2626}
  .s-total .s-num{color:#1e3a8a}

  /* ══ MISC ══ */
  .info-row{display:flex;gap:3mm;margin-bottom:2mm;font-size:8.5pt}
  .info-label{font-weight:700;color:#64748b;min-width:45mm}
  .info-value{color:#1e293b}
  .obs-box{
    background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;
    padding:4mm;font-size:8.5pt;color:#334155;line-height:1.7;
    min-height:20mm;white-space:pre-wrap;
  }

  /* ══ SIGNATURE BLOCK ══ */
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:6mm}
  .sig-card{border:1px solid #e2e8f0;border-radius:6px;padding:4mm 5mm}
  .sig-title{font-size:7.5pt;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:.05em;margin-bottom:3mm}
  .sig-line{border-top:1.5px solid #1e3a8a;margin:8mm 0 2mm}
  .sig-name{font-size:9pt;font-weight:700;color:#1e293b}
  .sig-role{font-size:8pt;color:#64748b}
  .sig-company{font-size:7.5pt;color:#94a3b8;margin-top:1px}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════
     PÁGINA 1 — PORTADA
══════════════════════════════════════════ -->
<div class="page-cover">
  <!-- Watermark -->
  <div class="cover-watermark"><img src="${SIG_LOGO_B64}" alt=""/></div>

  <!-- Hero -->
  <div class="cover-hero">
    <img src="${SIG_LOGO_B64}" alt="SIG Combibloc"/>
    <h1>Food Safety Audit Report</h1>
    <div class="cover-subtitle">Reporte de Auditoría de Inocuidad Alimentaria</div>
    <div class="cover-folio">${val(report.folio)}</div>
  </div>

    <!-- Tabla de portada -->
    <table class="cover-table">
      <tr><td>Client</td><td>${val(report.cliente_empresa)}</td></tr>
      <tr><td>Date of audit</td><td>${val(report.fecha_auditoria)}</td></tr>
      <tr><td>Location of audit</td><td>${val(report.location_of_audit)}</td></tr>
      <tr><td>Filling machine type</td><td>${val(report.llenadora)}</td></tr>
      <tr><td>Filling machine serial number</td><td>${val(report.llenadora_serial)}</td></tr>
      <tr><td>Operating hours of filling machine</td><td>${val(report.llenadora_horas_op)}</td></tr>
      <tr>
        <td>Persons in charge conducting the audit</td>
        <td>
          ${personas.length > 0
            ? personas.map((p: any) => `
                <div class="person-block">
                  <strong>${val(p.nombre)}</strong>
                  <span>${val(p.puesto)} · ${val(p.empresa)}</span>
                </div>`).join('')
            : '—'}
        </td>
      </tr>
      <tr>
        <td>Authorization SIG Combibloc</td>
        <td>
          <div class="person-block">
            <strong>${val(report.autorizacion_sig_nombre)}</strong>
            <span>${val(report.autorizacion_sig_puesto)} · ${val(report.autorizacion_sig_empresa)}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td>Authorization client</td>
        <td>
          <div class="person-block">
            <strong>${val(report.autorizacion_cliente_nombre)}</strong>
            <span>${val(report.autorizacion_cliente_puesto)} · ${val(report.autorizacion_cliente_empresa)}</span>
          </div>
        </td>
      </tr>
    </table>
</div>

<!-- ══════════════════════════════════════════
     PÁGINA 2 — COP (Cleaning Out of Place)
══════════════════════════════════════════ -->
<!-- COP section: starts on its own page, then flows naturally -->
<div class="page-body">
  <div class="section-heading">
    <div class="section-icon">1</div>
    <h2>COP — Cleaning Out of Place</h2>
  </div>

  <!-- Resumen COP -->
  ${copFindings.length > 0 ? `
  <div class="summary-grid">
    <div class="summary-card s-ok">
      <div class="s-num">${copFindings.filter((f:any) => !f.tiene_falla).length}</div>
      <div class="s-label">Conformes</div>
    </div>
    <div class="summary-card s-fail">
      <div class="s-num">${copFindings.filter((f:any) => f.tiene_falla).length}</div>
      <div class="s-label">Con hallazgo</div>
    </div>
    <div class="summary-card s-total">
      <div class="s-num">${copFindings.length}</div>
      <div class="s-label">Evaluadas</div>
    </div>
  </div>` : ''}

  ${copRows || '<p style="color:#94a3b8;font-style:italic;text-align:center;padding:10mm 0">Sin hallazgos COP registrados.</p>'}
</div>

${sectionDedusting(wd)}
${sectionH2O2(wd)}
${sectionPreheating(wd)}
${sectionCIP(wd)}
${sectionMisc(wd)}

<!-- ══════════════════════════════════════════
     PÁGINA 3 — OBSERVACIONES Y FIRMAS
══════════════════════════════════════════ -->
<div class="page-final">
    <div class="section-heading">
      <div class="section-icon">✎</div>
      <h2>Observaciones Generales y Cierre</h2>
    </div>

    ${report.observaciones_gen ? `
    <p style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2mm">
      Observaciones del auditor
    </p>
    <div class="obs-box">${report.observaciones_gen}</div>
    ` : ''}

    <!-- Firmas -->
    <div style="margin-top:8mm">
      <div style="font-size:9pt;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4mm">
        Firmas de autorización
      </div>
      <div class="sig-grid">
        <div class="sig-card">
          <div class="sig-title">Authorization SIG Combibloc</div>
          <div class="sig-line"></div>
          <div class="sig-name">${val(report.autorizacion_sig_nombre)}</div>
          <div class="sig-role">${val(report.autorizacion_sig_puesto)}</div>
          <div class="sig-company">${val(report.autorizacion_sig_empresa)}</div>
        </div>
        <div class="sig-card">
          <div class="sig-title">Authorization Client</div>
          <div class="sig-line"></div>
          <div class="sig-name">${val(report.autorizacion_cliente_nombre)}</div>
          <div class="sig-role">${val(report.autorizacion_cliente_puesto)}</div>
          <div class="sig-company">${val(report.autorizacion_cliente_empresa)}</div>
        </div>
      </div>
    </div>

    <!-- Cierre -->
    <div style="margin-top:10mm;text-align:center;color:#94a3b8;font-size:7.5pt;border-top:1px solid #e2e8f0;padding-top:4mm">
      Documento generado el ${now} · ${val(report.folio)} · SIG Combibloc México
    </div>
</div>

</body>
</html>`;

  // Puppeteer native header/footer
  const headerTemplate = `
    <div style="-webkit-print-color-adjust: exact; width: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0 16mm 4mm 16mm; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #1e3a8a; background: white; margin-top: 5mm;">
      <div><img src="${SIG_LOGO_B64}" style="height: 12mm;" /></div>
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 11px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.08em;">Food Safety Audit Report</div>
        <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${val(report.folio)}</div>
      </div>
      <div style="text-align: right; font-size: 9px; color: #64748b; min-width: 40mm;">
        <span>${now}</span>
      </div>
    </div>
  `;

  const footerTemplate = `
    <div style="-webkit-print-color-adjust: exact; width: 100%; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 8px; color: #64748b; display: flex; justify-content: space-between; align-items: center; padding: 4mm 16mm 0 16mm; border-top: 2px solid #1e3a8a; background: #f8fafc; margin-bottom: 5mm;">
      <div style="font-weight: 600; color: #1e3a8a;">SIG Combibloc México · Confidencial</div>
      <div style="text-align: center;">Este documento es propiedad de SIG Combibloc. Su reproducción sin autorización está prohibida.</div>
      <div style="font-family: monospace;">${val(report.folio)} <span style="margin-left: 5px;" class="pageNumber"></span>/<span class="totalPages"></span></div>
    </div>
  `;

  return { html, headerTemplate, footerTemplate };
}
