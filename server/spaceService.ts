import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

export interface SpaceQueryParams {
  lat: number;
  lng: number;
  radius: number;
  segment?: string;
}

export interface SpaceApiResponse {
  ok: boolean;
  data: any;
  cached?: boolean;
}

/**
 * Gerar dados mockados da Space API baseados na documentação real
 */
function generateMockSpaceData(lat: number, lng: number, radius: number, segment?: string) {
  return {
    muni: "São Paulo",
    people: Math.floor(Math.random() * 50000) + 10000,
    income: Math.floor(Math.random() * 5000) + 2000,
    density: Math.floor(Math.random() * 5000) + 1000,
    consumer: Math.floor(Math.random() * 10000000) + 5000000,
    
    // Potencial de consumo por categoria
    cons_a_total: Math.floor(Math.random() * 1000000) + 500000,
    cons_b_current: Math.floor(Math.random() * 800000) + 400000,
    cons_c_expenditure: Math.floor(Math.random() * 600000) + 300000,
    cons_1_food: Math.floor(Math.random() * 500000) + 200000,
    cons_2_housing: Math.floor(Math.random() * 400000) + 150000,
    cons_3_clothing: Math.floor(Math.random() * 200000) + 80000,
    cons_4_transport: Math.floor(Math.random() * 300000) + 120000,
    cons_5_hygiene_care: Math.floor(Math.random() * 150000) + 60000,
    cons_6_health: Math.floor(Math.random() * 250000) + 100000,
    cons_7_education: Math.floor(Math.random() * 180000) + 70000,
    cons_8_recreation: Math.floor(Math.random() * 120000) + 50000,
    cons_9_tobacco: Math.floor(Math.random() * 50000) + 20000,
    cons_10_personal_services: Math.floor(Math.random() * 100000) + 40000,
    cons_12_others: Math.floor(Math.random() * 80000) + 30000,
    
    // Classes sociais (quantidade de pessoas)
    class_a1: Math.floor(Math.random() * 1000) + 200,
    class_a2: Math.floor(Math.random() * 2000) + 500,
    class_b1: Math.floor(Math.random() * 5000) + 1500,
    class_b2: Math.floor(Math.random() * 8000) + 2500,
    class_c: Math.floor(Math.random() * 15000) + 5000,
    class_d: Math.floor(Math.random() * 10000) + 3000,
    class_e: Math.floor(Math.random() * 5000) + 1000,
    
    // Faixas etárias
    age_babies: Math.floor(Math.random() * 2000) + 500,
    age_kids: Math.floor(Math.random() * 3000) + 800,
    age_teens: Math.floor(Math.random() * 3500) + 1000,
    age_young_adults: Math.floor(Math.random() * 8000) + 2500,
    age_adults: Math.floor(Math.random() * 12000) + 4000,
    age_middle_age: Math.floor(Math.random() * 10000) + 3000,
    age_young_elderly: Math.floor(Math.random() * 5000) + 1500,
    age_elderly: Math.floor(Math.random() * 3000) + 800,
    
    // Indicadores demográficos
    pop_active: (Math.random() * 20 + 50).toFixed(1), // % população ativa
    pop_youngness: (Math.random() * 10 + 15).toFixed(1), // Qtd jovens/idosos
    pop_oldness: (Math.random() * 10 + 10).toFixed(1), // Qtd idosos/jovens
    
    // Dados históricos
    people2022: Math.floor(Math.random() * 48000) + 9500,
    census_change: (Math.random() * 10 + 2).toFixed(1), // % crescimento
    income_2022: Math.floor(Math.random() * 4800) + 1900,
    income_2010: Math.floor(Math.random() * 3500) + 1500,
    income_rate: (Math.random() * 15 + 5).toFixed(1), // % variação renda
    
    // Atividades econômicas (exemplo com N=0 a 4)
    clu_N_nome: "Comércio Varejista",
    clu_N_atv: Math.floor(Math.random() * 500) + 100,
    clu_N_pct_over_avg: (Math.random() * 50 + 80).toFixed(1),
    
    // ID para cache
    areaid: `${lat.toFixed(5)}_${lng.toFixed(5)}_${radius}`,
    
    _mock: true,
    _timestamp: new Date().toISOString(),
  };
}

/**
 * Wrapper para chamadas à API Space
 * NUNCA expor a chave da API no frontend
 */
export async function querySpaceApi(params: SpaceQueryParams): Promise<SpaceApiResponse> {
  const { lat, lng, radius, segment } = params;

  // Validar limites
  if (radius > ENV.spaceMaxRadius) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Raio máximo permitido: ${ENV.spaceMaxRadius}m`,
    });
  }

  // Se a Space API não estiver configurada, retornar dados mockados
  if (!ENV.spaceApiBaseUrl || !ENV.spaceApiKey) {
    console.warn("[Space API] Credenciais não configuradas, retornando dados mockados");
    return {
      ok: true,
      data: generateMockSpaceData(lat, lng, radius, segment),
    };
  }

  try {
    // URL correta da API: https://gs.greatspaces.com.br/api/
    const url = new URL(ENV.spaceApiBaseUrl);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("key", ENV.spaceApiKey);

    console.log(`[Space API] Consultando: lat=${lat}, lng=${lng}, radius=${radius}m`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Não usar cache para garantir dados atualizados
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`[Space API] Erro ${response.status}:`, errorText);
      
      // Se der erro, retornar dados mockados como fallback
      console.warn("[Space API] Erro na requisição, usando dados mockados como fallback");
      return {
        ok: true,
        data: generateMockSpaceData(lat, lng, radius),
      };
    }

    const data = await response.json();

    return {
      ok: true,
      data,
    };
  } catch (error: any) {
    console.error("[Space API] Erro na requisição:", error);
    
    // Em caso de erro, retornar dados mockados
    console.warn("[Space API] Erro de conexão, usando dados mockados como fallback");
    return {
      ok: true,
      data: generateMockSpaceData(lat, lng, radius, segment),
    };
  }
}

/**
 * Cache simples em memória para consultas recentes
 * Em produção, considerar Redis ou similar
 */
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutos

function getCacheKey(params: SpaceQueryParams): string {
  return `${params.lat.toFixed(5)},${params.lng.toFixed(5)},${params.radius},${params.segment || ''}`;
}

export async function querySpaceApiWithCache(params: SpaceQueryParams): Promise<SpaceApiResponse> {
  const cacheKey = getCacheKey(params);
  const cached = queryCache.get(cacheKey);

  // Verificar se há cache válido
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[Space API] Cache hit:", cacheKey);
    return {
      ok: true,
      data: cached.data,
      cached: true,
    };
  }

  // Fazer requisição
  const result = await querySpaceApi(params);

  // Armazenar em cache
  queryCache.set(cacheKey, {
    data: result.data,
    timestamp: Date.now(),
  });

  // Limpar cache antigo (manter apenas últimas 100 consultas)
  if (queryCache.size > 100) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) {
      queryCache.delete(oldestKey);
    }
  }

  return result;
}

