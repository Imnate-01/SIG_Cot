import type { Browser } from 'puppeteer-core';

// ─── Browser Singleton ─────────────────────────────────────────────────────
// Mantiene una sola instancia de Chromium activa entre requests consecutivos.
// Esto elimina el overhead de ~5-10s de inicialización por cada PDF generado.
// ──────────────────────────────────────────────────────────────────────────
let _browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  // Reutilizar si la instancia sigue conectada
  if (_browser && _browser.connected) {
    return _browser;
  }

  const puppeteer = await import('puppeteer-core');
  const isLocal = process.platform === 'win32';

  if (isLocal) {
    const LOCAL_CHROME = process.env.CHROME_EXECUTABLE_PATH
      || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    _browser = await puppeteer.default.launch({
      executablePath: LOCAL_CHROME,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 900 },
    });
  } else {
    // Producción (Render/Linux): usar @sparticuz/chromium
    const chromium = (await import('@sparticuz/chromium')).default;
    _browser = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Si el browser se desconecta inesperadamente, limpiar la referencia
  // para que la próxima llamada cree una nueva instancia
  _browser.on('disconnected', () => {
    _browser = null;
  });

  return _browser;
}
