# 🔄 Guia Rápido - Sistema de Backup

## Resumo Executivo

Implementamos um sistema de backup automático para proteger seus dados contra perdas futuras.

## ⚡ Comandos Rápidos

### Fazer Backup Agora
```bash
node scripts/backup-db.mjs
```

### Agendar Backups Automáticos (Diários)
```bash
node scripts/backup-scheduler.mjs
```

### Restaurar Backup Anterior
```bash
node scripts/restore-db.mjs ./backups/backup-XXXX.json.gz
```

### Testar Sistema de Backup
```bash
node scripts/test-backup.mjs
```

## 📂 Onde Estão os Backups?

Todos os backups são salvos em: `./backups/`

Exemplo de arquivo: `backup-2024-11-16T21-29-30-123Z.json.gz`

## 🎯 O Que Foi Implementado?

### 1. Scripts de Backup
- **backup-db.mjs** - Exporta dados do banco para arquivo comprimido
- **restore-db.mjs** - Restaura dados de um backup anterior
- **backup-scheduler.mjs** - Agenda backups automáticos diários
- **test-backup.mjs** - Valida se tudo está funcionando

### 2. API tRPC para Gerenciar Backups
Admins podem usar a API para:
- Listar backups: `trpc.backup.list.useQuery()`
- Criar backup: `trpc.backup.create.useMutation()`
- Deletar backup: `trpc.backup.delete.useMutation()`
- Ver info: `trpc.backup.info.useQuery()`

### 3. Limpeza Automática
- Mantém apenas os últimos 30 backups
- Deleta backups antigos automaticamente

## 🚀 Próximos Passos Recomendados

### 1. Teste o Sistema (Agora)
```bash
node scripts/test-backup.mjs
```

### 2. Crie um Backup Manual (Agora)
```bash
node scripts/backup-db.mjs
```

### 3. Configure Backup Automático (Produção)

**Opção A: Usar PM2 (Recomendado)**
```bash
npm install -g pm2
pm2 start scripts/backup-scheduler.mjs --name "backup-scheduler"
pm2 save
pm2 startup
```

**Opção B: Usar Cron Job (Linux)**
```bash
# Editar crontab
crontab -e

# Adicionar esta linha (backup diário às 2 AM):
0 2 * * * cd /home/ubuntu/busca-ponto-saas && node scripts/backup-db.mjs >> backup.log 2>&1
```

**Opção C: Usar Systemd (Linux)**
Criar arquivo `/etc/systemd/system/backup-scheduler.service`:
```ini
[Unit]
Description=Busca Ponto Backup Scheduler
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/busca-ponto-saas
ExecStart=/usr/bin/node scripts/backup-scheduler.mjs
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl daemon-reload
sudo systemctl enable backup-scheduler
sudo systemctl start backup-scheduler
```

### 4. Teste Restauração (Opcional)
```bash
# Listar backups disponíveis
ls -lh backups/

# Restaurar um backup (será solicitada confirmação)
node scripts/restore-db.mjs ./backups/backup-XXXX.json.gz
```

## 📊 Monitoramento

### Ver Último Backup
```bash
ls -lt backups/ | head -2
```

### Ver Tamanho Total
```bash
du -sh backups/
```

### Ver Todos os Backups
```bash
ls -lh backups/ | grep backup
```

## ⚠️ Importante

- **Backups são locais** (no servidor). Considere copiar para outro local
- **Restauração sobrescreve dados** - será solicitada confirmação
- **Teste restaurações** periodicamente para garantir que funcionam
- **Mantenha espaço em disco** - backups ocupam espaço

## 🆘 Problemas?

1. **Erro "DATABASE_URL não encontrado"**
   - Verifique se `.env.local` existe no diretório raiz

2. **Backup muito lento**
   - Normal para muitos dados. Não interrompa o processo

3. **Espaço em disco cheio**
   - Aumente a frequência de backups ou delete backups antigos manualmente

## 📞 Precisa de Ajuda?

Veja o documento completo: `BACKUP_SYSTEM.md`

---

**Implementado em:** 16 de novembro de 2024
