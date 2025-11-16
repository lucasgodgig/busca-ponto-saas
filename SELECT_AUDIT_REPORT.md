# Auditoria de Componentes Select - Busca Ponto SaaS

## Resumo Executivo

Foram encontrados **5 arquivos** utilizando componentes `Select` com **95 ocorrências totais**. A auditoria identificou **3 categorias de problemas** e fornece recomendações de correção.

---

## 1. Arquivos Auditados

### 1.1 AdminCommercialPoints.tsx ✅ CORRIGIDO
- **Status**: Implementado com validação completa
- **Filtros**: Status, Cidade, Segmento, Data, Busca
- **Validação**: Integrada com `filterValidation.ts`
- **Melhorias**: Carregamento e salvamento seguro do localStorage

### 1.2 AdminPanel.tsx ⚠️ REQUER ATENÇÃO
- **Localização**: `/client/src/pages/AdminPanel.tsx`
- **Filtros Identificados**:
  - Role Filter (lines 233-244)
  - Status Filter (lines 246-255)
  - Role Selection em modal (lines 378-386, 454-462)
- **Problemas Encontrados**:
  - ❌ Sem validação de entrada
  - ❌ Sem sanitização de valores
  - ❌ Sem tratamento de valores inválidos
  - ⚠️ Valores hardcoded sem lista de referência
- **Recomendação**: Criar módulo de validação específico para roles

### 1.3 AdminStudyRequests.tsx ⚠️ REQUER ATENÇÃO
- **Localização**: `/client/src/pages/AdminStudyRequests.tsx`
- **Filtros Identificados**:
  - Status Filter (lines 207-216)
  - Status Update em tabela (lines 276-287)
  - Priority Update em tabela (lines 295-302)
- **Problemas Encontrados**:
  - ❌ Sem validação de entrada
  - ❌ Sem sanitização de valores
  - ⚠️ Valores hardcoded sem validação
  - ❌ Sem tratamento de erros ao atualizar status
- **Recomendação**: Implementar validação de status e prioridade

### 1.4 GenerateStudyPage.tsx ⚠️ REQUER ATENÇÃO
- **Localização**: `/client/src/pages/GenerateStudyPage.tsx`
- **Filtros Identificados**:
  - Segment Selection (lines 100-109)
- **Problemas Encontrados**:
  - ❌ Sem validação de entrada
  - ⚠️ Valores vêm de API mas sem sanitização
  - ❌ Sem tratamento de valores inválidos
- **Recomendação**: Validar segmentos contra lista de referência

### 1.5 Studies.tsx ⚠️ REQUER ATENÇÃO
- **Localização**: `/client/src/pages/Studies.tsx`
- **Filtros Identificados**:
  - Status Filter (lines 158-167)
  - Segment Filter (lines 172-182)
- **Problemas Encontrados**:
  - ❌ Sem validação de entrada
  - ❌ Sem sanitização de valores
  - ⚠️ Valores hardcoded sem referência
- **Recomendação**: Implementar validação de status e segmentos

---

## 2. Categorias de Problemas Identificados

### Categoria 1: Falta de Validação de Entrada
**Severidade**: 🔴 Alta

**Descrição**: Valores de Select não são validados antes de serem usados em queries ou mutações.

**Risco**: 
- Valores inválidos podem ser enviados ao servidor
- Erros em runtime se valores inválidos forem processados
- Possível injeção de valores maliciosos

**Arquivos Afetados**:
- AdminPanel.tsx
- AdminStudyRequests.tsx
- GenerateStudyPage.tsx
- Studies.tsx

**Solução Recomendada**:
```typescript
// Criar módulos de validação específicos para cada tipo de filtro
export const VALID_ROLES = ["admin_bp", "tenant_admin", "analyst_bp", "member"];
export const VALID_STUDY_STATUS = ["pendente", "em_analise", "concluido", "cancelado"];
export const VALID_PRIORITIES = ["baixa", "media", "alta"];

function validateRole(value: string): boolean {
  return VALID_ROLES.includes(value) || value === "all";
}
```

### Categoria 2: Sanitização de Valores
**Severidade**: 🟡 Média

**Descrição**: Valores de Select não são sanitizados, especialmente quando vêm de dados dinâmicos.

**Risco**:
- XSS se valores forem renderizados sem escape
- Injeção de caracteres especiais em queries

**Arquivos Afetados**:
- GenerateStudyPage.tsx (segmentos dinâmicos)
- AdminCommercialPoints.tsx (cidades e segmentos dinâmicos) ✅ CORRIGIDO

