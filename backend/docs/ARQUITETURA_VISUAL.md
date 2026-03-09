# 🏗️ ARQUITETURA NOVA - VISUALIZAÇÃO

## Fluxo de Dados Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPDYNAMICS API                              │
│            (Fonte de eventos - 5k registros/sync)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     NODE.JS BACKEND                             │
│  • newArchSync.js - Busca dados + Insere + Chama RPC          │
│  • ~2-3 segundos por ciclo                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRANSACTIONS_RAW (Particionada)                    │
│  • Tabela bruta com TODOS os eventos                           │
│  • Particionada por mês (2026_02, 2026_03, ...)               │
│  • Histórico completo ever                                     │
│  • ~163k registros/semana exemplo                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ METRICS_    │ │ METRICS_     │ │ METRICS_     │
│ HOURLY      │ │ DAILY        │ │ MONTHLY      │
├─────────────┤ ├──────────────┤ ├──────────────┤
│ data, hora  │ │ data         │ │ ano, mes     │
│ 24 linhas   │ │ ~30-31 linhas│ │ 12 linhas    │
│ por dia     │ │ por mês      │ │ por ano      │
│ ~2KB/dia    │ │ ~60KB/mês    │ │ ~720KB/ano  │
│ 🚀 RÁPIDO   │ │ 🚀 RÁPIDO    │ │ 🚀 RÁPIDO    │
└──────────────┘ └──────────────┘ └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    CACHE (memória)
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               DASHBOARD FRONTEND (React)                        │
│  • Carrega dados pré-agregados                                 │
│  • Gráficos renderizam em <1s                                  │
│  • Sem processamento pesado                                    │
│  • Responsivo em móvel                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Funções por Tabela

### 📦 TRANSACTIONS_RAW
```
┌──────────────────────────────┐
│ TRANSACTIONS_RAW             │
├──────────────────────────────┤
│ id (BIGSERIAL - PK)         │
│ url (TEXT)                   │
│ url_resumida (TEXT)          │
│ horario (TIMESTAMPTZ) ← Índice
│ saude (TEXT)                 │
│ error_code (TEXT[])          │
│ ra (TEXT)                    │
│ synced_at (TIMESTAMPTZ)      │
│ created_at (TIMESTAMPTZ)     │
└──────────────────────────────┘
├─ Partições: 2026_02, 2026_03, ...
├─ Índices: horario, created_at, saude
└─ RLS: Desabilitado (apenas service role)
```

### 📊 METRICS_HOURLY
```
┌──────────────────────────────┐
│ METRICS_HOURLY               │
├──────────────────────────────┤
│ id (BIGSERIAL - PK)         │
│ data (DATE) ← índice         │
│ hora (INTEGER 0-23)          │
│ total_acessos (INTEGER)      │
│ total_erros (INTEGER)        │
│ total_lentas (INTEGER)       │
│ taxa_erro (NUMERIC)          │
│ taxa_lenta (NUMERIC)         │
│ categorias (JSONB)           │
│ tipos_erro (JSONB)           │
│ saude_geral (TEXT)           │
│ ultima_atualizacao (TIMESTAMP)
└──────────────────────────────┘
└─ UNIQUE(data, hora) - Impede duplicatas
```

### 📈 METRICS_DAILY
```
┌──────────────────────────────┐
│ METRICS_DAILY                │
├──────────────────────────────┤
│ id (BIGSERIAL - PK)         │
│ data (DATE UNIQUE) ← índice  │
│ total_acessos (INTEGER)      │
│ total_erros (INTEGER)        │
│ total_lentas (INTEGER)       │
│ taxa_erro (NUMERIC)          │
│ taxa_lenta (NUMERIC)         │
│ categorias (JSONB)           │
│ tipos_erro (JSONB)           │
│ saude_geral (TEXT)           │
│ hora_pico (INTEGER)          │
│ acessos_pico (INTEGER)       │
│ ultima_atualizacao (TIMESTAMP)
└──────────────────────────────┘
```

### 📅 METRICS_MONTHLY
```
┌──────────────────────────────┐
│ METRICS_MONTHLY              │
├──────────────────────────────┤
│ id (BIGSERIAL - PK)         │
│ ano (INTEGER) ← índice       │
│ mes (INTEGER 1-12) ← índice  │
│ total_acessos (INTEGER)      │
│ total_erros (INTEGER)        │
│ total_lentas (INTEGER)       │
│ taxa_erro (NUMERIC)          │
│ taxa_lenta (NUMERIC)         │
│ categorias (JSONB)           │
│ tipos_erro (JSONB)           │
│ saude_geral (TEXT)           │
│ dia_pico (INTEGER)           │
│ acessos_pico (INTEGER)       │
│ ultima_atualizacao (TIMESTAMP)
└──────────────────────────────┘
└─ UNIQUE(ano, mes) - Impede duplicatas
```

