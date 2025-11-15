import axios from 'axios';
import { SPACE_API_TIMEOUT_MS } from '@shared/constants';

const BASE_URL = process.env.SPACE_API_BASE_URL || 'https://gs.greatspaces.com.br/api/';
const API_KEY = process.env.SPACE_API_KEY;

/**
 * Cache em memória para requisições da Space API
 * TTL: 20 minutos
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 20 * 60 * 1000;

export interface SpaceRawData {
  people?: number;
  income?: number;
  consumer?: number;
  cons_a_total?: number;
  cons_1_food?: number;
  cons_2_housing?: number;
  cons_3_clothing?: number;
  cons_4_transport?: number;
  cons_5_hygiene_care?: number;
  cons_6_health?: number;
  cons_7_education?: number;
  cons_8_recreation?: number;
  cons_9_tobacco?: number;
  cons_10_personal_services?: number;
  cons_12_others?: number;
  cons_13_asset_increase?: number;
  cons_14_liability_reduction?: number;
  class_a1?: number;
  class_a2?: number;
  class_b1?: number;
  class_b2?: number;
  class_c?: number;
  class_d?: number;
  class_e?: number;
}

export interface NormalizedSpace {
  head: {
    people: number;
    income: number;
    consumer: number;
  };
  categorias: Array<{
    chave: string;
    rotulo: string;
    ordem: number;
    valor: number;
  }>;
  classes: Array<{
    sigla: string;
    domicilios: number;
    pct: number;
  }>;
}

/**
 * Busca dados da Space API
 */
export async function fetchSpace(lat: number, lng: number, radius: number): Promise<SpaceRawData> {
  if (!API_KEY) {
    throw new Error('SPACE_API_KEY não configurada');
  }

  try {
    const url = `${BASE_URL}?lat=${lat}&lng=${lng}&radius=${radius}&key=${API_KEY}`;
    const response = await axios.get(url, {
      timeout: SPACE_API_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Busca-Ponto-SaaS/1.0',
      },
    });

    return response.data;
  } catch (error) {
    console.error('[Space API] Erro ao buscar dados:', error);
    throw new Error('Falha ao consultar Space API');
  }
}

/**
 * Normaliza dados da Space API removendo NaN e Infinity
 */
export function normalizeSpace(raw: SpaceRawData): NormalizedSpace {
  const n = (v: any) => (Number.isFinite(+v) ? +v : 0);

  const head = {
    people: n(raw.people),
    income: n(raw.income),
    consumer: n(raw.consumer ?? raw.cons_a_total),
  };

  const categorias = [
    ['cons_1_food', 'Alimentação', 1],
    ['cons_2_housing', 'Habitação', 2],
    ['cons_3_clothing', 'Vestuário', 3],
    ['cons_4_transport', 'Transporte', 4],
    ['cons_5_hygiene_care', 'Higiene & Cuidados', 5],
    ['cons_6_health', 'Saúde', 6],
    ['cons_7_education', 'Educação', 7],
    ['cons_8_recreation', 'Lazer', 8],
    ['cons_10_personal_services', 'Serviços Pessoais', 10],
    ['cons_14_liability_reduction', 'Redução de Passivos', 14],
  ].map(([k, rotulo, ord]: any) => ({
    chave: k as string,
    rotulo,
    ordem: ord,
    valor: n((raw as any)?.[k as string]),
  }));

  const classes = (['a1', 'a2', 'b1', 'b2', 'c', 'd', 'e'] as const).map((tag) => {
    const key = `class_${tag}`;
    const domicilios = n((raw as any)?.[key]);
    return { sigla: tag.toUpperCase(), domicilios };
  });

  const total = classes.reduce((s, c) => s + c.domicilios, 0);
  const classesWithPct = classes.map((c) => ({
    ...c,
    pct: total > 0 ? (c.domicilios / total) * 100 : 0,
  }));

  return { head, categorias, classes: classesWithPct };
}

/**
 * Busca dados da Space API com cache
 */
export async function querySpaceApiWithCache(params: {
  lat: number;
  lng: number;
  radius: number;
}): Promise<{ ok: boolean; data?: any; error?: string }> {
  const cacheKey = `${params.lat},${params.lng},${params.radius}`;
  
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Space API] Cache hit:', cacheKey);
    return { ok: true, data: cached.data };
  }

  try {
    // Buscar dados reais
    const raw = await fetchSpace(params.lat, params.lng, params.radius);
    const normalized = normalizeSpace(raw);
    
    // Salvar no cache
    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    
    return { ok: true, data: normalized };
  } catch (error) {
    console.error('[Space API] Erro:', error);
    return { ok: false, error: 'Falha ao consultar Space API' };
  }
}

