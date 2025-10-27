import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

/**
 * Gerar dados mockados da Space API para demonstração
 */
function generateMockSpaceData(lat: number, lng: number, radius: number) {
  return {
    location: {
      lat,
      lng,
      radius,
      address: "Localização de exemplo",
    },
    demografia: {
      populacao_total: Math.floor(Math.random() * 50000) + 10000,
      densidade_demografica: Math.floor(Math.random() * 5000) + 1000,
      faixa_etaria: {
        "0-14": Math.floor(Math.random() * 20) + 10,
        "15-29": Math.floor(Math.random() * 25) + 15,
        "30-44": Math.floor(Math.random() * 25) + 15,
        "45-59": Math.floor(Math.random() * 20) + 10,
        "60+": Math.floor(Math.random() * 15) + 5,
      },
      genero: {
        masculino: 48 + Math.random() * 4,
        feminino: 48 + Math.random() * 4,
      },
    },
    renda: {
      renda_media_mensal: Math.floor(Math.random() * 5000) + 2000,
      renda_per_capita: Math.floor(Math.random() * 2000) + 1000,
      classes_sociais: {
        A: Math.floor(Math.random() * 15) + 5,
        B: Math.floor(Math.random() * 30) + 20,
        C: Math.floor(Math.random() * 40) + 30,
        D: Math.floor(Math.random() * 20) + 10,
        E: Math.floor(Math.random() * 10) + 2,
      },
      potencial_consumo_anual: Math.floor(Math.random() * 10000000) + 5000000,
    },
    fluxo: {
      fluxo_diario_estimado: Math.floor(Math.random() * 10000) + 2000,
      horarios_pico: ["08:00-09:00", "12:00-13:00", "18:00-19:00"],
      dias_maior_movimento: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"],
      origem_fluxo: {
        residencial: 40 + Math.random() * 20,
        comercial: 30 + Math.random() * 20,
        transito: 20 + Math.random() * 20,
      },
    },
    concorrencia: {
      total_concorrentes: Math.floor(Math.random() * 20) + 5,
      concorrentes_proximos: [
        {
          nome: "Concorrente A",
          distancia: Math.floor(Math.random() * 500) + 100,
          tipo: "Direto",
        },
        {
          nome: "Concorrente B",
          distancia: Math.floor(Math.random() * 800) + 200,
          tipo: "Indireto",
        },
        {
          nome: "Concorrente C",
          distancia: Math.floor(Math.random() * 1000) + 300,
          tipo: "Direto",
        },
      ],
      saturacao_mercado: Math.random() > 0.5 ? "Média" : "Baixa",
    },
    pontos_interesse: {
      escolas: Math.floor(Math.random() * 10) + 2,
      hospitais: Math.floor(Math.random() * 5) + 1,
      shopping_centers: Math.floor(Math.random() * 3) + 1,
      estacoes_metro: Math.floor(Math.random() * 4) + 1,
      supermercados: Math.floor(Math.random() * 8) + 3,
    },
    score_viabilidade: {
      geral: (Math.random() * 30 + 70).toFixed(1),
      demografia: (Math.random() * 30 + 70).toFixed(1),
      renda: (Math.random() * 30 + 70).toFixed(1),
      fluxo: (Math.random() * 30 + 70).toFixed(1),
      concorrencia: (Math.random() * 30 + 70).toFixed(1),
    },
    observacoes: [
      "Região com alto potencial de consumo",
      "Boa acessibilidade por transporte público",
      "Concorrência moderada no segmento",
      "Perfil demográfico adequado ao negócio",
    ],
    _mock: true,
    _timestamp: new Date().toISOString(),
  };
}

export interface SpaceQueryParams {
  lat: number;
  lng: number;
  radius: number;
}

export interface SpaceApiResponse {
  ok: boolean;
  data: any;
}

/**
 * Wrapper para chamadas à API Space
 * NUNCA expor a chave da API no frontend
 */
export async function querySpaceApi(params: SpaceQueryParams): Promise<SpaceApiResponse> {
  const { lat, lng, radius } = params;

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
      data: generateMockSpaceData(lat, lng, radius),
    };
  }

  try {
    // Construir URL com parâmetros
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
      
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: `Erro na API Space: ${response.status}`,
      });
    }

    const data = await response.json();

    return {
      ok: true,
      data,
    };
  } catch (error: any) {
    console.error("[Space API] Erro na requisição:", error);
    
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Erro ao consultar Space API",
    });
  }
}

/**
 * Normalizar resposta da Space API para GeoJSON (se necessário)
 * Por enquanto retorna os dados brutos, mas pode ser estendido
 */
export function normalizeSpaceDataToGeoJSON(data: any) {
  // TODO: Implementar normalização se a Space API não retornar GeoJSON
  // Por enquanto, assumimos que a API já retorna em formato adequado
  return data;
}

/**
 * Cache simples em memória para consultas recentes
 * Em produção, considerar Redis ou similar
 */
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 20 * 60 * 1000; // 20 minutos

function getCacheKey(params: SpaceQueryParams): string {
  return `${params.lat.toFixed(5)},${params.lng.toFixed(5)},${params.radius}`;
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

