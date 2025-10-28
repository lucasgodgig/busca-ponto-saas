import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";
import axios from "axios";

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
 * Normalizar resposta da Space API que vem com valores como strings
 */
function normalizeSpaceApiResponse(data: any) {
  console.log("[normalizeSpaceApiResponse] Iniciando normalizacao...");
  
  const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      let cleaned = val.trim();
      const isMillion = cleaned.includes('MI');
      cleaned = cleaned.replace(' MI', '').trim();
      cleaned = cleaned.replace(/\./g, '');
      cleaned = cleaned.replace(',', '.');
      const num = parseFloat(cleaned);
      // Não multiplicar por 1 milhão - o valor já vem em milhões
      // Ex: "259.9 MI" = 259.9 (já é o valor em milhões)
      if (isMillion) return num;
      return isFinite(num) ? num : 0;
    }
    return 0;
  };

  const normalized = {
    ...data,
    people: parseNumber(data.people),
    income: parseNumber(data.income),
    // Potencial de consumo em milhões (dividir por 1000 para ter em milhares)
    consumer: parseNumber(data.consumer) / 1000,
    cons_a_total: parseNumber(data.cons_a_total),
    cons_b_current: parseNumber(data.cons_b_current),
    cons_c_expenditure: parseNumber(data.cons_c_expenditure),
    cons_1_food: parseNumber(data.cons_1_food),
    cons_2_housing: parseNumber(data.cons_2_housing),
    cons_3_clothing: parseNumber(data.cons_3_clothing),
    cons_4_transport: parseNumber(data.cons_4_transport),
    cons_5_hygiene_care: parseNumber(data.cons_5_hygiene_care),
    cons_6_health: parseNumber(data.cons_6_health),
    cons_7_education: parseNumber(data.cons_7_education),
    cons_8_recreation: parseNumber(data.cons_8_recreation),
    cons_9_tobacco: parseNumber(data.cons_9_tobacco),
    cons_10_personal_services: parseNumber(data.cons_10_personal_services),
    cons_12_others: parseNumber(data.cons_12_others),
    cons_13_asset_increase: parseNumber(data.cons_13_asset_increase),
    cons_14_liability_reduction: parseNumber(data.cons_14_liability_reduction),
    density: parseNumber(data.density),
    people2022: parseNumber(data.people2022),
    income_2022: parseNumber(data.income_2022),
    income_2010: parseNumber(data.income_2010),
    census_change: parseNumber(data.census_change),
    income_rate: parseNumber(data.income_rate),
  };

  console.log("[normalizeSpaceApiResponse] Normalizacao concluida:", {
    people: normalized.people,
    income: normalized.income,
    consumer: normalized.consumer,
  });

  return normalized;
}

/**
 * Gerar dados mockados da Space API baseados na documentacao real
 */
function generateMockSpaceData(lat: number, lng: number, radius: number, segment?: string) {
  console.log("[generateMockSpaceData] Gerando dados mockados...");
  
  // Calcular area em hectares (raio em metros)
  const radiusKm = radius / 1000;
  const areaHectares = Math.PI * radiusKm * radiusKm * 100;
  
  // Densidade media para SP: ~7500 hab/hectare
  const densityPerHectare = 7500;
  const people = Math.floor(areaHectares * densityPerHectare);
  
  // Renda media em SP: ~R$ 3000-4000
  const income = Math.floor(Math.random() * 1500) + 3000;
  
  // Potencial de consumo: renda * 0.7 (70% disponivel para consumo)
  const consumer = Math.floor(income * 0.7);
  
  console.log('[generateMockSpaceData] Dados gerados:', { people, income, consumer, radiusKm, areaHectares });
  
  return {
    muni: "Localizacao Analisada",
    people,
    income,
    density: densityPerHectare,
    consumer,
    
    // Potencial de consumo por categoria (distribuicao realista por pessoa)
    cons_a_total: Math.floor(consumer * people * 0.25),
    cons_b_current: Math.floor(consumer * people * 0.35),
    cons_c_expenditure: Math.floor(consumer * people * 0.40),
    cons_1_food: Math.floor(consumer * people * 0.25),
    cons_2_housing: Math.floor(consumer * people * 0.20),
    cons_3_clothing: Math.floor(consumer * people * 0.08),
    cons_4_transport: Math.floor(consumer * people * 0.12),
    cons_5_hygiene_care: Math.floor(consumer * people * 0.06),
    cons_6_health: Math.floor(consumer * people * 0.10),
    cons_7_education: Math.floor(consumer * people * 0.07),
    cons_8_recreation: Math.floor(consumer * people * 0.05),
    cons_9_tobacco: Math.floor(consumer * people * 0.02),
    cons_10_personal_services: Math.floor(consumer * people * 0.04),
    cons_12_others: Math.floor(consumer * people * 0.03),
    
    // Classes sociais (distribuicao realista do Brasil)
    class_a1: Math.floor(people * 0.01),
    class_a2: Math.floor(people * 0.02),
    class_b1: Math.floor(people * 0.08),
    class_b2: Math.floor(people * 0.12),
    class_c: Math.floor(people * 0.35),
    class_d: Math.floor(people * 0.30),
    class_e: Math.floor(people * 0.12),
    
    // Faixas etarias (distribuicao realista)
    age_babies: Math.floor(people * 0.06),
    age_kids: Math.floor(people * 0.10),
    age_teens: Math.floor(people * 0.10),
    age_young_adults: Math.floor(people * 0.18),
    age_adults: Math.floor(people * 0.25),
    age_middle_age: Math.floor(people * 0.20),
    age_young_elderly: Math.floor(people * 0.08),
    age_elderly: Math.floor(people * 0.03),
    
    // Indicadores demograficos
    pop_active: "65.5",
    pop_youngness: "25.3",
    pop_oldness: "12.8",
    
    // Dados historicos
    people2022: Math.floor(people * 0.95),
    census_change: "2.5",
    income_2022: Math.floor(income * 0.92),
    income_2010: Math.floor(income * 0.75),
    income_rate: "8.3",
    
    // Atividades economicas
    clu_N_nome: "Comercio Varejista",
    clu_N_atv: Math.floor(people * 0.02),
    clu_N_pct_over_avg: "95.5",
    
    // ID para cache
    areaid: `${lat.toFixed(5)}_${lng.toFixed(5)}_${radius}`,
    
    _mock: true,
    _timestamp: new Date().toISOString(),
  };
}

