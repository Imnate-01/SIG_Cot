import { Request, Response } from 'express';
import { createClientForUser, supabaseAdmin } from '../config/supabase';
import { buildFsaPdfHtml } from '../utils/fsaPdfTemplate';
import { getBrowser } from '../utils/browserManager';

// ─── Helper: recursos que Chromium puede cargar al generar el PDF ──────────
// Solo data: URIs y hosts de confianza: el de Supabase (imágenes de
// evidencia) más los que se agreguen en PDF_ALLOWED_HOSTS (separados por coma).
const PDF_ALLOWED_HOSTS: string[] = (() => {
  const hosts = (process.env.PDF_ALLOWED_HOSTS || '')
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(Boolean);
  try {
    if (process.env.SUPABASE_URL) hosts.push(new URL(process.env.SUPABASE_URL).host.toLowerCase());
  } catch { /* SUPABASE_URL mal formada: se ignora */ }
  return hosts;
})();

function isAllowedPdfResource(url: string): boolean {
  if (url.startsWith('data:') || url === 'about:blank') return true;
  try {
    const parsed = new URL(url);
    const isHttp = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    return isHttp && PDF_ALLOWED_HOSTS.includes(parsed.host.toLowerCase());
  } catch {
    return false;
  }
}

// ─── Helper: extrae y valida el usuario del token ───────────────────────────
async function getUserFromToken(req: Request, res: Response) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'No autorizado: falta token' });
    return null;
  }
  const supabaseUser = createClientForUser(token);
  const { data: { user }, error } = await supabaseUser.auth.getUser();
  if (error || !user) {
    res.status(401).json({ success: false, error: 'Token inválido o expirado' });
    return null;
  }
  return { supabaseUser, user };
}

export class FoodSafetyAuditController {

