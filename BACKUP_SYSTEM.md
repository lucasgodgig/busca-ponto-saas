# Sistema de Backup Automático

Este documento descreve o sistema de backup automático implementado para proteger os dados do banco de dados da aplicação Busca Ponto SaaS.

## 📋 Visão Geral

O sistema de backup foi implementado para evitar perda de dados em caso de:
- Reversão acidental de código (rollback)
- Corrupção de dados
- Exclusão acidental de registros
- Problemas de infraestrutura

## 🏗️ Arquitetura

### Componentes Principais

```
Sistema de Backup
├── Scripts de Backup
│   ├── scripts/backup-db.mjs          # Script de backup manual
│   ├── scripts/restore-db.mjs         # Script de restauração
│   ├── scripts/backup-scheduler.mjs   # Agendador de backups
│   └── scripts/test-backup.mjs        # Testes do sistema
├── API tRPC
│   └── server/routers/backup.ts       # Procedures para gerenciar backups
└── Armazenamento
    └── backups/                       # Diretório de armazenamento de backups
```

## 🚀 Como Usar

### 1. Criar Backup Manual

Para criar um backup imediatamente:

```bash
node scripts/backup-db.mjs
```

**Saída esperada:**
```
📦 Iniciando backup do banco de dados...
📅 Timestamp: 2024-11-16T21-29-30-123Z
✅ Conectado ao banco de dados
📊 Encontradas 15 tabelas
  ✓ users: 5 registros
  ✓ studies: 23 registros
  ✓ commercial_points: 12 registros
  ...
💾 Backup JSON salvo: ./backups/backup-2024-11-16T21-29-30-123Z.json
📦 Backup comprimido: ./backups/backup-2024-11-16T21-29-30-123Z.json.gz
✅ Backup concluído com sucesso!
```

### 2. Agendar Backups Automáticos

Para iniciar o agendador de backups automáticos (executa diariamente às 02:00 AM UTC):

```bash
node scripts/backup-scheduler.mjs
```

**Nota:** Este processo deve rodar continuamente em background. Você pode usar:
- `pm2` para gerenciar o processo
- `systemd` para criar um serviço
- Docker para containerizar

Exemplo com PM2:
```bash
npm install -g pm2
pm2 start scripts/backup-scheduler.mjs --name "backup-scheduler"
pm2 save
pm2 startup
```

### 3. Restaurar Backup

Para restaurar dados de um backup anterior:

```bash
node scripts/restore-db.mjs ./backups/backup-2024-11-16T21-29-30-123Z.json.gz
```

**Aviso:** Este comando vai **SOBRESCREVER** todos os dados atuais do banco. Você será solicitado a confirmar.

**Processo de restauração:**
1. Descomprime o arquivo .gz
2. Lê os dados do JSON
3. Mostra resumo dos dados a restaurar
4. Solicita confirmação do usuário
5. Limpa as tabelas (TRUNCATE)
6. Insere os dados do backup
7. Remove arquivo temporário

### 4. Gerenciar Backups via API

Se você for admin, pode gerenciar backups através da API tRPC:

#### Listar Backups
```typescript
const { data: backups } = trpc.backup.list.useQuery();
```

Retorna:
```typescript
[
  {
    filename: "backup-2024-11-16T21-29-30-123Z.json.gz",
    timestamp: "2024-11-16T21:29:30.123Z",
    path: "/home/ubuntu/busca-ponto-saas/backups/..."
  },
  ...
]
```

#### Criar Novo Backup
```typescript
const { mutate: createBackup } = trpc.backup.create.useMutation();
createBackup(undefined, {
  onSuccess: (result) => {
    console.log(result.message); // "Backup realizado com sucesso"
  }
});
```

#### Deletar Backup
```typescript
const { mutate: deleteBackup } = trpc.backup.delete.useMutation();
deleteBackup({ filename: "backup-2024-11-16T21-29-30-123Z.json.gz" });
```

#### Informações do Backup
```typescript
const { data: info } = trpc.backup.info.useQuery({
  filename: "backup-2024-11-16T21-29-30-123Z.json.gz"
});
```

Retorna:
```typescript
{
  filename: "backup-2024-11-16T21-29-30-123Z.json.gz",
  size: 245632,
  created: "2024-11-16T21:29:30.123Z",
  modified: "2024-11-16T21:29:30.123Z"
}
```

## 📊 Formato do Backup

