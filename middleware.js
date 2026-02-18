import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Rotas publicas (nao precisam de autenticacao)
  const publicRoutes = ['/login', '/api/auth/login'];
  
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Para rotas protegidas (se implementar middleware de verdade)
  // const authHeader = request.headers.get('authorization') || '';
  // const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
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
