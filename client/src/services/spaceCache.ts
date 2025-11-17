import type { SpaceData } from "./spaceClient";

interface CacheEntry {
  data: SpaceData;
  timestamp: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

const CACHE_PREFIX = "space_cache_";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas
const CACHE_STATS_KEY = "space_cache_stats";

// Cache em memória para a sessão atual (mais rápido)
const memoryCache = new Map<string, CacheEntry>();

/**
 * Gera chave de cache baseada em coordenadas e raio
 * Arredonda coordenadas para 4 casas decimais (~11m de precisão)
 */
function generateCacheKey(lat: number, lng: number, radius: number): string {
  const latRounded = lat.toFixed(4);
  const lngRounded = lng.toFixed(4);
  return `${latRounded},${lngRounded},${radius}`;
}

/**
 * Verifica se uma entrada do cache ainda é válida
 */
function isValid(entry: CacheEntry): boolean {
  const age = Date.now() - entry.timestamp;
  return age < CACHE_EXPIRY_MS;
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): CacheStats {
  try {
    const stored = localStorage.getItem(CACHE_STATS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("[SpaceCache] Erro ao ler estatísticas:", e);
  }
  
  return { hits: 0, misses: 0, size: memoryCache.size };
}

/**
 * Atualiza estatísticas do cache
 */
function updateStats(hit: boolean) {
  const stats = getCacheStats();
  if (hit) {
    stats.hits++;
  } else {
    stats.misses++;
  }
  stats.size = memoryCache.size;
  
  try {
    localStorage.setItem(CACHE_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("[SpaceCache] Erro ao salvar estatísticas:", e);
  }
}

/**
 * Busca dados no cache (memória primeiro, depois localStorage)
 */
export function getFromCache(
  lat: number,
  lng: number,
  radius: number
): SpaceData | null {
  const key = generateCacheKey(lat, lng, radius);

  // 1. Tentar cache em memória primeiro
  const memEntry = memoryCache.get(key);
  if (memEntry && isValid(memEntry)) {
    console.log("[SpaceCache] HIT (memória):", key);
    updateStats(true);
    return memEntry.data;
  }

  // 2. Tentar localStorage
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (stored) {
      const entry: CacheEntry = JSON.parse(stored);
      if (isValid(entry)) {
        console.log("[SpaceCache] HIT (localStorage):", key);
        // Promover para memória
        memoryCache.set(key, entry);
        updateStats(true);
        return entry.data;
      } else {
        // Expirado, remover
        localStorage.removeItem(CACHE_PREFIX + key);
      }
    }
  } catch (e) {
    console.warn("[SpaceCache] Erro ao ler do localStorage:", e);
  }

  console.log("[SpaceCache] MISS:", key);
  updateStats(false);
  return null;
}

/**
 * Salva dados no cache (memória + localStorage)
 */
export function saveToCache(
  lat: number,
  lng: number,
  radius: number,
  data: SpaceData
): void {
  const key = generateCacheKey(lat, lng, radius);
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    key,
  };

  // Salvar em memória
  memoryCache.set(key, entry);

  // Salvar em localStorage
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    console.log("[SpaceCache] Salvo:", key);
  } catch (e) {
    console.warn("[SpaceCache] Erro ao salvar no localStorage:", e);
    // Se falhar (quota excedida), limpar entradas antigas
    clearExpiredCache();
  }
}

/**
 * Limpa entradas expiradas do cache
 */
export function clearExpiredCache(): number {
  let cleared = 0;

  // Limpar memória
  for (const [key, entry] of Array.from(memoryCache.entries())) {
    if (!isValid(entry)) {
      memoryCache.delete(key);
      cleared++;
    }
  }

  // Limpar localStorage
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const entry: CacheEntry = JSON.parse(stored);
            if (!isValid(entry)) {
              localStorage.removeItem(key);
              cleared++;
            }
          }
        } catch (e) {
          // Entrada corrompida, remover
          localStorage.removeItem(key);
          cleared++;
        }
      }
    }
  } catch (e) {
    console.warn("[SpaceCache] Erro ao limpar cache expirado:", e);
  }

  console.log(`[SpaceCache] ${cleared} entradas expiradas removidas`);
  return cleared;
}

/**
 * Limpa todo o cache
 */
export function clearAllCache(): void {
  // Limpar memória
  memoryCache.clear();

  // Limpar localStorage
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    // Resetar estatísticas
    localStorage.setItem(CACHE_STATS_KEY, JSON.stringify({ hits: 0, misses: 0, size: 0 }));
  } catch (e) {
    console.warn("[SpaceCache] Erro ao limpar cache:", e);
  }

  console.log("[SpaceCache] Cache completamente limpo");
}

/**
 * Obtém tamanho do cache
 */
export function getCacheSize(): { memory: number; storage: number } {
  let storageCount = 0;

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        storageCount++;
      }
    }
  } catch (e) {
    console.warn("[SpaceCache] Erro ao contar cache:", e);
  }

  return {
    memory: memoryCache.size,
    storage: storageCount,
  };
}

// Limpar cache expirado ao inicializar
clearExpiredCache();

