# Sistema de Rastreamento de Método de Registro

## Visão Geral

Este documento descreve como o sistema rastreia e diferencia usuários que se registram através de dois canais diferentes:

1. **Via Formulário** (`/cadastro`) - Usuários que preenchem o formulário de cadastro antes de fazer login
2. **Via OAuth Direto** - Usuários que vão direto para login sem preencher o formulário

## Arquitetura

### 1. Banco de Dados

**Coluna adicionada na tabela `users`:**
```sql
registrationMethod ENUM('form', 'oauth', 'admin') NOT NULL DEFAULT 'oauth'
```

- `form`: Usuário registrou via formulário de cadastro
- `oauth`: Usuário fez login direto via OAuth
- `admin`: Usuário criado por admin

### 2. Fluxo de Rastreamento

#### Cenário A: Usuário via Formulário
```
1. Usuário acessa /cadastro
2. Preenche formulário e clica em "Cadastrar"
3. Dados salvos em localStorage:
   - cadastroEmail (email do cadastro)
   - registrationMethod = "form"
4. Redireciona para /cadastro-confirmacao
5. Clica em "Fazer Login Agora"
6. localStorage["registrationMethod"] transferido para cookie
7. Redireciona para OAuth
8. Callback OAuth lê cookie e salva registrationMethod = "form"
```

#### Cenário B: Usuário via OAuth Direto
```
1. Usuário acessa Home e clica em "Entrar"
2. Vai direto para OAuth (sem preencher formulário)
3. Callback OAuth não encontra cookie
4. Salva registrationMethod = "oauth" (padrão)
```

### 3. Implementação Técnica

#### Cliente (`client/src/pages/`)

**Cadastro.tsx:**
```typescript
// Ao submeter formulário
localStorage.setItem("registrationMethod", "form");
```

**CadastroConfirmacao.tsx:**
```typescript
// Ao clicar em "Fazer Login Agora"
const registrationMethod = localStorage.getItem('registrationMethod');
if (registrationMethod) {
  document.cookie = `registrationMethod=${registrationMethod}; path=/; max-age=3600`;
}
```

#### Servidor (`server/`)

**oauth.ts:**
```typescript
// No callback OAuth
const registrationMethod = req.cookies?.registrationMethod || 'oauth';
await db.upsertUser({
  // ... outros dados
  registrationMethod: registrationMethod as 'form' | 'oauth' | 'admin',
});
res.clearCookie('registrationMethod');
```

**db.ts:**
```typescript
// Na função upsertUser
if (user.registrationMethod !== undefined) {
  updateSet.registrationMethod = user.registrationMethod;
}
```

**routes/registrationAnalytics.ts:**
```typescript
// Três endpoints para análise:
- getStats(): Estatísticas gerais por método
- getUsersList(): Lista de usuários com filtro por método
- getConversionTrend(): Tendência de registros por período
```

#### Frontend (`client/src/pages/RegistrationAnalytics.tsx`)

Página de análise com:
- **Cards de estatísticas**: Total de usuários e contagem por método
- **Gráfico de pizza**: Distribuição de registros
- **Gráfico de barras**: Tendência de registros (últimos 7, 30 ou 90 dias)
- **Tabela**: Lista de usuários recentes com método de registro

## Como Usar

### Para Admins

1. Acesse `/admin-bp/analise-registros`
2. Visualize as estatísticas de registro em tempo real
3. Analise tendências de conversão
4. Veja lista de usuários e como cada um se registrou

### Dados Disponíveis

**Estatísticas Gerais:**
- Total de usuários
- Contagem por método (form, oauth, admin)
- Percentual de cada método

**Análise de Tendência:**
- Registros por dia (últimos 7, 30 ou 90 dias)
- Comparação entre métodos
- Visualização em gráfico de barras

**Lista de Usuários:**
- Nome, email, método de registro
- Data de criação
- Último login

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    USUÁRIO                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   ┌─────────────┐            ┌──────────────┐
   │  /cadastro  │            │  Home/Login  │
   │ (Formulário)│            │  (OAuth Dir) │
   └──────┬──────┘            └──────┬───────┘
          │                          │
          ▼                          ▼
   localStorage.set            Vai direto para
   registrationMethod           OAuth callback
          │                          │
          ▼                          ▼
   /cadastro-confirmacao    ┌─────────────────┐
          │                 │ OAuth Callback  │
          ▼                 │ (oauth.ts)      │
   Transferir para cookie   └────────┬────────┘
          │                          │
          └──────────────┬───────────┘
                         ▼
                  ┌─────────────────┐
                  │  upsertUser()   │
                  │  Salva no DB    │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │ registrationMethod
                  │ (form/oauth/admin)
                  └─────────────────┘
```

## Segurança

- **localStorage** é usado apenas temporariamente (durante o fluxo de cadastro)
- **Cookie** tem expiração de 1 hora (max-age=3600)
- Cookie é limpo imediatamente após uso no callback OAuth
- Apenas admins podem acessar a página de análise

## Limitações Atuais

1. Se o usuário limpar cookies entre o cadastro e o login, será registrado como "oauth"
2. Usuários que fizeram cadastro antes desta implementação terão `registrationMethod = 'oauth'`
3. A análise mostra apenas usuários criados após a implementação desta feature

## Próximos Passos (Opcional)

- [ ] Adicionar filtro por data na página de análise
- [ ] Exportar relatório em CSV/PDF
- [ ] Webhook para notificar quando atinge X% de registros via formulário
- [ ] A/B testing automático entre os dois métodos
- [ ] Integração com email marketing para usuários "form"

## Troubleshooting

**P: Usuários aparecem como "oauth" mesmo tendo preenchido o formulário?**
R: Verifique se o cookie está sendo enviado corretamente. O navegador pode estar bloqueando cookies de terceiros.

**P: Página de análise mostra erro de permissão?**
R: Certifique-se de que o usuário tem role `admin_bp` no banco de dados.

**P: Dados históricos não aparecem?**
R: Usuários registrados antes desta implementação terão `registrationMethod = 'oauth'` por padrão.
