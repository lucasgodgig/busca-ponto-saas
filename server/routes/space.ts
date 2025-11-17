import { TRPCError } from '@trpc/server';
import { Request, Response } from 'express';
import { z } from 'zod';
import { ENV } from '../_core/env';
import { validateSpaceApiRateLimit } from '../_core/securityMiddleware';
import { sdk } from '../_core/sdk';

const SPACE_BASE_URL = ENV.spaceApiBaseUrl;
const SPACE_API_KEY = ENV.spaceApiKey;
const MAXR = Number.isFinite(ENV.spaceMaxRadius) ? ENV.spaceMaxRadius : 5000;
const MAX_POLYGON_VERTICES = 50;
const MAX_POLYGON_SPAN_DEGREES = 1; // ~111km

if (!SPACE_BASE_URL) {
  throw new Error('[Space API] SPACE_API_BASE_URL must be configured');
}

if (!SPACE_API_KEY) {
  throw new Error('[Space API] SPACE_API_KEY must be configured');
}

try {
  new URL(SPACE_BASE_URL);
} catch (e) {
  throw new Error('[Space API] SPACE_API_BASE_URL has an invalid format');
}

const baseQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(MAXR),
});

const polygonSchema = z
  .object({
    polygon: z
      .array(
        z.object({
          lat: z.coerce.number().min(-90).max(90),
          lng: z.coerce.number().min(-180).max(180),
        })
      )
      .min(3)
      .max(MAX_POLYGON_VERTICES),
  })
  .superRefine((value, ctx) => {
    const lats = value.polygon.map((p) => p.lat);
    const lngs = value.polygon.map((p) => p.lng);
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);
    if (latSpan > MAX_POLYGON_SPAN_DEGREES || lngSpan > MAX_POLYGON_SPAN_DEGREES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Polígono deve ter extensão máxima de ${MAX_POLYGON_SPAN_DEGREES}° por eixo`,
      });
    }
  });

const NUMERIC_FIELDS: ReadonlyArray<string> = [
  'people',
  'population',
  'habitantes',
  'pop_total',
  'income',
  'renda',
  'avg_income',
  'renda_per_capita',
  'consumer',
  'cons_a_total',
  'consumo_total',
  'cons_b_current',
  'consumo_corrente',
  'cons_c_expenditure',
  'despesas',
  'class_a1',
  'class_a2',
  'class_b1',
  'class_b2',
  'class_c',
  'class_d',
  'class_e',
  'cons_1_food',
  'cons_2_housing',
  'cons_3_clothing',
  'cons_4_transport',
  'cons_5_hygiene_care',
  'cons_6_health',
  'cons_7_education',
  'cons_8_recreation',
  'cons_9_tobacco',
  'cons_10_personal_services',
  'cons_12_others',
  'cons_13_asset_increase',
  'cons_14_liability_reduction',
];

type PolygonPoint = { lat: number; lng: number };

async function authenticateAndRateLimit(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    try {
      await validateSpaceApiRateLimit(user.id, req.ip);
    } catch (error) {
      if (error instanceof TRPCError && error.code === 'TOO_MANY_REQUESTS') {
        res.status(429).json({ error: 'RATE_LIMITED', message: error.message });
        return null;
      }
      console.error('[Space API] Rate-limit validation failed', {
        userId: user.id,
        message: (error as Error)?.message,
      });
      res.status(500).json({ error: 'UNEXPECTED' });
      return null;
    }
    return user;
  } catch (error: any) {
    console.warn('[Space API] Unauthorized request blocked', {
      ip: req.ip,
      reason: error?.message,
    });
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return null;
  }
}

function extractLatLng(candidate: any): PolygonPoint | null {
  const lat = Number(candidate?.lat ?? candidate?.latitude ?? candidate?.Lat);
  const lng = Number(candidate?.lng ?? candidate?.longitude ?? candidate?.Lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    if (
      candidate?.geometry?.type === 'Point' &&
      Array.isArray(candidate?.geometry?.coordinates) &&
      candidate.geometry.coordinates.length >= 2
    ) {
      const [coordLng, coordLat] = candidate.geometry.coordinates;
      if (Number.isFinite(coordLat) && Number.isFinite(coordLng)) {
        return { lat: coordLat, lng: coordLng };
      }
    }
    return null;
  }
  return { lat, lng };
}

function aggregatePolygonPayload(raw: any, polygon: PolygonPoint[]) {
  const pointsSource = Array.isArray(raw?.points)
    ? raw.points
    : Array.isArray(raw?.data)
    ? raw.data
    : [];

  if (!Array.isArray(pointsSource) || pointsSource.length === 0) {
    return null;
  }

  const filtered = pointsSource.filter((point: any) => {
    const coords = extractLatLng(point);
    return coords ? isPointInPolygon(coords, polygon) : false;
  });

  const filteredCount = filtered.length;
  const totalCount = pointsSource.length;

  if (filteredCount === 0) {
    const zeroed = Object.fromEntries(NUMERIC_FIELDS.map((field) => [field, 0]));
    return { ...zeroed, points: [] };
  }

  const aggregated: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    aggregated[field] = 0;
  }

  for (const point of filtered) {
    for (const field of NUMERIC_FIELDS) {
      const value = Number(point?.[field]);
      if (Number.isFinite(value)) {
        aggregated[field] += value;
      }
    }
  }

  const scalingRatio = totalCount > 0 ? filteredCount / totalCount : 1;
  const scaled: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    const originalValue = Number(raw?.[field]);
    if (Number.isFinite(originalValue)) {
      scaled[field] = originalValue * scalingRatio;
    }
  }

  return {
    ...raw,
    ...scaled,
    ...aggregated,
    points: filtered,
  };
}

function num(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// Função auxiliar para pegar valor com fallbacks
function pick(obj: any, names: string[], d = 0) {
  for (const k of names) {
    if (obj && obj[k] != null && Number.isFinite(+obj[k])) {
      return +obj[k];
    }
  }
  return d;
}

function normalize(raw: any) {
  const people = pick(raw, ['people', 'population', 'habitantes', 'pop_total'], 0);
  const income = pick(raw, ['income', 'renda', 'avg_income', 'renda_per_capita'], 0);
  const consumer = pick(raw, ['consumer', 'cons_a_total', 'consumo_total'], 0);

  const classes = [
    ["A1", "class_a1"],
    ["A2", "class_a2"],
    ["B1", "class_b1"],
    ["B2", "class_b2"],
    ["C", "class_c"],
    ["D", "class_d"],
    ["E", "class_e"],
  ].map(([sigla, key]) => ({ sigla, domicilios: pick(raw, [key], 0), pct: 0 }));
  const totalDom = classes.reduce((s, c) => s + c.domicilios, 0);
  classes.forEach(
    (c) =>
      (c.pct = totalDom > 0 ? (c.domicilios / totalDom) * 100 : 0)
  );

  const categorias = [
    ["cons_1_food", "Alimentação", 1],
    ["cons_2_housing", "Habitação", 2],
    ["cons_3_clothing", "Vestuário", 3],
    ["cons_4_transport", "Transporte", 4],
    ["cons_5_hygiene_care", "Higiene & Cuidados", 5],
    ["cons_6_health", "Saúde", 6],
    ["cons_7_education", "Educação", 7],
    ["cons_8_recreation", "Lazer", 8],
    ["cons_9_tobacco", "Fumo", 9],
    ["cons_10_personal_services", "Serviços Pessoais", 10],
    ["cons_12_others", "Outros", 12],
    ["cons_13_asset_increase", "Aumento de Ativos", 13],
    ["cons_14_liability_reduction", "Redução de Passivos", 14],
  ].map(([k, rotulo, ord]: any) => ({
    chave: String(k),
    rotulo,
    ordem: ord,
    valor: pick(raw, [k], 0),
  }));

  // opcional: faixa etária se existir
  const ages = Object.entries(raw || {})
    .filter(([k]) => k.startsWith("age_"))
    .map(([k, v]) => ({
      chave: k,
      rotulo: k.replace("age_", "").toUpperCase(),
      valor: num(v, 0),
    }));

  return {
    head: { people, income, consumer },
    totals: {
      consumo_total: pick(raw, ['cons_a_total', 'consumo_total'], 0),
      consumo_corrente: pick(raw, ['cons_b_current', 'consumo_corrente'], 0),
      despesas: pick(raw, ['cons_c_expenditure', 'despesas'], 0),
    },
    categorias,
    classes,
    faixas: ages,
  };
}

// Rota de debug para inspecionar retorno real da Space API
export async function handleSpaceDebug(req: Request, res: Response) {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  const parsed = baseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'INVALID_PARAMS',
      issues: parsed.error.issues,
    });
  }

  try {
    const { lat, lng, radius } = parsed.data;
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      key: SPACE_API_KEY,
    });
    const url = `${SPACE_BASE_URL}?${params.toString()}`;
    const response = await fetch(url, { cache: 'no-store' });
    const raw = await response.json().catch(() => null);
    const keys = raw ? Object.keys(raw).slice(0, 50) : [];
    const sample = Object.fromEntries(keys.map((k) => [k, raw?.[k]]));
    return res.json({
      ok: response.ok,
      status: response.status,
      keys,
      sample,
    });
  } catch (error: any) {
    console.error('[Space Debug Error]', {
      userId: user.id,
      message: error?.message,
    });
    return res.status(500).json({ error: 'UNEXPECTED' });
  }
}

export async function handleSpaceQuery(req: Request, res: Response) {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  const parsed = baseQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'INVALID_PARAMS',
      issues: parsed.error.issues,
    });
  }

  try {
    const { lat, lng, radius } = parsed.data;
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      key: SPACE_API_KEY,
    });
    const url = `${SPACE_BASE_URL}?${params.toString()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.error('[Space API] Upstream failure', {
        userId: user.id,
        status: response.status,
      });
      return res.status(502).json({ error: 'SPACE_DOWN', status: response.status });
    }

    const raw = await response.json();
    const data = normalize(raw);
    return res.json({ ok: true, data });
  } catch (error: any) {
    console.error('[Space API] Unexpected error', {
      userId: user.id,
      message: error?.message,
    });
    return res.status(500).json({ error: 'UNEXPECTED' });
  }
}



