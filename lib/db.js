import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials not configured');
}

// Cliente Supabase com service role (para APIs do servidor)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Registra log de pesquisa
export async function logSearchRA({ ra, userId, ip }) {
  try {
    const { error } = await supabase.from('search_logs').insert({
      ra: ra || null,
      user_id: userId || 'unknown',
      ip: ip || null,
      searched_at: Date.now()
    });
    
    if (error) {
      console.error('❌ Erro ao registrar log:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Erro ao registrar log:', error.message);
    return false;
  }
}

// Busca registros de uma tabela
export async function getRecords(tableName, options = {}) {
  try {
    let query = supabase.from(tableName).select(options.select || '*');
    
    if (options.limit) query = query.limit(options.limit);
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Erro ao buscar ${tableName}:`, error.message);
    return [];
  }
}

// Insere registros
export async function insertRecords(tableName, records) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .insert(records);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Erro ao inserir em ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Conta registros
export async function countRecords(tableName, filters = {}) {
  try {
    let query = supabase.from(tableName).select('*', { count: 'exact', head: true });
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    });
    
    const { count, error } = await query;
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error(`Erro ao contar ${tableName}:`, error.message);
    return 0;
  }
}