/**
 * Wrapper para chamadas a API Space
 * NUNCA expor a chave da API no frontend
 */
export async function querySpaceApi(params: SpaceQueryParams): Promise<SpaceApiResponse> {
  const { lat, lng, radius, segment } = params;

  console.log("[querySpaceApi] Iniciando consulta...", { lat, lng, radius, segment });

  // Validar limites
  if (radius > ENV.spaceMaxRadius) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Raio maximo permitido: ${ENV.spaceMaxRadius}m`,
    });
  }

  // Se a Space API nao estiver configurada, retornar dados mockados
  if (!ENV.spaceApiBaseUrl || !ENV.spaceApiKey) {
    console.warn("[Space API] Credenciais nao configuradas, retornando dados mockados");
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

    console.log(`[Space API] Consultando: ${url.toString()}`);

    const response = await axios.get(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
      timeout: 10000, // 10 segundos de timeout
    });

    console.log(`[Space API] Response status: ${response.status}`);

    const rawData = response.data;

    console.log("[Space API] Raw data recebido:", {
      people: rawData.people,
      income: rawData.income,
      consumer: rawData.consumer,
      tipo_people: typeof rawData.people,
      tipo_income: typeof rawData.income,
    });

    // Normalizar dados da API que vem como strings
    const data = normalizeSpaceApiResponse(rawData);

    console.log(`[Space API] Sucesso! Retornando dados reais. Habitantes: ${data.people}, Renda: ${data.income}`);

    return {
      ok: true,
      data,
    };
  } catch (error: any) {
    console.error("[Space API] Erro na requisicao:", error);
    
    console.warn("[Space API] Erro de conexao, usando dados mockados como fallback");
    return {
      ok: true,
      data: generateMockSpaceData(lat, lng, radius, segment),
    };
  }
}

/**
 * Cache simples em memoria para consultas recentes
 */
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutos

function getCacheKey(params: SpaceQueryParams): string {
  return `${params.lat.toFixed(5)},${params.lng.toFixed(5)},${params.radius},${params.segment || ''}`;
}

export async function querySpaceApiWithCache(params: SpaceQueryParams): Promise<SpaceApiResponse> {
  const cacheKey = getCacheKey(params);
  const cached = queryCache.get(cacheKey);

  // Em desenvolvimento, ignorar cache para testar dados reais
  const ignoreCache = process.env.NODE_ENV !== 'production';

  console.log(`[querySpaceApiWithCache] NODE_ENV=${process.env.NODE_ENV}, ignoreCache=${ignoreCache}, cacheExists=${!!cached}`);

  // Verificar se ha cache valido
  if (!ignoreCache && cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log("[Space API] Cache hit:", cacheKey);
    return {
      ok: true,
      data: cached.data,
      cached: true,
    };
  }

  if (ignoreCache && cached) {
    console.log("[Space API] Cache ignorado em desenvolvimento");
  }

  // Fazer requisicao
  console.log("[querySpaceApiWithCache] Chamando querySpaceApi...");
  const result = await querySpaceApi(params);
  console.log("[querySpaceApiWithCache] Resultado recebido:", { ok: result.ok, people: result.data?.people });

  // Armazenar em cache
  queryCache.set(cacheKey, {
    data: result.data,
    timestamp: Date.now(),
  });

  // Limpar cache antigo (manter apenas ultimas 100 consultas)
  if (queryCache.size > 100) {
    const oldestKey = queryCache.keys().next().value;
    if (oldestKey) {
      queryCache.delete(oldestKey);
    }
  }

  return result;
}

