import { NextResponse } from 'next/server';
import { getTokenFromRequest } from './lib/auth';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rotas públicas (não precisam de autenticação)
  const publicRoutes = ['/login', '/api/auth/login'];
  
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Para rotas protegidas (se implementar middleware de verdade)
  // const token = getTokenFromRequest(request);
  // if (!token) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
