import { jsonResponse, errorResponse, getRequestBody } from '@/lib/api-utils';
import { supabase } from '@/lib/db';

// POST /api/sync
export async function POST(request) {
  try {
    const { limit = 50000, force = true } = await getRequestBody(request);
    
    // Simula sincronização (em produção, implementar lógica real)
    console.log(`🔄 Sincronização com limit=${limit}, force=${force}`);
    
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    
    return jsonResponse({
      success: true,
      totalRecords: count || 0,
      synced: Math.min(limit, count || 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

// GET /api/sync (GET requests, sendo usado para status também)
export async function GET(request) {
  try {
    const url = new URL(request.url);
    
    // Se for /api/sync/status, trata como status
    if (url.pathname.includes('/status')) {
      const { count, error } = await supabase
        .from('sync_metadata')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      return jsonResponse({
        status: 'active',
        lastSync: new Date().toISOString(),
        totalRecords: count || 0
      });
    }
    
    // Default: retorna status
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });
    
    return jsonResponse({
      status: 'running',
      recordsInDatabase: count || 0
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
