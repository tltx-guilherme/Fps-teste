#!/bin/bash
# Script para monitorar se o servidor FPS está rodando
# Se não estiver, reinicia e envia log

SERVICE_NAME="fps-backend"
LOG_FILE="/home/admin_django/projetos/fps/backend/monitor.log"
ALERT_EMAIL="alert@teletex.com.br"

check_service() {
    if ! systemctl is-active --quiet $SERVICE_NAME; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ ALERTA: Serviço $SERVICE_NAME está DOWN!"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tentando reiniciar..."
        systemctl restart $SERVICE_NAME
        sleep 5
        
        if systemctl is-active --quiet $SERVICE_NAME; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Serviço reiniciado com sucesso!"
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ FALHA ao reiniciar serviço!"
        fi
    else
        # Verifica se está respondendo na porta
        if ! curl -s http://127.0.0.1:4001/api/analytics/stats?days=1 > /dev/null 2>&1; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️ Serviço rodando mas NÃO RESPONDENDO!"
            systemctl restart $SERVICE_NAME
        else
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Serviço rodando e respondendo"
        fi
    fi
}

check_service >> $LOG_FILE 2>&1
