import { Request, Response } from 'express'
import { createClientForUser } from '../config/supabase' // Usamos el cliente seguro

export class ReportesController {

  async getDashboardStats(req: Request, res: Response) {
    try {
      // 1. Seguridad: Validar token
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });

      const supabaseUser = createClientForUser(token);

      // 2. Consulta Segura (Respetando RLS)
      const { data: cotizaciones, error } = await supabaseUser
        .from('cotizaciones')
        .select(`
          id, total, estado, fecha_creacion, tipo_servicio, condiciones,
          clientes ( nombre )
        `)
        .order('fecha_creacion', { ascending: true })

      if (error) throw error

      // 3. PROCESAMIENTO DE DATOS (Matemáticas simples)

      // A. KPIs Generales
      let totalCotizado = 0;
      let totalVendido = 0; // Solo estado 'aceptada'
      let conteoPorEstado = { borrador: 0, aceptada: 0, rechazada: 0 };

      // B. Datos para Gráfica Mensual (Ene, Feb, Mar...)
      const ventasPorMes: any = {}; // Ej: { "2023-11": 15000 }

      // C. Top Clientes
      const ventasPorCliente: any = {};

      cotizaciones?.forEach((cot: any) => {
        const monto = Number(cot.total) || 0;
        const estado = cot.estado || 'borrador';
        const fecha = new Date(cot.fecha_creacion);
        const mesKey = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`; // "2023-11"
        const nombreMes = fecha.toLocaleString('es-MX', { month: 'short' }); // "nov"

        // KPI Sumas
        totalCotizado += monto;
        if (estado === 'aceptada') {
          totalVendido += monto;

          // Sumar al cliente (Solo lo vendido cuenta para el Top)
          // Nota: Usamos optional chaining ?. por seguridad si clientes viene null
          const cliente = cot.clientes?.nombre || 'Desconocido';
          ventasPorCliente[cliente] = (ventasPorCliente[cliente] || 0) + monto;
        }

        // Conteo Estados
        // @ts-ignore
        conteoPorEstado[estado] = (conteoPorEstado[estado] || 0) + 1;

        // Historial Mensual (Sumamos todo lo cotizado para ver actividad)
        if (!ventasPorMes[mesKey]) {
          ventasPorMes[mesKey] = { name: nombreMes, cotizado: 0, ganado: 0, orden: fecha.getTime() };
        }
        ventasPorMes[mesKey].cotizado += monto;
        if (estado === 'aceptada') ventasPorMes[mesKey].ganado += monto;
      });

      // 4. FORMATEO PARA EL FRONTEND

      // Convertir objeto mensual a array ordenado para la gráfica
      const historyData = Object.values(ventasPorMes).sort((a: any, b: any) => a.orden - b.orden);

      // Convertir clientes a array y tomar el Top 5
      const topClientes = Object.entries(ventasPorCliente)
        .map(([name, value]) => ({ name, value }))
        .sort((a: any, b: any) => (b.value as number) - (a.value as number))
        .slice(0, 5);

      // Datos del Pie Chart (Estados)
      const pieData = [
        { name: 'Ganadas', value: conteoPorEstado.aceptada, color: '#10B981' }, // Verde
        { name: 'Pendientes', value: conteoPorEstado.borrador, color: '#F59E0B' }, // Amarillo
        { name: 'Perdidas', value: conteoPorEstado.rechazada, color: '#EF4444' }, // Rojo
      ];

      res.json({
        success: true,
        data: {
          kpis: {
            totalCotizado,
            totalVendido,
            tasaConversion: totalCotizado > 0 ? ((totalVendido / totalCotizado) * 100).toFixed(1) : 0,
            totalCotizaciones: cotizaciones?.length || 0
          },
          chartData: historyData,
          pieData,
          topClientes,
          // Raw data for frontend country filtering (null/missing entidad = MX legacy)
          rawCotizaciones: (cotizaciones || []).map((c: any) => ({
            id: c.id,
            total: c.total,
            estado: c.estado,
            fecha_creacion: c.fecha_creacion,
            entidad: c.condiciones?.entidad || 'MX',
            cliente: c.clientes?.nombre || 'Desconocido'
          }))
        }
      })

    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message })
    }
  }
  async getPredictiveStats(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ success: false, error: "No autorizado" });

      const { userQuery } = req.body; // New: User's specific question

      const supabaseUser = createClientForUser(token);

      // 1. Obtener datos históricos y contexto (últimos 12 meses)
      const { data: cotizaciones, error } = await supabaseUser
        .from('cotizaciones')
        .select(`
          total, fecha_creacion, estado, tipo_servicio,
          clientes ( nombre )
        `)
        .order('fecha_creacion', { ascending: true });

      if (error) throw error;

      // 2. Procesar Datos para Contexto
      const history: any = {};
      const clientsMap: any = {};
      const servicesMap: any = {};

      cotizaciones?.forEach((cot: any) => {
        const fecha = new Date(cot.fecha_creacion);
        // Filtro de 12 meses atrás approx (opcional, por ahora enviamos todo lo que traiga)
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const monto = Number(cot.total) || 0;

        // Historial Mensual (Solo ganadas para predicción financiera real, o todo para tendencia de demanda)
        // Para predicción de ventas, usaremos solo 'aceptada'.
        if (cot.estado === 'aceptada') {
          if (!history[mesKey]) history[mesKey] = 0;
          history[mesKey] += monto;

          // Top Clientes
          const clientName = cot.clientes?.nombre || 'Desconocido';
          clientsMap[clientName] = (clientsMap[clientName] || 0) + monto;

          // Servicios
          const service = cot.tipo_servicio || 'General';
          servicesMap[service] = (servicesMap[service] || 0) + monto;
        }
      });

      // Formatear para Prompt
      const historyText = Object.entries(history)
        .sort()
        .map(([mes, total]) => `Mes ${mes}: $${total}`)
        .join('\n');

      const topClientsText = Object.entries(clientsMap)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 5)
        .map(([c, v]) => `- ${c}: $${v}`)
        .join('\n');

      const servicesText = Object.entries(servicesMap)
        .sort(([, a]: any, [, b]: any) => b - a)
        .map(([s, v]) => `- ${s}: $${v}`)
        .join('\n');

      // 3. Construir Prompt Especializado
      const prompt = `
        Actúa como un Analista de Datos Senior y Estratega Comercial para SIG Combibloc.
        Tienes acceso a los siguientes datos históricos de ventas (moneda local):
        
        [Historial Mensual (Ventas Ganadas)]
        ${historyText}

        [Top Clientes]
        ${topClientsText}

        [Ventas por Tipo de Servicio]
        ${servicesText}

        ${userQuery ? `[Pregunta Específica del Usuario]\n"${userQuery}"` : ""}
        
        Instrucciones:
        1. Genera una predicción de ventas para los próximos 3 meses basada en la tendencia histórica.
        2. ${userQuery ? "Responde directamente a la pregunta del usuario usando los datos provistos." : "Realiza un análisis breve de la tendencia actual."}
        3. Identifica patrones, estacionalidad o riesgos basados en la concentración de clientes o servicios.
        
        Formato de Salida (JSON exlusivamente):
        {
          "prediction": [
            { "mes": "YYYY-MM", "venta_estimada": 0 },
            { "mes": "YYYY-MM", "venta_estimada": 0 },
            { "mes": "YYYY-MM", "venta_estimada": 0 }
          ],
          "analisis": "Texto del análisis estratégico aquí (max 60 palabras). Responder a la pregunta si existe.",
          "alerta": "Alguna advertencia crítica o oportunidad detectada (opcional, max 15 palabras)."
        }
      `;

      // 4. Llamar a Gemini
      const { callGemini } = require('../utils/gemini');
      let aiResponse = await callGemini(prompt);

      // Limpiar JSON
      aiResponse = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const predictionData = JSON.parse(aiResponse);

      res.json({ success: true, data: predictionData });

    } catch (error: any) {
      console.error("Error en predicción:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default new ReportesController()