import { Request, Response } from "express";
import { createClientForUser } from "../config/supabase";

// ✅ SANITIZERS
import { sanitizeDatosGenerales, bigintOrNull } from "../utils/sanitize";

class ReportesTecnicosController {
  // ─────────────────────────────────────────────
  // 1) CATÁLOGOS (FORMULARIO DINÁMICO)
  // ─────────────────────────────────────────────
  async getCatalogos(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ success: false, message: "No autorizado" });

      const supabase = createClientForUser(token);

      const { data: secciones, error: errSecc } = await supabase
        .from("catalogo_secciones")
        .select("*")
        .eq("activo", true)
        .order("orden");

      if (errSecc) throw errSecc;

      const { data: items, error: errItems } = await supabase
        .from("catalogo_items")
        .select("*")
        .order("orden");

      if (errItems) throw errItems;

      const catalogoCompleto = (secciones || []).map((seccion: any) => ({
        ...seccion,
        items: (items || []).filter((item: any) => item.seccion_id === seccion.id),
      }));

      return res.json({ success: true, data: catalogoCompleto });
    } catch (error: any) {
      console.error("Error catalogos:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────
  // 2) CREAR REPORTE FINAL
  // ─────────────────────────────────────────────
  async create(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ success: false, message: "No autorizado" });

      const supabase = createClientForUser(token);
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = userResp?.user;
      if (!user) return res.status(401).json({ success: false, message: "Usuario no identificado" });

      const {
        cliente_id,
        cotizacion_id,
        datos_generales,
        detalles,
        acciones,
        cierre,
        meta,
      } = req.body;

      // ✅ BIGINT SANITIZE
      const clienteId = bigintOrNull(cliente_id);
      const cotizacionId = bigintOrNull(cotizacion_id);

      if (!clienteId) {
        return res.status(400).json({ success: false, message: "cliente_id es requerido" });
      }

      const folio = `TSR-${Date.now()}`;

      // ✅ SANITIZA TODOS LOS CAMPOS PLANOS (numeric/date/bool/text)
      const safeDG = sanitizeDatosGenerales({
        ...(datos_generales || {}),
        comentarios_finales: cierre?.comentarios_finales ?? datos_generales?.comentarios_finales ?? null,
        eficiencias: cierre?.eficiencias ?? datos_generales?.eficiencias ?? null,
        perdidas: cierre?.perdidas ?? datos_generales?.perdidas ?? null,
      });

      const cabeceraInsert: any = {
        folio,
        cliente_id: clienteId,
        cotizacion_id: cotizacionId,
        usuario_id: user.id,

        ...safeDG,

        // si todavía no subes firmas a storage:
        firma_cliente_url: safeDG?.firma_cliente_url ?? null,
        firma_fse_url: safeDG?.firma_fse_url ?? null,

        estado: "finalizado",
        updated_at: new Date().toISOString(),
      };

      const { data: reporte, error: errReporte } = await supabase
        .from("reportes_tecnicos")
        .insert(cabeceraInsert)
        .select("*")
        .single();

      if (errReporte) throw errReporte;

      const reporteId = reporte.id;

      // ── DETALLES
      if (Array.isArray(detalles) && detalles.length > 0) {
        const detallesFormatted = detalles
          .map((d: any) => ({
            reporte_id: reporteId,
            item_id: bigintOrNull(d.item_id), // ✅ por seguridad
            estado: d.estado,
            comentarios: d.comentarios || null,
            evidencia_foto_url:
              d.fotoUrl || (Array.isArray(d.evidencias) ? d.evidencias[0] : null) || null,
          }))
          // evita inserts con item_id null
          .filter((x: any) => !!x.item_id);

        if (detallesFormatted.length > 0) {
          const { error: errDet } = await supabase.from("reporte_detalles").insert(detallesFormatted);
          if (errDet) throw errDet;
        }
      }

      // ── ACCIONES
      if (Array.isArray(acciones) && acciones.length > 0) {
        const accionesFormatted = acciones.map((a: any) => ({
          reporte_id: reporteId,
          descripcion: a.descripcion,
          tipo_accion: a.tipo,
          responsable: a.responsable,
          fecha_limite: a.fecha || null,
          criticidad: a.criticidad || null,
          wo_numero: a.wo_numero || a.wo || null,
        }));

        const { error: errAcc } = await supabase.from("reporte_acciones").insert(accionesFormatted);
        if (errAcc) throw errAcc;
      }

      return res.status(201).json({
        success: true,
        message: "Reporte creado correctamente",
        data: { id: reporteId, folio },
      });
    } catch (error: any) {
      console.error("Error create reporte:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────
  // 3) GUARDAR BORRADOR (AUTO-SAVE)
  // ─────────────────────────────────────────────
  async saveDraft(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ success: false, message: "No autorizado" });

      const supabase = createClientForUser(token);
      const { data: userResp, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const user = userResp?.user;
      if (!user) return res.status(401).json({ success: false, message: "Usuario no identificado" });

      const { datos_generales, payload, cliente_id, draft_id, cotizacion_id } = req.body;

      const safeDG = sanitizeDatosGenerales(datos_generales || {});

      // ✅ BIGINT SAFE
      const clienteId = bigintOrNull(cliente_id ?? safeDG?.cliente_id);
      const cotizacionId = bigintOrNull(cotizacion_id ?? safeDG?.cotizacion_id);
      const draftId = bigintOrNull(draft_id);

      const base: any = {
        usuario_id: user.id,
        cliente_id: clienteId,
        cotizacion_id: cotizacionId,

        ...safeDG,

        // requiere que exista columna JSONB borrador_data
        borrador_data: payload || {},
        estado: "borrador",
        updated_at: new Date().toISOString(),
      };

      // UPDATE si existe draft_id
      if (draftId) {
        const { data, error } = await supabase
          .from("reportes_tecnicos")
          .update(base)
          .eq("id", draftId)
          .select("id, folio, updated_at")
          .single();

        if (error) throw error;
        return res.json({ success: true, data });
      }

      // INSERT nuevo borrador (folio obligatorio)
      const folio = `TSR-DRAFT-${Date.now()}`;

      const { data, error } = await supabase
        .from("reportes_tecnicos")
        .insert({ folio, ...base })
        .select("id, folio, updated_at")
        .single();

      if (error) throw error;

      return res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error save draft:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────
  // LISTADO DE REPORTES (tabla resumen)
  // ─────────────────────────────────────────────
  async getListado(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ success: false, message: "No autorizado" });

      const supabase = createClientForUser(token);

      // 1) Intento principal: VIEW
      const { data, error } = await supabase
        .from("vw_reportes_tecnicos_listado")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        return res.json({ success: true, data: data || [] });
      }

      console.error("Error getListado(view):", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });

      // 2) Fallback: query directa
      const { data: raw, error: err2 } = await supabase
        .from("reportes_tecnicos")
        .select(`
          id,
          folio,
          estado,
          planta,
          fecha_inicio,
          fecha_fin,
          created_at,
          cliente_id,
          clientes ( nombre, empresa ),
          usuario_id,
          usuarios ( nombre )
        `)
        .order("created_at", { ascending: false });

      if (err2) {
        console.error("Error getListado(fallback):", {
          message: err2.message,
          details: (err2 as any).details,
          hint: (err2 as any).hint,
          code: (err2 as any).code,
        });

        const code = (err2 as any).code;
        const isPerm = String(err2.message || "").toLowerCase().includes("permission") || code === "42501";
        return res.status(isPerm ? 403 : 500).json({ success: false, error: err2.message });
      }

      const mapped = (raw || []).map((r: any) => ({
        id: r.id,
        folio: r.folio,
        estado: r.estado,
        planta: r.planta,
        fecha_inicio: r.fecha_inicio,
        fecha_fin: r.fecha_fin,
        created_at: r.created_at,
        cliente_id: r.cliente_id,
        cliente_nombre: r.clientes?.nombre ?? null,
        cliente_empresa: r.clientes?.empresa ?? null,
        usuario_id: r.usuario_id,
        ingeniero_nombre: r.usuarios?.nombre ?? null,
      }));

      return res.json({ success: true, data: mapped });
    } catch (e: any) {
      console.error("Error getListado(unhandled):", e);
      return res.status(500).json({ success: false, error: e.message || "Error interno" });
    }
  }

  // ─────────────────────────────────────────────
  // 4) LISTAR REPORTES (crudo)
  // ─────────────────────────────────────────────
  async getAll(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ success: false });

      const supabase = createClientForUser(token);

      const { data, error } = await supabase
        .from("reportes_tecnicos")
        .select(`*, clientes ( nombre, empresa ), usuarios ( nombre )`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // ─────────────────────────────────────────────
  // 5) OBTENER REPORTE POR ID (DETALLADO)
  // ─────────────────────────────────────────────
  async getById(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ success: false });

      const supabase = createClientForUser(token);
      const { id } = req.params;

      const reportId = bigintOrNull(id);
      if (!reportId) return res.status(400).json({ success: false, message: "ID inválido" });

      const { data: reporte, error } = await supabase
        .from("reportes_tecnicos")
        .select(`*, clientes(*), usuarios(*)`)
        .eq("id", reportId)
        .single();

      if (error) throw error;

      const { data: detalles, error: errDet } = await supabase
        .from("reporte_detalles")
        .select(`*, catalogo_items ( descripcion, seccion_id )`)
        .eq("reporte_id", reportId);

      if (errDet) throw errDet;

      const { data: acciones, error: errAcc } = await supabase
        .from("reporte_acciones")
        .select("*")
        .eq("reporte_id", reportId);

      if (errAcc) throw errAcc;

      return res.json({
        success: true,
        data: {
          ...reporte,
          detalles: detalles || [],
          acciones: acciones || [],
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new ReportesTecnicosController();
