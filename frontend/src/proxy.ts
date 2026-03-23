import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { routing } from './i18n/routing';

// Rutas protegidas (sin prefijo de locale)
const protectedPaths = ['/cotizaciones', '/dashboard', '/perfil', '/clientes', '/servicios', '/reportes', '/reportestec', '/configuracion', '/ayuda'];

const SUPABASE_JWT_SECRET = new TextEncoder().encode(
  process.env.SUPABASE_JWT_SECRET || ''
);

// Middleware de i18n
const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Primero aplicamos el middleware de i18n
  const intlResponse = intlMiddleware(request);

  // 2. Extraer el pathname sin el locale para verificar protección
  //    Ej: /en/cotizaciones → /cotizaciones, /cotizaciones → /cotizaciones
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '/';

  // 3. Verificar si la ruta es protegida
  const isProtectedRoute = protectedPaths.some(path =>
    pathnameWithoutLocale.startsWith(path)
  );

  if (isProtectedRoute) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return redirectToLogin(request);
    }

    try {
      if (!process.env.SUPABASE_JWT_SECRET) {
        console.error(" ERROR: Falta SUPABASE_JWT_SECRET en .env.local");
        return redirectToLogin(request);
      }

      await jwtVerify(token, SUPABASE_JWT_SECRET);
      return intlResponse;

    } catch (error) {
      console.error("Token de Supabase inválido:", error);
      const response = redirectToLogin(request);
      response.cookies.delete('auth_token');
      return response;
    }
  }

  return intlResponse;
}

function redirectToLogin(request: NextRequest) {
  // Detectar el locale actual de la URL
  const locale = request.nextUrl.pathname.match(/^\/(en|es)/)?.[1] || 'es';
  const loginUrl = new URL(`/${locale}/login`, request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)',
  ],
};