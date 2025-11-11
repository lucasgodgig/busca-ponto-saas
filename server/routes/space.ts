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
  ].map(([sigla, key]) => ({ sigla, domicilios: pick(raw, [key], 0) }));
  const totalDom = classes.reduce((s, c) => s + c.domicilios, 0);
  classes.forEach(
    (c) =>
      (c["pct"] = totalDom > 0 ? (c.domicilios / totalDom) * 100 : 0)
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

