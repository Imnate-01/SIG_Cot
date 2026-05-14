import { Request, Response } from 'express';
import { createClientForUser, supabaseAdmin } from '../config/supabase';
import { buildFsaPdfHtml } from '../utils/fsaPdfTemplate';

export class FoodSafetyAuditController {

  // ---------------------------------------------------------
  // 1. CREAR REPORTE (Paso 0 - Portada)
  // ---------------------------------------------------------
  async create(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado: Falta token' });

      const supabaseUser = createClientForUser(token);
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

      if (authError || !user) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
      }

      const auditor_id = user.id;
      const payload = req.body;

      // Generar Folio: FSA-{AÑO}-XXXX
      // Para generar el secuencial de forma segura y evitar colisiones, podemos contar cuántos reportes van este año
      const currentYear = new Date().getFullYear();

      // Consultar el último folio del año para generar el siguiente
      const { data: lastReport, error: countError } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('folio')
        .ilike('folio', `FSA-${currentYear}-%`)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastReport && lastReport.folio) {
        const parts = lastReport.folio.split('-');
        if (parts.length === 3) {
          nextNumber = parseInt(parts[2], 10) + 1;
        }
      }
      const folio = `FSA-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

      // Insertar portada
      const { data: newReport, error: insertError } = await supabaseUser
        .from('food_safety_audit_reports')
        .insert({
          folio,
          cliente_empresa: payload.cliente_empresa,
          fecha_auditoria: payload.fecha_auditoria,
          location_of_audit: payload.location_of_audit,
          llenadora: payload.llenadora,
          llenadora_serial: payload.llenadora_serial,
          llenadora_horas_op: payload.llenadora_horas_op || null,
          personas_a_cargo: payload.personas_a_cargo || [],
          autorizacion_sig_nombre: payload.autorizacion_sig?.nombre,
          autorizacion_sig_puesto: payload.autorizacion_sig?.puesto,
          autorizacion_sig_empresa: payload.autorizacion_sig?.empresa,
          autorizacion_cliente_nombre: payload.autorizacion_cliente?.nombre,
          autorizacion_cliente_puesto: payload.autorizacion_cliente?.puesto,
          autorizacion_cliente_empresa: payload.autorizacion_cliente?.empresa,
          auditor_id: auditor_id,
          estado: 'borrador'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json({
        success: true,
        message: 'Reporte creado exitosamente (Borrador)',
        data: newReport
      });

    } catch (error: any) {
      console.error('Error al crear reporte FSA:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno al crear reporte FSA'
      });
    }
  }

  // ---------------------------------------------------------
  // 2. LISTAR REPORTES
  // ---------------------------------------------------------
  async list(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });

      const supabaseUser = createClientForUser(token);

      const { data, error } = await supabaseUser
        .from('food_safety_audit_reports')
        .select(`
          id,
          folio,
          cliente_empresa,
          llenadora,
          fecha_auditoria,
          estado,
          created_at,
          usuarios!auditor_id (nombre)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ---------------------------------------------------------
  // 3. OBTENER POR ID
  // ---------------------------------------------------------
  async getById(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      const { data, error } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ---------------------------------------------------------
  // 4. GUARDAR WIZARD (AUTO-SAVE) — persiste todos los pasos
  // ---------------------------------------------------------
  async saveWizard(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;
      const {
        copFindings,
        dedusterValues,
        h2o2Values,
        h2o2Proveedor,
        h2o2Tipo,
        h2o2Concentracion,
        preheatingValues,
        cipValues,
        cipFlows,
        miscValues,
        observacionesGen,
      } = req.body;

      // ── 1. Guardar hallazgos COP en tabla dedicada ──
      let savedCopFindings: Record<string, any> = {};

      if (copFindings && typeof copFindings === 'object') {
        const { data: existingCop } = await supabaseUser
          .from('audit_cop_findings')
          .select('id, seccion_cop')
          .eq('audit_id', id);

        const existingMap = new Map((existingCop || []).map((e: any) => [e.seccion_cop, e.id]));

        for (const key of Object.keys(copFindings)) {
          const finding = copFindings[key];
          const existingId = finding.cop_db_id || existingMap.get(finding.seccion_cop);

          const payload = {
            audit_id: Number(id),
            seccion_cop: finding.seccion_cop,
            cam_on: finding.cam_on || null,
            cam_off: finding.cam_off || null,
            descripcion: finding.descripcion || '',
            tiene_falla: finding.tiene_falla || false
          };

          if (existingId) {
            const { data } = await supabaseUser
              .from('audit_cop_findings')
              .update(payload)
              .eq('id', existingId)
              .select('id')
              .single();
            if (data) finding.cop_db_id = data.id;
          } else {
            const { data } = await supabaseUser
              .from('audit_cop_findings')
              .insert(payload)
              .select('id')
              .single();
            if (data) finding.cop_db_id = data.id;
          }
          savedCopFindings[key] = finding;
        }
      }

      // ── 2. Guardar resto del wizard en JSONB ──
      const wizardData = {
        dedusterValues: dedusterValues || {},
        h2o2Values: h2o2Values || {},
        h2o2Proveedor: h2o2Proveedor || '',
        h2o2Tipo: h2o2Tipo || '',
        h2o2Concentracion: h2o2Concentracion ?? null,
        preheatingValues: preheatingValues || {},
        cipValues: cipValues || {},
        cipFlows: cipFlows || [],
        miscValues: miscValues || {},
        observacionesGen: observacionesGen || '',
      };

      await supabaseUser
        .from('food_safety_audit_reports')
        .update({
          wizard_data: wizardData,
          observaciones_gen: observacionesGen || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      res.json({
        success: true,
        data: { copFindings: savedCopFindings }
      });

    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
  // ---------------------------------------------------------
  // 5. GENERAR PDF
  // ---------------------------------------------------------
  async generatePdf(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      // Marcar reporte como completado al generar el PDF
      await supabaseUser
        .from('food_safety_audit_reports')
        .update({ estado: 'finalizado' })
        .eq('id', id);

      // Obtener reporte completo
      const { data: report, error } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !report) return res.status(404).json({ success: false, error: 'Reporte no encontrado' });

      // Obtener hallazgos COP con imágenes
      const { data: copFindings } = await supabaseAdmin
        .from('audit_cop_findings')
        .select('*, audit_evidence_images(*)')
        .eq('audit_id', id)
        .order('id');

      report.cop_findings = (copFindings || []).map((f: any) => ({
        ...f,
        images: f.audit_evidence_images || []
      }));

      // Generar HTML y templates de encabezado/pie de página
      const { html, headerTemplate, footerTemplate } = buildFsaPdfHtml(report);

      // 1. Cargar puppeteer-core
      const puppeteer = await import('puppeteer-core');

      // 2. Definir si estamos en local (Windows) o en producción (Linux/Render)
      const isLocal = process.platform === 'win32';
      let browser;

      if (isLocal) {
        // Uso local: Chrome instalado en Windows
        const LOCAL_CHROME = process.env.CHROME_EXECUTABLE_PATH 
          || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
          
        browser = await puppeteer.default.launch({
          executablePath: LOCAL_CHROME,
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          defaultViewport: { width: 1280, height: 900 },
        });
      } else {
        // Producción en Render: usar @sparticuz/chromium
        const chromium = (await import('@sparticuz/chromium')).default;
        
        browser = await puppeteer.default.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      // Pequeña pausa adicional por seguridad
      await new Promise(r => setTimeout(r, 800));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '28mm', bottom: '22mm', left: '16mm', right: '16mm' },
        displayHeaderFooter: true,
        headerTemplate,
        footerTemplate,
      });

      await browser.close();

      const filename = `FSA_${report.folio}_${new Date().toISOString().slice(0, 10)}.pdf`;
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(Buffer.from(pdfBuffer));

    } catch (error: any) {
      console.error('Error al generar PDF FSA:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ---------------------------------------------------------
  // 6. ELIMINAR REPORTE
  // ---------------------------------------------------------
  async delete(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      const { error } = await supabaseUser
        .from('food_safety_audit_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ success: true, message: 'Reporte eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar reporte FSA:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al eliminar reporte' });
    }
  }
}

export default new FoodSafetyAuditController();
