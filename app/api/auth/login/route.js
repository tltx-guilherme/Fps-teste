import { jsonResponse, errorResponse } from '@/lib/api-utils';
import { setToken } from '@/lib/auth';

// POST /api/auth/login
export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // TODO: Implementar a lógica de autenticação real
    // Este é um exemplo. Substitua com sua lógica de autenticação real
    // usando seu provedor de autenticação (Auth0, Supabase, Cognito, etc)

    if (!email || !password) {
      return errorResponse('Email e senha obrigatórios', 400);
    }

    // Exemplo: validar contra um usuário hard-coded (alterar em produção!)
    // TODO: Buscar usuário do banco de dados e validar senha com bcrypt
    
    // Gerar JWT (usando jsonwebtoken)
    const token = createJWT({ 
      sub: 'user123', 
      email, 
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    });

    return jsonResponse({
      success: true,
      token,
      user: { email }
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

function createJWT(payload) {
  // Implementação simplificada (use uma lib real em produção)
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
