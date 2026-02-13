import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Endpoint para importar dados do JSON
router.post('/import-data', async (req, res) => {
  try {
    const { transactions = [], searchLogs = [], syncMeta = [] } = req.body;
    
    console.log(`📥 Recebendo dados para importação:`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Search logs: ${searchLogs.length}`);
    console.log(`   Sync metadata: ${syncMeta.length}`);
    
    // Limpa dados existentes
    await supabase.from('transactions').delete().neq('id', 0);
    await supabase.from('search_logs').delete().neq('id', 0);
    await supabase.from('sync_metadata').delete().neq('id', 0);
    console.log('🗑️  Dados existentes removidos');
    
    
    // Importa transactions em chunks
    if (transactions.length > 0) {
      console.log('📦 Importando transactions...');
      const chunkSize = 1000;
      let imported = 0;
      
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
        if (error) console.error(`❌ Erro lote transactions ${i}:`, error.message);
        
        imported += chunk.length;
        if (imported % 10000 === 0 || imported === transactions.length) {
          console.log(`   Importados ${imported}/${transactions.length} transactions`);
        }
      }
    }
    
    // Importa search logs
    if (searchLogs.length > 0) {
      console.log('📦 Importando search logs...');
      const chunkSize = 1000;
      
      for (let i = 0; i < searchLogs.length; i += chunkSize) {
        const chunk = searchLogs.slice(i, i + chunkSize).map(s => ({
          ra: s.ra,
          user_id: s.user_id,
          ip: s.ip,
          searched_at: s.searched_at < 1e12 ? s.searched_at * 1000 : s.searched_at
        }));
        
        const { error } = await supabase.from('search_logs').insert(chunk);
        if (error) console.error(`❌ Erro lote search_logs ${i}:`, error.message);
      }
      console.log(`   Importados ${searchLogs.length} search logs`);
    }
    
    // Importa sync metadata
    if (syncMeta.length > 0) {
      console.log('📦 Importando sync metadata...');
      const metaChunk = syncMeta.map(m => ({
        last_sync: m.last_sync,
        total_records: m.total_records,
        sync_status: m.sync_status,
        error_message: m.error_message
      }));
      const { error } = await supabase.from('sync_metadata').insert(metaChunk);
      if (error) console.error('❌ Erro sync_metadata:', error.message);
      console.log(`   Importados ${syncMeta.length} sync metadata`);
    }
    
    // Verifica os dados importados
    const { count: tCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    const { count: sCount } = await supabase.from('search_logs').select('*', { count: 'exact', head: true });
    const { count: mCount } = await supabase.from('sync_metadata').select('*', { count: 'exact', head: true });
    
    console.log('✅ Importação concluída!');
    
    res.json({
      success: true,
      imported: {
        transactions: tCount || 0,
        searchLogs: sCount || 0,
        syncMeta: mCount || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    res.status(500).json({ 
      error: 'Erro na importação',
      message: error.message 
    });
  }
});

export default router;