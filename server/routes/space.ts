import type { Request, Response } from "express";

const BASE = process.env.SPACE_API_BASE_URL!;
const KEY = process.env.SPACE_API_KEY!;
const MAXR = Number(process.env.SPACE_MAX_RADIUS ?? 5000);

function num(v: any, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function normalize(raw: any) {
  const people = num(raw?.people, 0);
  const income = num(raw?.income, 0);
  const consumer = num(raw?.consumer ?? raw?.cons_a_total, 0);

  const classes = [
    ["A1", "class_a1"],
    ["A2", "class_a2"],
    ["B1", "class_b1"],
    ["B2", "class_b2"],
    ["C", "class_c"],
    ["D", "class_d"],
    ["E", "class_e"],
  ].map(([sigla, key]) => ({ sigla, domicilios: num(raw?.[key], 0) }));
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
    valor: num(raw?.[k], 0),
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
      consumo_total: num(raw?.cons_a_total, 0),
      consumo_corrente: num(raw?.cons_b_current, 0),
      despesas: num(raw?.cons_c_expenditure, 0),
    },
    categorias,
    classes,
    faixas: ages,
  };
}

export async function handleSpaceQuery(req: Request, res: Response) {
  try {
    const lat = num(req.query.lat);
    const lng = num(req.query.lng);
    const radius = Math.min(num(req.query.radius, 0), MAXR);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || radius <= 0) {
      return res.status(400).json({ error: "INVALID_PARAMS" });
    }

    const url = `${BASE}?lat=${lat}&lng=${lng}&radius=${radius}&key=${KEY}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok)
      return res.status(502).json({ error: "SPACE_DOWN", status: r.status });

    const raw = await r.json();
    const data = normalize(raw);
    return res.json({ ok: true, data });
  } catch (e: any) {
    console.error("[Space API Error]", e?.message);
    return res
      .status(500)
      .json({ error: "UNEXPECTED", message: e?.message });
  }
}

