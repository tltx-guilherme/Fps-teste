import { jsonResponse, errorResponse } from '@/lib/api-utils';
import { supabase } from '@/lib/db';

// GET /api/sync/status
export async function GET(request) {
  try {
    const { count, error } = await supabase
      .from('sync_metadata')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return jsonResponse({
      status: 'active',
      lastSync: new Date().toISOString(),
      totalRecords: count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
