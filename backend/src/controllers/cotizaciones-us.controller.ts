import { Request, Response } from 'express';
import { createClientForUser } from '../config/supabase';

export class CotizacionesUsController {
  
  // 1. CREAR COTIZACIÓN US STANDARD
  async create(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado: Falta token' });

      const supabaseUser = createClientForUser(token);
      
      const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
      if (authError || !user) {
        return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
      }

      const {
        customer,
        city_state,
        scope_of_visit,
        equipment_to_service,
        payment_terms,
        quoted_by,
        travel_legs = [],
        labor_schedule = [],
        preparation_amount = 0,
        expenses_amount = 0,
        calibration_amount = 0,
        sales_accommodation_amount = 0,
        travel_subtotal = 0,
        labor_subtotal = 0,
        grand_total = 0,
        datos_forma = {}
      } = req.body;

      // Insertar en la BD
      const { data, error } = await supabaseUser
        .from('cotizaciones_us_standard')
        .insert({
          customer,
          city_state,
          scope_of_visit,
          equipment_to_service,
          payment_terms,
          quoted_by,
          travel_legs,
          labor_schedule,
          preparation_amount,
          expenses_amount,
          calibration_amount,
          sales_accommodation_amount,
          travel_subtotal,
          labor_subtotal,
          grand_total,
          datos_forma,
          estado: 'borrador',
          creado_por: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Generar el formato de folio YYYYMMDD_N
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const quote_number = `${dateStr}_${data.id}`;

      // Actualizar la cotización con su número
      const { data: updatedData, error: updateError } = await supabaseUser
        .from('cotizaciones_us_standard')
        .update({ quote_number })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) throw updateError;

      res.status(201).json({ success: true, data: updatedData });

    } catch (error: any) {
      console.error('Error al crear cotización US:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 2. OBTENER TODAS
  async getAll(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });

      const supabaseUser = createClientForUser(token);

      const { data, error } = await supabaseUser
        .from('cotizaciones_us_standard')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 3. OBTENER POR ID
  async getById(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      const { data, error } = await supabaseUser
        .from('cotizaciones_us_standard')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 4. ACTUALIZAR
  async update(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      // Verificar que existe y es borrador
      const { data: cotActual, error: checkError } = await supabaseUser
        .from('cotizaciones_us_standard')
        .select('estado')
        .eq('id', id)
        .single();

      if (checkError || !cotActual) {
        return res.status(404).json({ success: false, message: 'No encontrada' });
      }

      if (cotActual.estado !== 'borrador') {
        return res.status(400).json({ success: false, message: 'Solo se pueden editar cotizaciones en estado borrador.' });
      }

      const updateData = req.body;

      const { data, error } = await supabaseUser
        .from('cotizaciones_us_standard')
        .update({
          customer: updateData.customer,
          city_state: updateData.city_state,
          scope_of_visit: updateData.scope_of_visit,
          equipment_to_service: updateData.equipment_to_service,
          payment_terms: updateData.payment_terms,
          quoted_by: updateData.quoted_by,
          travel_legs: updateData.travel_legs,
          labor_schedule: updateData.labor_schedule,
          preparation_amount: updateData.preparation_amount,
          expenses_amount: updateData.expenses_amount,
          calibration_amount: updateData.calibration_amount,
          sales_accommodation_amount: updateData.sales_accommodation_amount,
          travel_subtotal: updateData.travel_subtotal,
          labor_subtotal: updateData.labor_subtotal,
          grand_total: updateData.grand_total,
          datos_forma: updateData.datos_forma
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // 5. ELIMINAR
  async delete(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, message: 'No autorizado' });

      const supabaseUser = createClientForUser(token);
      const { id } = req.params;

      const { error } = await supabaseUser
        .from('cotizaciones_us_standard')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ success: true, message: 'Eliminada correctamente' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new CotizacionesUsController();
