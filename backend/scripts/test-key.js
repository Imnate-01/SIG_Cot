// Script de diagnóstico compatible con Node.js antiguo
// Ejecutar con: node test-key.js

require('dotenv').config();
const https = require('https');

const API_KEY = process.env.GEMINI_API_KEY;

console.log("🔑 Probando API Key que termina en:", API_KEY ? "..." + API_KEY.slice(-4) : "NO ENCONTRADA");

if (!API_KEY) {
  console.error("❌ ERROR: No hay API Key en el archivo .env");
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

console.log("📡 Contactando a Google...");

https.get(url, (res) => {
  let data = '';

  // Recibir datos por pedazos
  res.on('data', (chunk) => {
    data += chunk;
  });

  // Al terminar de recibir
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ Error HTTP ${res.statusCode}:`, data);
      return;
    }

    try {
      const json = JSON.parse(data);
      console.log("\n✅ ¡Conexión Exitosa! Tu clave funciona.");
      console.log("📋 Modelos disponibles para ti:");
      
      if (json.models) {
        json.models.forEach(m => {
          // Filtramos solo los que sirven para generar contenido (chat)
          if (m.supportedGenerationMethods.includes("generateContent")) {
            console.log(`   - ${m.name.replace('models/', '')}`);
          }
        });
      } else {
        console.log("⚠️ No se encontraron modelos. Tu proyecto podría no tener la API habilitada.");
      }
    } catch (e) {
      console.error("🔥 Error al analizar respuesta:", e.message);
    }
  });

}).on("error", (err) => {
  console.error("🔥 Error de conexión:", err.message);
});