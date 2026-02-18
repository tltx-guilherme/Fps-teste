import { jsonResponse, errorResponse, requireAdmin, getQueryParam } from '@/lib/api-utils';
import { supabase } from '@/lib/db';

const handler = async (request) => {
  try {
    const limit = Math.min(parseInt(getQueryParam(request, 'limit')) || 10000, 50000);
    const offset = parseInt(getQueryParam(request, 'offset')) || 0;
    
    // Busca logs com paginação
    const { data, error, count } = await supabase
      .from('search_logs')
      .select('*', { count: 'exact' })
      .order('searched_at', { ascending: false })
      .range(offset, offset + limit);
    
    if (error) throw error;
    
    return jsonResponse({
      totalRecords: count || 0,
      records: data || [],
      limit,
      offset
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
};

// Protege com requireAdmin
export const GET = requireAdmin(handler);
