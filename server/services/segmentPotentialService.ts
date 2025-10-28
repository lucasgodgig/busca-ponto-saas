/**
 * Pesos de consumo por segmento (baseado em categorias reais da Space)
 */
export const SEGMENT_WEIGHTS: Record<string, { key: string; weight: number }[]> = {
  Academia: [
    { key: 'cons_10_personal_services', weight: 0.55 },
    { key: 'cons_8_recreation', weight: 0.25 },
    { key: 'cons_4_transport', weight: 0.1 },
    { key: 'cons_12_others', weight: 0.1 },
  ],
  Farmácia: [
    { key: 'cons_6_health', weight: 0.65 },
    { key: 'cons_5_hygiene_care', weight: 0.25 },
    { key: 'cons_12_others', weight: 0.1 },
  ],
  Petshop: [
    { key: 'cons_12_others', weight: 0.4 },
    { key: 'cons_10_personal_services', weight: 0.3 },
    { key: 'cons_8_recreation', weight: 0.2 },
    { key: 'cons_4_transport', weight: 0.1 },
  ],
  Restaurante: [
    { key: 'cons_1_food', weight: 0.7 },
    { key: 'cons_8_recreation', weight: 0.2 },
    { key: 'cons_4_transport', weight: 0.1 },
  ],
  Supermercado: [
    { key: 'cons_1_food', weight: 0.5 },
    { key: 'cons_2_housing', weight: 0.2 },
    { key: 'cons_3_clothing', weight: 0.1 },
    { key: 'cons_12_others', weight: 0.2 },
  ],
  Loja: [
    { key: 'cons_3_clothing', weight: 0.4 },
    { key: 'cons_12_others', weight: 0.3 },
    { key: 'cons_2_housing', weight: 0.2 },
    { key: 'cons_8_recreation', weight: 0.1 },
  ],
  Clínica: [
    { key: 'cons_6_health', weight: 0.8 },
    { key: 'cons_5_hygiene_care', weight: 0.15 },
    { key: 'cons_12_others', weight: 0.05 },
  ],
};

export interface SegmentPotential {
  value: number;
  breakdown: Array<{
    key: string;
    weight: number;
    value: number;
  }>;
}

/**
 * Calcula o potencial de consumo para um segmento específico
 */
export function computeSegmentPotential(
  categorias: Array<{ chave: string; valor: number }>,
  segment: string
): SegmentPotential {
  const cfg = SEGMENT_WEIGHTS[segment] || [];
  const map = Object.fromEntries(categorias.map((c) => [c.chave, c.valor]));

  const breakdown = cfg.map(({ key, weight }) => ({
    key,
    weight,
    value: (map[key] ?? 0) * weight,
  }));

  const value = breakdown.reduce((s, b) => s + b.value, 0);

  return { value, breakdown };
}

/**
 * Formata valor de potencial de consumo
 */
export function formatPotential(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}K`;
  }
  return `R$ ${value.toFixed(2)}`;
}

