import { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

import { callGemini } from '../utils/gemini';

export const iaController = {

  // 1. Mejorar Redacción
  mejorarTexto: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Texto requerido" });

      const prompt = `
        Actúa como un ingeniero experto en redacción técnica para SIG Combibloc.
        Reescribe el siguiente texto para que suene profesional, formal y técnico.
        Texto original: "${text}"
        Solo devuelve el texto mejorado, sin explicaciones extra.
      `;

      const result = await callGemini(prompt);
      res.json({ result });
    } catch (error: any) {
      console.error("🔥 Error IA Mejorar Texto:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // 2. Extraer Datos de Cliente
  extraerCliente: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Texto requerido" });

      const prompt = `
        Extrae datos del cliente de este texto desordenado: "${text}".
        Devuelve SOLO un JSON válido (sin markdown, sin bloques de código):
        { "nombre": "", "direccion": "", "colonia": "", "ciudad": "", "cp": "" }
        Si falta un dato, déjalo en blanco.
      `;

      let jsonText = await callGemini(prompt);

      // Limpieza agresiva para asegurar que solo quede el JSON
      jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonText = jsonText.substring(start, end + 1);
      }

      const data = JSON.parse(jsonText);
      res.json({ result: data });
    } catch (error: any) {
      console.error("🔥 Error IA Extraer Cliente:", error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // 3. Generar Correo
  generarCorreo: async (req: Request, res: Response) => {
    try {
      const { cliente, numeroCotizacion, servicios, total, moneda } = req.body;
      const prompt = `
        Redacta un correo formal para enviar la cotización ${numeroCotizacion} al cliente ${cliente}.
        Servicios principales: ${servicios}. 
        Total: $${total} ${moneda}.
        
        Estructura del correo:
        - Asunto sugerido
        - Saludo cordial
        - Cuerpo del mensaje (mencionando adjuntos)
        - Despedida formal de parte de Servicio Técnico SIG Combibloc.
      `;

      const result = await callGemini(prompt);
      res.json({ result });
    } catch (error: any) {
      console.error("🔥 Error IA Generar Correo:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
};