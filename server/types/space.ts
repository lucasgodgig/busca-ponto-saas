// Tipos para normalização da Space API conforme documentação

export type SpaceNormalized = {
  head: {
    muni?: string;
    people: number;
    income: number;
    consumer: number;
    density?: number;
  };
  totals: {
    consumo_total: number;
    consumo_corrente: number;
    despesas: number;
  };
  categorias: Array<{
    chave: string;
    rotulo: string;
    ordem: number;
    valor: number;
  }>;
  classes: Array<{
    sigla: "A1" | "A2" | "B1" | "B2" | "C" | "D" | "E";
    domicilios: number;
    pct: number;
  }>;
  faixas?: Array<{
    chave: string;
    rotulo: string;
    valor: number;
  }>;
  meta: {
    lat: number;
    lng: number;
    radius_m: number;
    recebido_em: string;
  };
};

// Mapeamento de categorias conforme documentação
export const CONSUMO_CATEGORIAS = [
  { chave: "cons_1_food", rotulo: "Alimentação", ordem: 1 },
  { chave: "cons_2_housing", rotulo: "Habitação", ordem: 2 },
  { chave: "cons_3_clothing", rotulo: "Vestuário", ordem: 3 },
  { chave: "cons_4_transport", rotulo: "Transporte", ordem: 4 },
  { chave: "cons_5_hygiene_care", rotulo: "Higiene & Cuidados", ordem: 5 },
  { chave: "cons_6_health", rotulo: "Saúde", ordem: 6 },
  { chave: "cons_7_education", rotulo: "Educação", ordem: 7 },
  { chave: "cons_8_recreation", rotulo: "Lazer/Recreação", ordem: 8 },
  { chave: "cons_9_tobacco", rotulo: "Fumo", ordem: 9 },
  { chave: "cons_10_personal_services", rotulo: "Serviços Pessoais", ordem: 10 },
  { chave: "cons_12_others", rotulo: "Outros", ordem: 12 },
  { chave: "cons_13_asset_increase", rotulo: "Aumento de Ativos", ordem: 13 },
  { chave: "cons_14_liability_reduction", rotulo: "Redução de Passivos", ordem: 14 },
];

// Mapeamento de faixas etárias
export const FAIXAS_ETARIAS = [
  { chave: "age_0_4", rotulo: "0-4 anos" },
  { chave: "age_5_9", rotulo: "5-9 anos" },
  { chave: "age_10_14", rotulo: "10-14 anos" },
  { chave: "age_15_19", rotulo: "15-19 anos" },
  { chave: "age_20_24", rotulo: "20-24 anos" },
  { chave: "age_25_29", rotulo: "25-29 anos" },
  { chave: "age_30_34", rotulo: "30-34 anos" },
  { chave: "age_35_39", rotulo: "35-39 anos" },
  { chave: "age_40_44", rotulo: "40-44 anos" },
  { chave: "age_45_49", rotulo: "45-49 anos" },
  { chave: "age_50_54", rotulo: "50-54 anos" },
  { chave: "age_55_59", rotulo: "55-59 anos" },
  { chave: "age_60_64", rotulo: "60-64 anos" },
  { chave: "age_65_plus", rotulo: "65+ anos" },
];

// Mapeamento de tipos de negócio para Google Places
export const BUSINESS_TYPE_MAPPING: Record<string, string[]> = {
  academias: ["gym", "fitness_center"],
  farmácias: ["pharmacy", "drugstore"],
  petshops: ["pet_store", "veterinary_care"],
  restaurantes: ["restaurant", "cafe", "bakery"],
  lojas: ["shopping_mall", "store", "supermarket"],
  bancos: ["bank", "atm"],
  hospitais: ["hospital", "doctor", "health"],
  escolas: ["school", "university"],
  hotéis: ["hotel", "lodging"],
  salões: ["hair_care", "beauty_salon"],
};

