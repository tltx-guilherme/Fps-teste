import express from 'express';
import { syncDatabase, getSyncStatus, getLocalStats } from '../db/syncService.js';

const router = express.Router();

// Força sincronização manual
router.post('/sync', async (req, res) => {
  try {
    const { limit = 50000, force = true } = req.body;
    const result = await syncDatabase({ limit, force });
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao sincronizar',
      message: error.message 
    });
  }
});

// Verifica status da sincronização
router.get('/sync/status', (req, res) => {
  try {
    const status = getSyncStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar status',
      message: error.message 
    });
  }
});

// Busca estatísticas do banco local (muito mais rápido)
router.get('/stats/local', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10000, 50000);
    const daysAgo = parseInt(req.query.days) || 7;
    const ra = req.query.ra || null;
    
    const data = getLocalStats({ limit, daysAgo, ra });
    
    res.json({
      source: 'local_database',
      records: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao buscar dados locais',
      message: error.message 
    });
  }
});

export default router;
