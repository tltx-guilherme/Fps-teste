import { getUserIdFromRequest, isAdminFromRequest, getTokenFromRequest, verifyToken } from './auth.js';

// Response helper
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Erro response
export function errorResponse(error, status = 400) {
  const message = error instanceof Error ? error.message : String(error);
  return jsonResponse({ error: message }, status);
}

// Middleware para requerer autenticação
export function requireAuth(handler) {
  return async (request) => {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return jsonResponse({ error: 'Não autenticado' }, 401);
    }
    
    // Adiciona userId ao request
    request.userId = userId;
    return handler(request);
  };
}

// Middleware para requerer admin
export function requireAdmin(handler) {
  return async (request) => {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return jsonResponse({ error: 'Não autenticado' }, 401);
    }
    
    if (!isAdminFromRequest(request)) {
      return jsonResponse({ error: 'Acesso negado' }, 403);
    }
    
    request.userId = userId;
    return handler(request);
  };
}

// Extrai body de requisição
export async function getRequestBody(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
}

// Extrai query param
export function getQueryParam(request, param) {
  const url = new URL(request.url);
  return url.searchParams.get(param);
}

// Extrai múltiplos query params
export function getQueryParams(request, params = []) {
  const url = new URL(request.url);
  const result = {};
  
  params.forEach(param => {
    result[param] = url.searchParams.get(param);
  });
  
  return result;
}

// Extrai IP do cliente
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Extrai bearer token
export function getBearerToken(request) {
  return getTokenFromRequest(request);
}

// Valida token e retorna payload
export function validateToken(request) {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyToken(token);
}