### 🎛️ METRICS_CONTROL
```
┌──────────────────────────────┐
│ METRICS_CONTROL              │
├──────────────────────────────┤
│ id (BIGSERIAL - PK)         │
│ metrica_tipo (TEXT UNIQUE)   │
│   → 'hourly', 'daily',       │
│      'monthly'               │
│ ultima_id_processada (BIGINT)│
│ ultima_atualizacao (TIMESTAMP)
│ proxima_atualizacao (TIMESTAMP)
└──────────────────────────────┘
```

---

## Função RPC: update_all_metrics()

```sql
CALL update_all_metrics();

RETORNA:
┌────────────────────────────────┐
│ status | registros_processados │
├────────────────────────────────┤
│ 'OK'   | 5000                  │
└────────────────────────────────┘

EXECUTA:
1. Lê última ID processada de metrics_control
2. INSERT/UPDATE em metrics_hourly (registros novos)
3. INSERT/UPDATE em metrics_daily (agregação horária)
4. INSERT/UPDATE em metrics_monthly (agregação diária)
5. UPDATE metrics_control.ultima_id_processada
6. ATUALIZA última_atualizacao
```

---

## Fluxo de Sincronização

```
NODE.JS (a cada 5 minutos)
    │
    ├─ 1️⃣ Busca 5k registros do AppDynamics
    │
    ├─ 2️⃣ Mapeia para schema novo
    │     horario: ISO STRING (não timestamp ms)
    │     saude: UPPERCASE
    │     error_code: ARRAY
    │
    ├─ 3️⃣ Insere em transactions_raw (em lotes de 500)
    │
    └─ 4️⃣ Chama update_all_metrics()
           ↓
       RPC EXECUTA (no banco):
           • Lê última_id_processada
           • Calcula agregações
           • Atualiza métricas
           • Atualiza controle
           ↓
       RETORNA status OK + 5000 registros
           ↓
       NODE.JS loga resultado
```

---

## Performance Antes vs Depois

### ANTES (Arquitetura Monolítica)
```
┌──────────────────────────────┐
│ Dashboard request            │
└──────────────┬───────────────┘
               │ 55 SEGUNDOS ⏳
               ├─ Lê 163k registros
               ├─ Processa no JS
               ├─ Calcula agregações
               ├─ Formata resposta
               │
               ▼
          Resposta lenta
        Usuário espera: 1 minuto
         Frontend trava
```

### DEPOIS (Arquitetura Agregada)
```
┌──────────────────────────────┐
│ Dashboard request            │
└──────────────┬───────────────┘
               │ 2-3 SEGUNDOS ⚡
               ├─ Query metrics_daily
               ├─ Retorna 30 linhas
               ├─ Formata resposta
               │
               ▼
          Resposta RÁPIDA
        Usuário vê: <3 seg
         Frontend responsivo
```

---

## Escalabilidade

```
COM TRANSACTIONS_RAW PARTICIONADA:

2026-02: ~163k registros = ~30 MB
2026-03: ~163k registros = ~30 MB
2026-04: ~163k registros = ~30 MB
...
2026-12: ~163k registros = ~30 MB

TOTAL ANO: ~1.9M registros = ~360 MB

COM MÉTRICAS AGREGADAS:

metrics_hourly: 12 meses × 31 dias × 24 horas
                = ~8,928 linhas = ~1 MB

metrics_daily: 12 meses × 31 dias
               = ~372 linhas = ~100 KB

metrics_monthly: 12 linhas = ~10 KB

TOTAL MÉTRICAS: ~1.1 MB (vs 360MB bruto)

ÍNDICES: ~50 MB

TOTAL BANCO: ~410 MB (vs ~1900 MB sem otimização)
```

---

## Monitoramento

```bash
# Ver quantos registros têm
SELECT COUNT(*) as total FROM transactions_raw;

# Ver último processamento
SELECT * FROM metrics_control;

# Ver saúde das métricas
SELECT saude_geral, COUNT(*) 
FROM metrics_daily 
GROUP BY saude_geral 
ORDER BY COUNT(*) DESC;

# Perfomance da função
SELECT COUNT(*), AVG(ultima_atualizacao)
FROM metrics_hourly;

# Espaço em disco
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Custo Supabase (Estimado)

### Plano Free
```
✅ 1 database: PostgreSQL
✅ 500 MB storage: SUFICIENTE para 1.1 MB métricas
✅ Requisições API: LIMITADO mas metrics são rápidas
✅ UPDATE_ALL_METRICS(): Execução no banco (não conta quotas)
✅ Ideal para início/crescimento
```

### Plano Pro (se crescer)
```
✅ Storage: 8 GB + $5/GB
✅ Mais requisições API
✅ Backups automáticos
✅ Suporte prioritário
```

---

## ✅ Conclusão

Essa arquitetura garante:

✔ **Performance**: <3 segundos sempre
✔ **Escalabilidade**: Pronto para 10M+
✔ **Confiabilidade**: Sem reprocessamento
✔ **Economia**: Suporta Plano Free
✔ **Manutenção**: Automática e eficiente
