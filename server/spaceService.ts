import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

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

  if (!ENV.spaceApiBaseUrl || !ENV.spaceApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Configuração da Space API não encontrada",
    });
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

