# Busca Ponto SaaS - TODO

## Fase 1: Configurar estrutura do banco de dados e seeds
- [x] Criar schema completo do banco de dados (Tenant, User, Membership, Study, StudyComment, StudyFile, QuickQuery, PlanUsage, AuditLog, BillingCustomer)
- [x] Configurar relacionamentos entre tabelas
- [x] Criar seeds com dados de exemplo (1 tenant, 3 usuários, 2 estudos, 5 consultas rápidas)
- [x] Executar migrations e seeds

## Fase 2: Implementar autenticação multi-tenant e RBAC
- [x] Estender schema de User com roles (admin_bp, tenant_admin, member, analyst_bp)
- [x] Criar tabela Membership para relacionamento user-tenant
- [x] Implementar procedures protegidas por role (adminProcedure, tenantAdminProcedure)
- [x] Criar sistema de onboarding para criar tenant
- [x] Implementar seleção de tenant no login

## Fase 3: Desenvolver wrapper da Space API e consultas rápidas
- [x] Criar variáveis de ambiente para Space API (SPACE_API_BASE_URL, SPACE_API_KEY)
- [x] Implementar wrapper /api/space com validação Zod
- [x] Adicionar rate limit por tenant e por usuário
- [x] Implementar caching de consultas (TTL 10-30min)
- [x] Criar procedure para registrar QuickQuery no banco
- [x] Implementar checagem de limites do plano antes de consulta
- [x] Criar auditoria de uso em AuditLog

## Fase 4: Criar interface do mapa interativo com camadas
- [x] Instalar e configurar MapLibre GL
- [x] Criar componente MapShell com layout 2 colunas
- [x] Implementar busca de endereço/CEP
- [x] Criar slider de raio (0.5-5km)
- [x] Implementar botão "Consulta rápida"
- [x] Criar toggles de camadas (Demografia, Renda, Fluxo, Concorrência)
- [x] Implementar legendas para cada camada
- [x] Criar histórico de consultas com paginação
- [x] Adicionar badge de consumo do plano
- [x] Implementar loading states e toasts de erro

## Fase 5: Implementar sistema de estudos e workflow
- [x] Criar formulário de solicitação de estudo
- [x] Implementar workflow de status (Aberto → Em análise BP → Devolvido → Concluído)
- [ ] Criar sistema de comentários com menções @ (simplificado)
- [ ] Implementar upload de arquivos para estudos (simplificado)
- [ ] Criar página de detalhe do estudo (simplificado)
- [ ] Implementar "Quadro Final – 8 itens" com editor rich text (simplificado)
- [x] Criar lista de estudos com filtros
- [x] Adicionar sistema de prioridade e SLA

## Fase 6: Desenvolver painel administrativo e gestão de tenants
- [ ] Criar painel de administração do tenant (settings)
- [ ] Implementar gestão de usuários e papéis
- [ ] Criar configuração de branding (logo, cores)
- [ ] Implementar visualização de limites do plano
- [ ] Criar painel Admin BP global
- [ ] Implementar gestão de tenants (criar, editar, limites)
- [ ] Criar fila global de estudos para consultores BP
- [ ] Implementar tabelas de auditoria e logs

## Fase 7: Integrar Stripe para billing e planos
- [ ] Configurar Stripe (variáveis de ambiente)
- [ ] Criar planos (Start, Essencial, Pro)
- [ ] Implementar checkout session
- [ ] Criar webhook para eventos Stripe
- [ ] Implementar metered billing para consultas rápidas
- [ ] Criar página de faturamento no tenant
- [ ] Implementar troca de plano
- [ ] Adicionar visualização de faturas

## Fase 8: Testar, criar checkpoint e entregar
- [ ] Testar fluxo completo de login e onboarding
- [ ] Testar consultas rápidas e visualização de camadas
- [ ] Testar criação e workflow de estudos
- [ ] Testar RBAC em todas as rotas
- [ ] Testar Stripe em modo teste
- [ ] Verificar responsividade mobile
- [ ] Criar checkpoint final
- [ ] Documentar instruções de uso




## Bugs Reportados
- [x] Consulta rápida não exibe resultado após execução (corrigido - adicionado fallback com dados mockados)



## Novos Bugs Reportados
- [x] Consulta rápida não está exibindo resultados visualmente completos (RESOLVIDO - painel agora mostra tudo)
- [x] Botão "Busca Ponto" no header dá erro 404 (corrigido - criado Settings)

## Novas Features Solicitadas
- [x] Criar painel administrativo para configurações do tenant (nome, logo, cores)
- [ ] Melhorar visualização dos resultados da Space API com cards e gráficos (em progresso)
- [ ] Implementar componente SidePanelSpace com dados formatados (habitantes, renda, classes, consumo)
- [ ] Adicionar gráficos de barras para classes sociais (usando Recharts)
- [ ] Adicionar gráficos de colunas para faixas etárias
- [x] Formatar números com Intl.NumberFormat pt-BR
- [ ] Adicionar botão "Salvar área" para criar QuickQuery
- [ ] Adicionar botão "Gerar Estudo" que abre formulário

