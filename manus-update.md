# Atualização Busca Ponto SaaS

## Visão Geral
- Integração do Google Places Autocomplete no campo "Buscar Localização" com restrição ao Brasil e recentralização automática do mapa.
- Geocodificação de texto livre (Enter) e place_id com debounce para evitar requisições duplicadas.
- Painel de concorrentes baseado em Google Places Nearby mostrando lista ordenável e exportável, sem marcadores adicionais no mapa.
- Ajustes no painel de análise para normalizar métricas e exibir endereço resolvido.
- Novo tema SpaceData aplicado ao mapa com personalização de cores, luz e efeitos.

## Testes
- `pnpm run check`

## Observações
- Utiliza a chave `GOOGLE_PLACES_API_KEY` já configurada para Autocomplete, Geocoding e Places Nearby.
- Competidores são filtrados pelos tipos do segmento selecionado e suportam paginação quando disponível.