// Função auxiliar: verificar se ponto está dentro do polígono (ray-casting algorithm)
function isPointInPolygon(point: { lat: number; lng: number }, polygon: Array<{ lat: number; lng: number }>): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Calcular bounding box do polígono
function getBoundingBox(polygon: Array<{ lat: number; lng: number }>) {
  const lats = polygon.map(p => p.lat);
  const lngs = polygon.map(p => p.lng);
  
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

// Calcular distância entre dois pontos em metros (Haversine)
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nova rota: análise de polígono
export async function handleSpacePolygonQuery(req: Request, res: Response) {
  const user = await authenticateAndRateLimit(req, res);
  if (!user) return;

  const parsed = polygonSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'INVALID_POLYGON',
      issues: parsed.error.issues,
    });
  }

  const { polygon } = parsed.data;
  const bbox = getBoundingBox(polygon);
  const centerLat = (bbox.minLat + bbox.maxLat) / 2;
  const centerLng = (bbox.minLng + bbox.maxLng) / 2;

  let maxRadius = 0;
  for (const point of polygon) {
    const dist = getDistance(centerLat, centerLng, point.lat, point.lng);
    if (dist > maxRadius) maxRadius = dist;
  }

  const queryRadius = Math.max(1, Math.min(Math.ceil(maxRadius * 1.2), MAXR));

  try {
    const params = new URLSearchParams({
      lat: String(centerLat),
      lng: String(centerLng),
      radius: String(queryRadius),
      key: SPACE_API_KEY,
    });
    const url = `${SPACE_BASE_URL}?${params.toString()}`;
    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      console.error('[Space Polygon] Upstream failure', {
        userId: user.id,
        status: response.status,
      });
      return res.status(502).json({ error: 'SPACE_DOWN', status: response.status });
    }

    const raw = await response.json();
    const polygonScopedRaw = aggregatePolygonPayload(raw, polygon) ?? raw;
    const data = normalize(polygonScopedRaw);

    return res.json({
      ok: true,
      data,
      meta: {
        polygonVertices: polygon.length,
        boundingBox: bbox,
        queryRadius,
        filteredPoints: Array.isArray(polygonScopedRaw?.points)
          ? polygonScopedRaw.points.length
          : undefined,
      },
    });
  } catch (error: any) {
    console.error('[Space Polygon] Unexpected error', {
      userId: user.id,
      message: error?.message,
    });
    return res.status(500).json({ error: 'UNEXPECTED' });
  }
}

