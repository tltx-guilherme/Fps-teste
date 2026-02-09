import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

const useSsl = (process.env.PGSSL || '').toLowerCase() === 'true';

const pool = new Pool({
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  host: 'db.ubtwernbbbaismnwbrwr.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.DATABASE_URL?.match(/password:([^@]+)/)?.[1] || 'UGmEPrdjCAU4exZm'
});

// Endpoint para importar dados do JSON
router.post('/import-data', async (req, res) => {
  try {
    const { transactions = [], searchLogs = [], syncMeta = [] } = req.body;
    
    console.log(`📥 Recebendo dados para importação:`);
    console.log(`   Transactions: ${transactions.length}`);
    console.log(`   Search logs: ${searchLogs.length}`);
    console.log(`   Sync metadata: ${syncMeta.length}`);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Limpa dados existentes
      await client.query('DELETE FROM transactions');
      await client.query('DELETE FROM search_logs');
      await client.query('DELETE FROM sync_metadata');
      
      console.log('🗑️  Dados existentes removidos');
      
      // Importa transactions em chunks
      if (transactions.length > 0) {
        console.log('📦 Importando transactions...');
        const chunkSize = 1000;
        let imported = 0;
        
        for (let i = 0; i < transactions.length; i += chunkSize) {
          const chunk = transactions.slice(i, i + chunkSize);
          const values = [];
          const placeholders = chunk.map((t, idx) => {
            const base = idx * 8;
            values.push(
              t.url,
              t.url_resumida,
              t.horario,
              t.saude,
              t.error_code,
              t.ra,
              t.synced_at,
              t.created_at || t.horario || Date.now()
            );
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
          });

          const insertSql = `
            INSERT INTO transactions (url, url_resumida, horario, saude, error_code, ra, synced_at, created_at)
            VALUES ${placeholders.join(',')}
          `;

          await client.query(insertSql, values);
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
          const chunk = searchLogs.slice(i, i + chunkSize);
          const values = [];
          const placeholders = chunk.map((s, idx) => {
            const base = idx * 4;
            // Converte timestamps de segundos para milissegundos se necessário
            const searchedAtMs = s.searched_at < 1e12 ? s.searched_at * 1000 : s.searched_at;
            values.push(
              s.ra,
              s.user_id,
              s.ip,
              searchedAtMs
            );
            return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
          });

          const insertSql = `
            INSERT INTO search_logs (ra, user_id, ip, searched_at)
            VALUES ${placeholders.join(',')}
          `;

          await client.query(insertSql, values);
        }
        console.log(`   Importados ${searchLogs.length} search logs`);
      }
      
      // Importa sync metadata
      if (syncMeta.length > 0) {
        console.log('📦 Importando sync metadata...');
        for (const meta of syncMeta) {
          await client.query(
            'INSERT INTO sync_metadata (last_sync, total_records, sync_status, error_message) VALUES ($1, $2, $3, $4)',
            [meta.last_sync, meta.total_records, meta.sync_status, meta.error_message]
          );
        }
        console.log(`   Importados ${syncMeta.length} sync metadata`);
      }
      
      await client.query('COMMIT');
      
      // Verifica os dados importados
      const transactionCount = await client.query('SELECT COUNT(*)::bigint as count FROM transactions');
      const searchLogCount = await client.query('SELECT COUNT(*)::bigint as count FROM search_logs');
      const syncMetaCount = await client.query('SELECT COUNT(*)::bigint as count FROM sync_metadata');
      
      console.log('✅ Importação concluída!');
      
      res.json({
        success: true,
        imported: {
          transactions: Number(transactionCount.rows[0].count),
          searchLogs: Number(searchLogCount.rows[0].count),
          syncMeta: Number(syncMetaCount.rows[0].count)
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    res.status(500).json({ 
      error: 'Erro na importação',
      message: error.message 
    });
  }
});

export default router;