Os backups são armazenados em formato **JSON comprimido com gzip** (.json.gz).

Estrutura do JSON (após descompressão):
```json
{
  "timestamp": "2024-11-16T21:29:30.123Z",
  "database": "7gar8dgshizifrgbm35lmu",
  "tables": {
    "users": {
      "rowCount": 5,
      "data": [
        {
          "id": 1,
          "openId": "PH9e3QgX4rCyRqUwYdDkqW",
          "name": "Busca Ponto",
          "email": "buscaponto@example.com",
          ...
        }
      ]
    },
    "studies": {
      "rowCount": 23,
      "data": [...]
    },
    ...
  }
}
```

## 🧹 Política de Retenção

O sistema mantém automaticamente os **últimos 30 backups**. Backups mais antigos são deletados automaticamente.

Para verificar quantos backups você tem:
```bash
ls -lh backups/ | grep "backup-" | wc -l
```

Para listar todos os backups:
```bash
ls -lh backups/ | grep "backup-"
```

## ⚙️ Configuração

### Alterar Horário de Backup Automático

Edite `scripts/backup-scheduler.mjs` e altere esta linha:
```typescript
next.setUTCHours(2, 0, 0, 0); // 02:00 AM UTC
```

Exemplos:
- `setUTCHours(2, 0, 0, 0)` → 02:00 AM UTC
- `setUTCHours(14, 30, 0, 0)` → 14:30 (2:30 PM) UTC

### Alterar Número de Backups Retidos

Edite `scripts/backup-db.mjs` e altere esta linha:
```typescript
if (backupFiles.length > 30) {
```

Mude `30` para o número desejado.

## 🔍 Testes

Para validar se o sistema de backup está funcionando corretamente:

```bash
node scripts/test-backup.mjs
```

Isso verifica:
- ✓ Estrutura de diretórios
- ✓ Diretório de backups
- ✓ Backups existentes
- ✓ Permissões de escrita
- ✓ Integridade dos scripts
- ✓ Router de backup

## 🐛 Troubleshooting

### Erro: "DATABASE_URL não encontrado"

**Causa:** O arquivo `.env.local` não existe ou não contém `DATABASE_URL`.

**Solução:** Certifique-se de que o arquivo `.env.local` existe no diretório raiz do projeto e contém a variável `DATABASE_URL`.

### Erro: "Conectado ao banco de dados" mas falha ao exportar tabelas

**Causa:** Permissões insuficientes no banco de dados.

**Solução:** Verifique se o usuário do banco tem permissão SELECT em todas as tabelas.

### Backup muito grande

**Causa:** Muitos dados acumulados.

**Solução:** 
- Aumentar a frequência de backups (diariamente em vez de semanalmente)
- Arquivar backups antigos em outro local
- Limpar dados antigos do banco (com cuidado!)

### Restauração lenta

**Causa:** Muitos dados para restaurar.

**Solução:**
- Isso é normal. Backups grandes podem levar alguns minutos para restaurar
- Não interrompa o processo
- Considere fazer backups mais frequentes com menos dados

## 📈 Monitoramento

### Verificar Último Backup

```bash
ls -lt backups/ | head -2
```

### Verificar Tamanho Total de Backups

```bash
du -sh backups/
```

### Verificar Integridade de um Backup

```bash
gunzip -t backups/backup-XXXX.json.gz
```

Se não houver erro, o arquivo está íntegro.

## 🔐 Segurança

- ✅ Backups são armazenados localmente no servidor
- ✅ Apenas admins podem acessar a API de backup
- ✅ Nomes de arquivo são validados contra path traversal
- ✅ Confirmação obrigatória antes de restaurar

**Recomendações:**
- Faça backup dos backups em outro local (externa, nuvem, etc)
- Teste restaurações periodicamente
- Mantenha backups por pelo menos 30 dias
- Considere criptografia para backups sensíveis

## 📚 Referências

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Node.js fs module](https://nodejs.org/api/fs.html)
- [Zlib compression](https://nodejs.org/api/zlib.html)

## 🤝 Suporte

Para problemas ou dúvidas sobre o sistema de backup, verifique:
1. Este documento (BACKUP_SYSTEM.md)
2. Logs do script (`node scripts/backup-db.mjs 2>&1 | tee backup.log`)
3. Status do banco de dados
4. Espaço em disco disponível

---

**Última atualização:** 16 de novembro de 2024
**Versão:** 1.0.0