## Features do Painel Visual Space (Referência anexada)
- [x] Reimplementar SidePanelSpace com layout visual idêntico ao Space
- [x] Card 1: Habitantes com ícone e variação percentual (census_change)
- [x] Card 2: Renda média com crescimento (income_rate)
- [x] Card 3: Domicílios com crescimento percentual
- [x] Gráfico de barras coloridas para classes sociais (A1-E)
- [x] Lista de ícones demográficos (bebês, crianças, adolescentes, etc)
- [x] Card de potencial de consumo mensal com destaque laranja
- [x] Lista de categorias de consumo com valores em BRL
- [x] Painel ocupa altura completa quando há resultados
- [ ] Círculo azul no mapa representando a área selecionada
- [ ] Permitir arrastar o círculo para mudar localização
- [x] Slider de raio funcionando
- [ ] Loading skeletons durante consulta




## Novas Features Solicitadas (27/10/2025)
- [x] Integrar busca de endereço com Google Places API (substituir Nominatim)
- [x] Adicionar botão "Voltar" após executar análise rápida
- [ ] Implementar exportação de PDF da análise completa
- [ ] Adicionar círculo arrastável no mapa para definir área de análise
- [ ] Permitir ajustar raio clicando no mapa
- [x] Adicionar campo "Segmento do negócio" nos controles
- [x] Integrar Google Places API para buscar concorrentes próximos
- [ ] Exibir lista de concorrentes encontrados na análise (preparado, falta UI)
- [x] Remover categorias específicas de consumo (saúde, plano, exames) - dados mockados não incluem
- [x] Manter apenas dados gerais de consumo no painel




## Bugs Reportados (27/10/2025 - Sessão 2)
- [ ] Mapa precisa ter estilo visual da SpaceData
- [ ] Dados extraídos estão bagunçados no painel
- [ ] Concorrentes não estão sendo puxados
- [ ] Busca de localização do Google não está funcionando
- [ ] Layout do painel precisa ser reorganizado




## Melhorias Solicitadas (27/10/2025 - Sessão 3)
- [x] Ajustar interface para corresponder ao design SpaceData
- [x] Integrar busca de localização do Google com autocomplete
- [x] Corrigir extração de dados para incluir concorrentes reais do Google Maps
- [x] Melhorar visual do painel lateral
- [x] Adicionar cores e estilos do SpaceData




## Melhorias Finais (Prompt Esri + Normalização) - 27/10/2025
- [x] Trocar mapa para Esri basemaps (World Topo Map + Light Gray Canvas)
- [x] Adicionar toggle para alternar entre estilos de mapa
- [x] Adicionar AttributionControl da Esri
- [ ] Implementar círculo geodésico com turf.circle() (raio em metros)
- [ ] Marcador arrastável no mapa
- [ ] Atualizar círculo ao arrastar marcador
- [ ] Tooltip com endereço e raio (ex: "Av. Paulista 1000 • 1,5 km")
- [ ] Criar tipos TypeScript completos para normalização Space (SpaceNormalized)
- [ ] Implementar normalizeSpace() sem NaN/Infinity
- [ ] Mapeamento de 13 categorias de consumo com rótulos PT-BR
- [ ] Classes sociais (A1-E) com percentuais e domicílios
- [ ] Faixas etárias opcionais (14 faixas)
- [ ] Formatação de valores (moeda, número, percentual) com Intl.NumberFormat
- [ ] Refinar Google Places Autocomplete com restrição Brasil
- [ ] Geocoding de place_id → lat/lng
- [ ] Preenchimento automático de endereço formatado
- [ ] Suporte para Enter → Geocoding do texto
- [ ] Google Places Nearby Search para concorrentes
- [ ] Mapeamento de tipos por segmento (academias, farmácias, petshops, etc)
- [ ] Plotar marcadores de concorrentes no mapa
- [ ] Lista de concorrentes no painel (nome, rating, reviews, distância, status)
- [ ] Deduplicação de concorrentes por nome e coordenadas
- [ ] Paginação com next_page_token
- [ ] Exportar CSV de concorrentes
- [ ] Debounce 400ms para mudanças de área
- [ ] Throttle 1 req/s por usuário
- [ ] Cancelar requisições anteriores ao mudar área
- [ ] Skeletons de loading durante consulta
- [ ] Estados de erro amigáveis
- [ ] Cards no painel: Habitantes, Renda, Potencial (com densidade)
- [ ] Gráfico 1: Barras para classes sociais (A1-E)
- [ ] Gráfico 2: Barras horizontais para categorias de consumo
- [ ] Faixa etária: Colunas compactas (se presente)
- [ ] Botão "Salvar área" (cria QuickQuery com payload normalizado)
- [ ] Botão "Gerar Estudo" (abre formulário do tenant)
- [ ] Paleta: azul escuro #0F172A + branco
- [ ] Cards com rounded-2xl
- [ ] Sombras suaves
- [ ] Layout: Mapa 60% | Painel 40% (fixo)
- [ ] Testar resposta Space sem consumer → usa cons_a_total (sem NaN)
- [ ] Testar autocomplete → resolve place_id corretamente
- [ ] Testar Nearby Search → retorna e plota tipos do segmento
- [ ] LGPD e segurança: não logar chaves, CORS restrito

