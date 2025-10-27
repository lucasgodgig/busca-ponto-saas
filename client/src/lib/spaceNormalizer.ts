/**
 * Normalização de dados da Space API
 * Evita NaN, Infinity e garante tipos corretos
 */

export interface SpaceNormalized {
  head: {
    people: number;
    income: number;
    consumer: number;
    density?: number;
  };
  categorias: Array<{
    chave: string;
    rotulo: string;
    valor: number;
  }>;
  classes: Array<{
    sigla: string;
    domicilios: number;
    pct: number;
  }>;
}

const toNumber = (val: any, fallback = 0): number => {
  const num = Number(val);
  return isFinite(num) ? num : fallback;
};

const toPercent = (numerador: number, denominador: number): number => {
  if (denominador <= 0) return 0;
  const pct = (numerador / denominador) * 100;
  return isFinite(pct) ? Math.round(pct * 10) / 10 : 0;
};

export function normalizeSpaceData(data: any): SpaceNormalized {
  const people = toNumber(data.people, 0);
  const income = toNumber(data.income, 0);
  const consumer = toNumber(data.consumer || data.cons_a_total, 0);

  // Classes sociais
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
    { sigla: "A1", domicilios: classesData.a1, pct: toPercent(classesData.a1, totalDomicilios) },
    { sigla: "A2", domicilios: classesData.a2, pct: toPercent(classesData.a2, totalDomicilios) },
    { sigla: "B1", domicilios: classesData.b1, pct: toPercent(classesData.b1, totalDomicilios) },
    { sigla: "B2", domicilios: classesData.b2, pct: toPercent(classesData.b2, totalDomicilios) },
    { sigla: "C", domicilios: classesData.c, pct: toPercent(classesData.c, totalDomicilios) },
    { sigla: "D", domicilios: classesData.d, pct: toPercent(classesData.d, totalDomicilios) },
    { sigla: "E", domicilios: classesData.e, pct: toPercent(classesData.e, totalDomicilios) },
  ].filter(cls => cls.domicilios > 0);

  // Categorias de consumo
  const categoriasMap = [
    { chave: "cons_1_food", rotulo: "Alimentação" },
    { chave: "cons_2_housing", rotulo: "Habitação" },
    { chave: "cons_3_clothing", rotulo: "Vestuário" },
    { chave: "cons_4_transport", rotulo: "Transporte" },
    { chave: "cons_5_hygiene_care", rotulo: "Higiene & Cuidados" },
    { chave: "cons_6_health", rotulo: "Saúde" },
    { chave: "cons_7_education", rotulo: "Educação" },
    { chave: "cons_8_recreation", rotulo: "Lazer" },
    { chave: "cons_9_tobacco", rotulo: "Fumo" },
    { chave: "cons_10_personal_services", rotulo: "Serviços Pessoais" },
    { chave: "cons_12_others", rotulo: "Outros" },
    { chave: "cons_13_asset_increase", rotulo: "Aumento de Ativos" },
    { chave: "cons_14_liability_reduction", rotulo: "Redução de Passivos" },
  ];

  const categorias = categoriasMap
    .map(cat => ({
      chave: cat.chave,
      rotulo: cat.rotulo,
      valor: toNumber(data[cat.chave], 0),
    }))
    .filter(cat => cat.valor > 0);

  return {
    head: {
      people,
      income,
      consumer,
    },
    categorias,
    classes,
  };
}

export function formatCurrency(value: number, compact = true): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2, // Manter até 2 casas decimais
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2, // Manter até 2 casas decimais
  }).format(value);
}

