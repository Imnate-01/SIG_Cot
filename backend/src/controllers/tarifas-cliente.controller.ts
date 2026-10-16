import { Request, Response } from 'express'
import { contextoAuth } from '../middlewares/requireAuth'
import { responderError } from '../utils/http'

export class TarifasClienteController {

  // GET /api/tarifas-cliente/:clienteId
  async getByCliente(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      const { clienteId } = req.params;

      const { data, error } = await supabaseUser
        .from('tarifas_cliente')
        .select('*, servicios(concepto, unidad, moneda)')
        .eq('cliente_id', clienteId)
        .eq('activo', true);

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // POST /api/tarifas-cliente (bulk upsert)
  async upsert(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      const { cliente_id, tarifas } = req.body;
      // tarifas: [{ servicio_id, precio_contrato }]

      if (!cliente_id || !Array.isArray(tarifas)) {
        return res.status(400).json({ success: false, error: "cliente_id y tarifas[] son requeridos" });
      }

      const rows = tarifas.map((t: any) => ({
        cliente_id,
        servicio_id: t.servicio_id,
        precio_contrato: t.precio_contrato,
        activo: true
      }));

      const { data, error } = await supabaseUser
        .from('tarifas_cliente')
        .upsert(rows, { onConflict: 'cliente_id,servicio_id' })
        .select();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (error: any) {
      responderError(res, error);
    }
  }

  // DELETE /api/tarifas-cliente/:id
  async delete(req: Request, res: Response) {
    try {
      const supabaseUser = contextoAuth(req).supabase;
      const { id } = req.params;

      const { error } = await supabaseUser
        .from('tarifas_cliente')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true, message: 'Tarifa eliminada' });
    } catch (error: any) {
      responderError(res, error);
    }
  }
}

export default new TarifasClienteController();
