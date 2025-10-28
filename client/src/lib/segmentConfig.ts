/**
 * Configuração de segmentos e suas categorias de consumo relacionadas
 * Cada segmento pode ter categorias adicionais que devem ser exibidas
 */

export interface SegmentConfig {
  value: string;
  label: string;
  additionalCategories?: string[]; // Categorias adicionais a exibir
  description?: string;
}

export const SEGMENT_CONFIGS: Record<string, SegmentConfig> = {
  academia: {
    value: "academia",
    label: "Academia",
    additionalCategories: ["cons_8_recreation"], // Lazer / Recreação e esportes
    description: "Dados para academias e centros de fitness",
  },
  petshop: {
    value: "petshop",
    label: "PetShop",
    additionalCategories: [], // Sem categorias adicionais por enquanto
    description: "Dados para lojas de animais de estimação",
  },
  farmacia: {
    value: "farmacia",
    label: "Farmácia",
    additionalCategories: ["cons_6_health"], // Saúde
    description: "Dados para farmácias",
  },
  outros: {
    value: "outros",
    label: "Outros",
    additionalCategories: [],
    description: "Dados gerais",
  },
};

/**
 * Mapeamento de chaves de consumo para rótulos em português
 */
export const CONSUMPTION_LABELS: Record<string, string> = {
  cons_1_food: "Alimentação",
  cons_2_housing: "Habitação",
  cons_3_clothing: "Vestuário",
  cons_4_transport: "Transporte",
  cons_5_hygiene_care: "Higiene & Cuidados",
  cons_6_health: "Saúde",
  cons_7_education: "Educação",
  cons_8_recreation: "Recreação e esportes",
  cons_9_tobacco: "Fumo",
  cons_10_personal_services: "Serviços Pessoais",
  cons_12_others: "Outros",
  cons_13_asset_increase: "Aumento de Ativos",
  cons_14_liability_reduction: "Redução de Passivos",
};

/**
 * Obter configuração de um segmento
 */
export function getSegmentConfig(segment: string): SegmentConfig {
  return SEGMENT_CONFIGS[segment] || SEGMENT_CONFIGS.outros;
}

/**
 * Obter categorias adicionais de um segmento
 */
export function getAdditionalCategories(segment: string): string[] {
  const config = getSegmentConfig(segment);
  return config.additionalCategories || [];
}

/**
 * Obter rótulo de uma categoria de consumo
 */
export function getConsumptionLabel(key: string): string {
  return CONSUMPTION_LABELS[key] || key;
}

