import { Request, Response } from 'express';

// Fallback para credenciais da API Space
// Prioridade: 1) Variáveis de ambiente, 2) Valores hardcoded
const BASE = process.env.SPACE_API_BASE_URL?.trim() || 'https://gs.greatspaces.com.br/api/';
const KEY = process.env.SPACE_API_KEY?.trim() || 'ICZN3OS030JVXKFPMWOHWYGWD6JVW7';
const MAXR = Number(process.env.SPACE_MAX_RADIUS ?? 5000);

// Validar formato da URL base
if (BASE) {
  try {
    new URL(BASE);
  } catch (e) {
    console.error('[SPACE API] SPACE_API_BASE_URL tem formato inválido:', BASE);
  }
}

// Validar variáveis de ambiente críticas
console.log('[SPACE API] Inicializando...');
console.log('[SPACE API] NODE_ENV:', process.env.NODE_ENV);

const usingEnvBase = !!process.env.SPACE_API_BASE_URL;
const usingEnvKey = !!process.env.SPACE_API_KEY;

console.log('[SPACE API] SPACE_API_BASE_URL:', usingEnvBase ? `✅ Env (${BASE.substring(0, 30)}...)` : `⚠️ Fallback (${BASE.substring(0, 30)}...)`);
console.log('[SPACE API] SPACE_API_KEY:', usingEnvKey ? `✅ Env (${KEY.substring(0, 10)}...)` : `⚠️ Fallback (${KEY.substring(0, 10)}...)`);
console.log('[SPACE API] SPACE_MAX_RADIUS:', MAXR);

if (!usingEnvBase || !usingEnvKey) {
  console.warn('[SPACE API] ⚠️ Usando valores fallback hardcoded');
  console.warn('[SPACE API] Para usar variáveis customizadas, configure em Settings → Secrets');
}

console.log('[SPACE API] ✅ Pronto para uso');

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
  try {
    const lat = num(req.query.lat);
    const lng = num(req.query.lng);
    const radius = Math.min(num(req.query.radius, 0), MAXR);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || radius <= 0) {
      return res.status(400).json({
        error: 'INVALID_PARAMS',
        lat,
        lng,
        radius,
      });
    }

    // Construir URL com encoding adequado
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      key: KEY!,
    });
    const url = `${BASE}?${params.toString()}`;
    const r = await fetch(url, { cache: 'no-store' });
    const raw = await r.json().catch(() => null);
    const keys = raw ? Object.keys(raw).slice(0, 50) : [];
    const sample = Object.fromEntries(
      keys.map((k) => [k, raw?.[k]])
    );

    return res.json({
      ok: r.ok,
      status: r.status,
      forwarded: url.replace(KEY, '***'),
      keys,
      sample,
    });
  } catch (e: any) {
    console.error('[Space Debug Error]', e?.message);
    return res.status(500).json({
      error: 'UNEXPECTED',
      message: e?.message,
    });
  }
}

export async function handleSpaceQuery(req: Request, res: Response) {
  try {
    // BASE e KEY agora sempre existem (env ou fallback), então não precisa verificar

    const lat = num(req.query.lat);
    const lng = num(req.query.lng);
    const radius = Math.min(num(req.query.radius, 0), MAXR);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || radius <= 0) {
      return res.status(400).json({
        error: 'INVALID_PARAMS',
        received: { lat, lng, radius },
      });
    }

    // Construir URL com encoding adequado
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radius),
      key: KEY!,
    });
    const url = `${BASE}?${params.toString()}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('[SPACE_ERROR]', { lat, lng, radius, status: r.status, text: text.slice(0, 200) });
      return res.status(502).json({ error: 'SPACE_DOWN', status: r.status });
    }

    const raw = await r.json();
    const data = normalize(raw);
    return res.json({ ok: true, data });
  } catch (e: any) {
    console.error('[Space API Error]', e?.message);
    return res
      .status(500)
      .json({ error: 'UNEXPECTED', message: e?.message });
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
  try {
    const { polygon } = req.body;
    
    // Validar polígono
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return res.status(400).json({
        error: 'INVALID_POLYGON',
        message: 'Polígono deve ter pelo menos 3 vértices',
      });
    }
    
    // Validar coordenadas
    for (const point of polygon) {
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
        return res.status(400).json({
          error: 'INVALID_COORDINATES',
          message: 'Todas as coordenadas devem ser números válidos',
        });
      }
    }
    
    // Calcular bounding box
    const bbox = getBoundingBox(polygon);
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    
    // Calcular raio que cobre todo o polígono (distância do centro ao ponto mais distante)
    let maxRadius = 0;
    for (const point of polygon) {
      const dist = getDistance(centerLat, centerLng, point.lat, point.lng);
      if (dist > maxRadius) maxRadius = dist;
    }
    
    // Adicionar margem de segurança (20%)
    const queryRadius = Math.min(Math.ceil(maxRadius * 1.2), MAXR);
    
    console.log('[SPACE POLYGON] Bounding box:', bbox);
    console.log('[SPACE POLYGON] Center:', { lat: centerLat, lng: centerLng });
    console.log('[SPACE POLYGON] Query radius:', queryRadius);
    
    // Fazer consulta na Space API usando o centro e raio expandido
    const params = new URLSearchParams({
      lat: String(centerLat),
      lng: String(centerLng),
      radius: String(queryRadius),
      key: KEY!,
    });
    const url = `${BASE}?${params.toString()}`;
    const r = await fetch(url, { cache: 'no-store' });
    
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('[SPACE_POLYGON_ERROR]', { status: r.status, text: text.slice(0, 200) });
      return res.status(502).json({ error: 'SPACE_DOWN', status: r.status });
    }
    
    const raw = await r.json();
    
    // Por enquanto, retornar dados normalizados
    // TODO: Se a API retornar pontos individuais, filtrar apenas os que estão dentro do polígono
    const data = normalize(raw);
    
    return res.json({ 
      ok: true, 
      data,
      meta: {
        polygon: polygon.length + ' vértices',
        boundingBox: bbox,
        queryRadius,
        method: 'center_with_expanded_radius'
      }
    });
  } catch (e: any) {
    console.error('[Space Polygon API Error]', e?.message);
    return res
      .status(500)
      .json({ error: 'UNEXPECTED', message: e?.message });
  }
}