**Solução Recomendada**:
```typescript
// Sanitizar valores antes de renderizar
const sanitizedSegment = sanitizeFilterString(segment);
```

### Categoria 3: Falta de Tratamento de Erros
**Severidade**: 🟡 Média

**Descrição**: Mutações de Select não tratam erros adequadamente.

**Risco**:
- Usuário não recebe feedback de falha
- Estado inconsistente entre UI e servidor
- Sem retry ou fallback

**Arquivos Afetados**:
- AdminStudyRequests.tsx (status/priority updates)
- AdminPanel.tsx (role updates)

**Solução Recomendada**:
```typescript
const mutation = trpc.updateStatus.useMutation({
  onError: (error) => {
    toast.error(`Erro ao atualizar: ${error.message}`);
    // Rollback otimista
  },
  onSuccess: () => {
    toast.success("Status atualizado com sucesso");
  },
});
```

---

## 3. Recomendações de Correção

### Prioridade 1: Implementar Validação em AdminPanel.tsx
**Esforço**: 🟢 Baixo (2-3 horas)

**Passos**:
1. Criar `lib/roleValidation.ts` com validação de roles
2. Criar `lib/statusValidation.ts` para status de usuário
3. Integrar em AdminPanel.tsx
4. Adicionar testes unitários

**Benefício**: Previne valores inválidos de roles sendo salvos

### Prioridade 2: Implementar Validação em AdminStudyRequests.tsx
**Esforço**: 🟢 Baixo (2-3 horas)

**Passos**:
1. Criar `lib/studyValidation.ts` com validação de status e prioridade
2. Integrar em AdminStudyRequests.tsx
3. Adicionar tratamento de erros em mutações
4. Adicionar testes unitários

**Benefício**: Garante integridade de dados de estudos

### Prioridade 3: Implementar Validação em Studies.tsx
**Esforço**: 🟢 Baixo (2-3 horas)

**Passos**:
1. Reutilizar validação de status e segmentos
2. Integrar em Studies.tsx
3. Adicionar testes unitários

**Benefício**: Consistência com AdminCommercialPoints.tsx

### Prioridade 4: Melhorar GenerateStudyPage.tsx
**Esforço**: 🟡 Médio (3-4 horas)

**Passos**:
1. Adicionar sanitização de segmentos dinâmicos
2. Validar contra lista de segmentos conhecidos
3. Adicionar tratamento de erros
4. Adicionar testes

**Benefício**: Segurança ao lidar com dados dinâmicos

---

## 4. Checklist de Correção

- [x] AdminCommercialPoints.tsx - Validação implementada
- [ ] AdminPanel.tsx - Validação de roles
- [ ] AdminStudyRequests.tsx - Validação de status/prioridade
- [ ] Studies.tsx - Validação de filtros
- [ ] GenerateStudyPage.tsx - Sanitização de segmentos

---

## 5. Padrão Recomendado para Novos Selects

Ao adicionar novos componentes Select, seguir este padrão:

```typescript
// 1. Definir valores válidos
const VALID_VALUES = ["option1", "option2", "all"];

// 2. Criar função de validação
function validateValue(value: string): boolean {
  return VALID_VALUES.includes(value);
}

// 3. Usar no componente
const [filter, setFilter] = useState("all");

const handleChange = (value: string) => {
  if (validateValue(value)) {
    setFilter(value);
  } else {
    console.warn(`Valor inválido: ${value}`);
  }
};

// 4. Renderizar com validação
<Select value={filter} onValueChange={handleChange}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione" />
  </SelectTrigger>
  <SelectContent>
    {VALID_VALUES.map(val => (
      <SelectItem key={val} value={val}>
        {getLabel(val)}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## 6. Conclusão

A auditoria identificou que **AdminCommercialPoints.tsx** já possui validação robusta. Os outros 4 arquivos requerem implementação de validação seguindo o mesmo padrão.

**Próximos Passos**:
1. Implementar validação em AdminPanel.tsx (Prioridade 1)
2. Implementar validação em AdminStudyRequests.tsx (Prioridade 2)
3. Implementar validação em Studies.tsx (Prioridade 3)
4. Melhorar GenerateStudyPage.tsx (Prioridade 4)
5. Criar testes para todos os módulos de validação

**Benefício Total**: Redução de bugs, melhor segurança e experiência do usuário mais robusta.