  // ---------------------------------------------------------
  // 1. CREAR REPORTE (Paso 0 - Portada)
  // ---------------------------------------------------------
  async create(req: Request, res: Response) {
    try {
      const auth = await getUserFromToken(req, res);
      if (!auth) return;
      const { supabaseUser, user } = auth;

      const payload = req.body;
      const currentYear = new Date().getFullYear();

      // ─── Generación de folio atómica con retry ───────────────────────────────
      // Problema anterior: COUNT+1 tiene una race condition — dos requests
      // simultáneas pueden leer el mismo count y generar el mismo folio,
      // colisionando en la restricción UNIQUE (error 23505).
      //
      // Solución: leemos el MAX actual del folio para este año y reintentamos
      // hasta 5 veces si hay colisión. Cada intento incrementa el número,
      // garantizando convergencia sin cambios de schema.
      // ────────────────────────────────────────────────────────────────────────
      const MAX_RETRIES = 5;
      let newReport: any = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Obtener el número máximo actual del folio para este año
        const { data: maxRow } = await supabaseAdmin
          .from('food_safety_audit_reports')
          .select('folio')
          .ilike('folio', `FSA-${currentYear}-%`)
          .order('folio', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Extraer el número del folio más alto (ej. "FSA-2026-0004" → 4)
        let maxNumber = 0;
        if (maxRow?.folio) {
          const parts = maxRow.folio.split('-');
          maxNumber = parseInt(parts[parts.length - 1], 10) || 0;
        }

        const nextNumber = maxNumber + 1 + attempt; // +attempt para escalar en retry
        const folio = `FSA-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

        const { data: inserted, error: insertError } = await supabaseUser
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
            auditor_id: user.id,
            estado: 'borrador'
          })
          .select()
          .single();

        // Si no hay error → éxito, salir del loop
        if (!insertError) {
          newReport = inserted;
          break;
        }

        // Si el error es por folio duplicado (23505) → reintentar
        if (insertError.code === '23505') {
          console.warn(`[FSA] Colisión de folio en intento ${attempt + 1}: ${folio} ya existe. Reintentando...`);
          continue;
        }

        // Cualquier otro error → propagar
        throw insertError;
      }

      if (!newReport) {
        throw new Error('No se pudo generar un folio único después de varios intentos. Intente nuevamente.');
      }

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
      const auth = await getUserFromToken(req, res);
      if (!auth) return;
      const { supabaseUser } = auth;

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
  // 3. OBTENER POR ID  (FIX #1: verifica propiedad via auditor_id)
  // ---------------------------------------------------------
  async getById(req: Request, res: Response) {
    try {
      const auth = await getUserFromToken(req, res);
      if (!auth) return;
      const { supabaseUser, user } = auth;
      const { id } = req.params;

      const { data, error } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('*')
        .eq('id', id)
        .eq('auditor_id', user.id)   // ← FIX #1: solo el propietario puede leerlo
        .single();

      if (error || !data) {
        return res.status(404).json({ success: false, error: 'Reporte no encontrado o sin acceso' });
      }

      // Cargar también los hallazgos COP con sus imágenes de evidencia
      // para que el wizard pueda restaurar el Step 1 al retomar un borrador
      const { data: copFindings } = await supabaseUser
        .from('audit_cop_findings')
        .select('*, audit_evidence_images(*)')
        .eq('audit_id', id)
        .order('id');

      data.cop_findings = (copFindings || []).map((f: any) => ({
        ...f,
        images: f.audit_evidence_images || []
      }));

      // Cargar imágenes de los pasos 2-5 (param_id = step number)
      const { data: stepImagesRaw } = await supabaseUser
        .from('audit_evidence_images')
        .select('*')
        .eq('audit_id', id)
        .not('param_id', 'is', null)
        .order('param_id')
        .order('orden');

      const stepImages: Record<number, any[]> = {};
      for (const img of (stepImagesRaw || [])) {
        if (!stepImages[img.param_id]) stepImages[img.param_id] = [];
        stepImages[img.param_id].push(img);
      }
      data.step_images = stepImages;

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ---------------------------------------------------------
  // 4. GUARDAR WIZARD (AUTO-SAVE)  (FIX #1: verifica propiedad)
  // ---------------------------------------------------------
  async saveWizard(req: Request, res: Response) {
    try {
      const auth = await getUserFromToken(req, res);
      if (!auth) return;
      const { supabaseUser, user } = auth;
      const { id } = req.params;

      // Verificar propiedad antes de guardar
      const { data: existing, error: ownerErr } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('id')
        .eq('id', id)
        .eq('auditor_id', user.id)   // ← FIX #1
        .maybeSingle();

      if (ownerErr || !existing) {
        return res.status(404).json({ success: false, error: 'Reporte no encontrado o sin acceso' });
      }

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

        // FIX #6: ejecutar todas las operaciones COP en paralelo (Promise.all)
        // en lugar de un bucle secuencial — elimina el patrón N+1
        const copKeys = Object.keys(copFindings);
        const copResults = await Promise.all(
          copKeys.map(async (key) => {
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

            // Antes los errores se ignoraban y el autosave respondía "éxito"
            // aunque el hallazgo no se hubiera guardado.
            if (existingId) {
              const { data, error } = await supabaseUser
                .from('audit_cop_findings')
                .update(payload)
                .eq('id', existingId)
                .select('id')
                .single();
              if (error) throw error;
              return { key, finding: { ...finding, cop_db_id: data?.id ?? finding.cop_db_id } };
            } else {
              const { data, error } = await supabaseUser
                .from('audit_cop_findings')
                .insert(payload)
                .select('id')
                .single();
              if (error) throw error;
              return { key, finding: { ...finding, cop_db_id: data?.id } };
            }
          })
        );

        copResults.forEach(({ key, finding }) => { savedCopFindings[key] = finding; });
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

      const { error: errorWizard } = await supabaseUser
        .from('food_safety_audit_reports')
        .update({
          wizard_data: wizardData,
          observaciones_gen: observacionesGen || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (errorWizard) throw errorWizard;

      res.json({
        success: true,
        data: { copFindings: savedCopFindings }
      });

    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ---------------------------------------------------------
  // 5. GENERAR PDF  (FIX #1, #2, #9)
  // ---------------------------------------------------------
  async generatePdf(req: Request, res: Response) {
    try {
      const auth = await getUserFromToken(req, res);
      if (!auth) return;
      const { supabaseUser, user } = auth;
      const { id } = req.params;

      // FIX #9: PRIMERO obtener el reporte y verificar propiedad (FIX #1),
      // LUEGO actualizar estado — si el reporte no existe, retorna 404 limpio
      const { data: report, error } = await supabaseUser
        .from('food_safety_audit_reports')
        .select('*')
        .eq('id', id)
        .eq('auditor_id', user.id)   // ← FIX #1
        .single();

      if (error || !report) {
        return res.status(404).json({ success: false, error: 'Reporte no encontrado o sin acceso' });
      }

      // FIX #2: usar supabaseUser en lugar de supabaseAdmin para respetar RLS
      const { data: copFindings } = await supabaseUser
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

      // FIX #5: usar el browser singleton en lugar de crear/destruir uno por request
      const browser = await getBrowser();
      const page = await browser.newPage();
      let pdfBuffer: Uint8Array;
      try {
        // Seguridad: Chromium solo puede cargar recursos inline (data:) y las
        // imágenes de nuestro Storage. Cualquier otra URL que se colara en el
        // contenido (red interna, metadata del servidor, etc.) se bloquea.
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const url = request.url();
          if (isAllowedPdfResource(url)) {
            request.continue();
          } else {
            console.warn('[FSA PDF] Recurso bloqueado:', url.slice(0, 200));
            request.abort();
          }
        });

        await page.setContent(html, { waitUntil: 'load' });
        await new Promise(r => setTimeout(r, 800));

        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '28mm', bottom: '22mm', left: '16mm', right: '16mm' },
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate,
        });
      } finally {
        // Cerrar solo la página (no el browser) para mantener el singleton activo.
        // Va en finally: si algo falla, la pestaña no se queda abierta consumiendo memoria.
        await page.close().catch(() => {});
      }

      // Marcar como finalizado SOLO cuando el PDF ya se generó (antes se marcaba
      // primero y, si Chromium fallaba, el reporte quedaba finalizado sin PDF).
      const { error: errorEstado } = await supabaseUser
        .from('food_safety_audit_reports')
        .update({ estado: 'finalizado' })
        .eq('id', id);
      if (errorEstado) {
        // No bloqueamos la descarga: el PDF es válido; solo queda registro.
        console.error('[FSA PDF] No se pudo marcar como finalizado:', errorEstado.message);
      }

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
  // 6. ELIMINAR REPORTE  (FIX #1: verifica propiedad)
  // ---------------------------------------------------------
  async delete(req: Request, res: Response) {
    try {
      const auth = await getUserFromToken(req, res);
      if (!auth) return;
      const { supabaseUser, user } = auth;
      const { id } = req.params;

      // FIX #1: solo el propietario puede eliminar su reporte
      const { error } = await supabaseUser
        .from('food_safety_audit_reports')
        .delete()
        .eq('id', id)
        .eq('auditor_id', user.id);

      if (error) throw error;

      res.json({ success: true, message: 'Reporte eliminado correctamente' });
    } catch (error: any) {
      console.error('Error al eliminar reporte FSA:', error);
      res.status(500).json({ success: false, error: error.message || 'Error al eliminar reporte' });
    }
  }
}

export default new FoodSafetyAuditController();
