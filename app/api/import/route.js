import { jsonResponse, errorResponse, getRequestBody } from '@/lib/api-utils';
import { supabase } from '@/lib/db';

// POST /api/import-data
export async function POST(request) {
  try {
    const { transactions = [], searchLogs = [], syncMeta = [] } = await getRequestBody(request);
    
    console.log(`📥 Importando dados:`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Search logs: ${searchLogs.length}`);
    console.log(`   Sync metadata: ${syncMeta.length}`);
    
    let imported = { transactions: 0, searchLogs: 0, syncMeta: 0 };
    
    // Importa transactions em chunks
    if (transactions.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < transactions.length; i += chunkSize) {
        const chunk = transactions.slice(i, i + chunkSize).map(t => ({
          url: t.url,
          url_resumida: t.url_resumida,
          horario: t.horario,
          saude: t.saude,
          error_code: t.error_code,
          ra: t.ra,
          synced_at: t.synced_at,
          created_at: t.created_at || t.horario || Date.now()
        }));
        
        const { error } = await supabase.from('transactions').insert(chunk);
        if (error) console.error(`Erro ao importar transactions:`, error.message);
      }
      imported.transactions = transactions.length;
    }
    
    // Importa search logs
    if (searchLogs.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < searchLogs.length; i += chunkSize) {
        const chunk = searchLogs.slice(i, i + chunkSize).map(s => ({
          ra: s.ra,
          user_id: s.user_id,
          ip: s.ip,
          searched_at: s.searched_at < 1e12 ? s.searched_at * 1000 : s.searched_at
        }));
        
        const { error } = await supabase.from('search_logs').insert(chunk);
        if (error) console.error(`Erro ao importar logs:`, error.message);
      }
      imported.searchLogs = searchLogs.length;
    }
    
    console.log('✅ Importação concluída!');
    
    return jsonResponse({
      success: true,
      imported
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}
