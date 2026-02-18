import { jsonResponse, errorResponse, getQueryParam, requireAuth } from '@/lib/api-utils';
import { logSearchRA, getRecords } from '@/lib/db';
import { getClientIp } from '@/lib/api-utils';

// GET /api/analytics/search/[ra]
export async function GET(request, { params }) {
  try {
    const { ra } = params;
    const limit = parseInt(getQueryParam(request, 'limit')) || 1000;
    const offset = parseInt(getQueryParam(request, 'offset')) || 0;
    
    // Registra a pesquisa
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const ip = getClientIp(request);
    await logSearchRA({ ra, userId, ip });
    
    // Busca dados do Supabase
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('ra', ra)
      .order('horario', { ascending: false })
      .range(offset, offset + limit);
    
    if (error) throw error;
    
    return jsonResponse({
      ra,
      totalRecords: data?.length || 0,
      data: data || []
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
