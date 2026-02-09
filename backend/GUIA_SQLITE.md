# 🗄️ SISTEMA SQLite - GUIA RÁPIDO

## 📍 Localização dos arquivos:
```
/home/admin_django/projetos/fps/fps-interface-proxy/backend/
├── db/
│   ├── analytics.db          # Banco de dados SQLite
│   └── syncService.js         # Lógica de sincronização
├── restart.sh                 # Reinicia o servidor
├── ver_banco.sh              # Visualiza dados do banco
└── testar_sync.sh            # Testa sincronização
```

## 🚀 COMANDOS PRINCIPAIS:

### 1. Ver o banco de dados:
```bash
cd /home/admin_django/projetos/fps/fps-interface-proxy/backend
./ver_banco.sh
```
Mostra: total de eventos, últimas sincronizações, últimos registros

### 2. Testar sincronização:
```bash
./testar_sync.sh
```
Força uma sincronização e mostra os resultados

### 3. Reiniciar servidor (NECESSÁRIO para aplicar correções):
```bash
./restart.sh
```
Para o servidor atual e inicia com código atualizado

## ⚠️ PROBLEMA ATUAL:

O servidor está rodando código ANTIGO que não salva eventos corretamente.

**Solução**: Execute `./restart.sh` para carregar o código corrigido.

## 🔧 O QUE FOI CORRIGIDO:

✅ Busca apenas eventos NOVOS (evita duplicação)
✅ Mantém histórico de 1 ANO (não 30 dias)
✅ Processa corretamente resposta do AppDynamics
✅ Limita a 50.000 eventos por sincronização
✅ Sincronização automática a cada 10 minutos

## 📊 COMO VERIFICAR SE ESTÁ FUNCIONANDO:

Após reiniciar:
```bash
# Deve mostrar eventos sendo salvos
./ver_banco.sh

# Ou via API:
curl -s http://localhost:4001/api/sync/status | jq '.currentRecords'
```

Se mostrar > 0, está funcionando! 🎉

## 🔍 CONSULTAS ÚTEIS NO BANCO:

```bash
DB_PATH="/home/admin_django/projetos/fps/fps-interface-proxy/backend/db/analytics.db"

# Total de eventos
sqlite3 $DB_PATH "SELECT COUNT(*) FROM transactions;"

# Eventos por saúde
sqlite3 $DB_PATH "SELECT saude, COUNT(*) as total FROM transactions GROUP BY saude;"

# Buscar por RA específico
sqlite3 $DB_PATH "SELECT * FROM transactions WHERE ra = '2023123046' LIMIT 10;"

# Eventos com erro
sqlite3 $DB_PATH "SELECT url, error_code FROM transactions WHERE error_code IS NOT NULL LIMIT 20;"
```

## 📡 API ENDPOINTS:

- `GET  /api/sync/status` - Status da sincronização
- `POST /api/sync` - Forçar sincronização manual
- `GET  /api/stats/local?days=30&limit=10000` - Estatísticas do banco local
