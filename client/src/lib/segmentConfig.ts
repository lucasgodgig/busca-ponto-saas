/**
 * Configuração de segmentos e suas categorias de consumo relacionadas
 * Cada segmento pode ter um campo de consumo específico que deve ser exibido
 */

export interface SegmentConfig {
  value: string;
  label: string;
  consumptionKey?: string; // Campo da API para consumo específico do segmento
  consumptionLabel?: string; // Rótulo para exibição
  description?: string;
}

export const SEGMENT_CONFIGS: Record<string, SegmentConfig> = {
  academia: {
    value: "academia",
    label: "Academia",
    consumptionKey: "cons_8_recreation",
    consumptionLabel: "Recreação e esportes",
    description: "Dados para academias e centros de fitness",
  },
  petshop: {
    value: "petshop",
    label: "PetShop",
    consumptionKey: undefined,
    consumptionLabel: undefined,
    description: "Dados para lojas de animais de estimação",
  },
  farmacia: {
    value: "farmacia",
    label: "Farmácia",
    consumptionKey: "cons_6_health",
    consumptionLabel: "Saúde",
    description: "Dados para farmácias",
  },
  outros: {
    value: "outros",
    label: "Outros",
    consumptionKey: undefined,
    consumptionLabel: undefined,
    description: "Dados gerais",
  },
};

/**
 * Obter configuração de um segmento
 */
export function getSegmentConfig(segment: string): SegmentConfig {
  return SEGMENT_CONFIGS[segment] || SEGMENT_CONFIGS.outros;
}

/**
 * Obter chave de consumo de um segmento
 */
export function getConsumptionKey(segment: string): string | undefined {
  const config = getSegmentConfig(segment);
  return config.consumptionKey;
}

/**
 * Obter rótulo de consumo de um segmento
 */
export function getConsumptionLabel(segment: string): string | undefined {
  const config = getSegmentConfig(segment);
  return config.consumptionLabel;
}

