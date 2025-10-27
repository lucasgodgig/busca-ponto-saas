import { SpaceNormalized, CONSUMO_CATEGORIAS, FAIXAS_ETARIAS } from "./types/space";

/**
 * Normalizar resposta da Space API conforme documentação
 * Evita NaN, Infinity e garante tipos corretos
 */
export function normalizeSpaceData(data: any, lat: number, lng: number, radius: number): SpaceNormalized {
  // Helpers para garantir números válidos
  const toNumber = (val: any, fallback = 0): number => {
    const num = Number(val);
    return isFinite(num) ? num : fallback;
  };

  const toPercent = (numerador: number, denominador: number): number => {
    if (denominador <= 0) return 0;
    const pct = (numerador / denominador) * 100;
    return isFinite(pct) ? Math.round(pct * 10) / 10 : 0;
  };

  // ===== HEAD (Dados principais) =====
  const people = toNumber(data.people, 0);
  const income = toNumber(data.income, 0);
  const consumer = toNumber(data.consumer || data.cons_a_total, 0);

  // Calcular densidade se houver
  const density = people > 0 && radius > 0 ? Math.round(people / ((radius / 1000) ** 2)) : undefined;

  // ===== TOTALS (Potenciais de consumo) =====
  const consumo_total = toNumber(data.cons_a_total, 0);
  const consumo_corrente = toNumber(data.cons_b_current, 0);
  const despesas = toNumber(data.cons_c_expenditure, 0);

  // ===== CATEGORIAS (Consumo por tipo) =====
  const categorias = CONSUMO_CATEGORIAS.map(cat => ({
    chave: cat.chave,
    rotulo: cat.rotulo,
    ordem: cat.ordem,
    valor: toNumber(data[cat.chave], 0),
  })).filter(cat => cat.valor > 0); // Remover categorias vazias

  // ===== CLASSES (Distribuição por classe social) =====
  const classesData = {
    a1: toNumber(data.class_a1, 0),
    a2: toNumber(data.class_a2, 0),
    b1: toNumber(data.class_b1, 0),
    b2: toNumber(data.class_b2, 0),
    c: toNumber(data.class_c, 0),
    d: toNumber(data.class_d, 0),
    e: toNumber(data.class_e, 0),
  };

  const totalDomicilios = Object.values(classesData).reduce((a, b) => a + b, 0);

  const classes = [
    { sigla: "A1" as const, domicilios: classesData.a1, pct: toPercent(classesData.a1, totalDomicilios) },
    { sigla: "A2" as const, domicilios: classesData.a2, pct: toPercent(classesData.a2, totalDomicilios) },
    { sigla: "B1" as const, domicilios: classesData.b1, pct: toPercent(classesData.b1, totalDomicilios) },
    { sigla: "B2" as const, domicilios: classesData.b2, pct: toPercent(classesData.b2, totalDomicilios) },
    { sigla: "C" as const, domicilios: classesData.c, pct: toPercent(classesData.c, totalDomicilios) },
    { sigla: "D" as const, domicilios: classesData.d, pct: toPercent(classesData.d, totalDomicilios) },
    { sigla: "E" as const, domicilios: classesData.e, pct: toPercent(classesData.e, totalDomicilios) },
  ].filter(cls => cls.domicilios > 0); // Remover classes vazias

  // ===== FAIXAS ETÁRIAS (Opcional) =====
  const faixas = FAIXAS_ETARIAS
    .map(faixa => ({
      chave: faixa.chave,
      rotulo: faixa.rotulo,
      valor: toNumber(data[faixa.chave], 0),
    }))
    .filter(f => f.valor > 0); // Remover faixas vazias

  // ===== META (Informações da consulta) =====
  const meta = {
    lat,
    lng,
    radius_m: radius,
    recebido_em: new Date().toISOString(),
  };

  return {
    head: {
      muni: data.muni || "Localização desconhecida",
      people,
      income,
      consumer,
      ...(density !== undefined && { density }),
    },
    totals: {
      consumo_total,
      consumo_corrente,
      despesas,
    },
    categorias,
    classes,
    ...(faixas.length > 0 && { faixas }),
    meta,
  };
}

/**
 * Formatar número como moeda BRL
 */
export function formatCurrency(value: number, compact = true): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formatar número com separadores
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

/**
 * Formatar percentual
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

