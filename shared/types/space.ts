/**
 * Tipos compartilhados para Space API
 */

export interface SpaceRawData {
  people?: number;
  income?: number;
  consumer?: number;
  cons_a_total?: number;
  cons_1_food?: number;
  cons_2_housing?: number;
  cons_3_clothing?: number;
  cons_4_transport?: number;
  cons_5_hygiene_care?: number;
  cons_6_health?: number;
  cons_7_education?: number;
  cons_8_recreation?: number;
  cons_9_tobacco?: number;
  cons_10_personal_services?: number;
  cons_12_others?: number;
  cons_13_asset_increase?: number;
  cons_14_liability_reduction?: number;
  class_a1?: number;
  class_a2?: number;
  class_b1?: number;
  class_b2?: number;
  class_c?: number;
  class_d?: number;
  class_e?: number;
  [key: string]: any;
}

export interface SpaceDataHead {
  people: number;
  income: number;
  consumer: number;
}

export interface SpaceDataCategory {
  chave: string;
  rotulo: string;
  ordem: number;
  valor: number;
}

export interface SpaceDataClass {
  sigla: string;
  domicilios: number;
  pct: number;
}

export interface SpaceDataAge {
  chave: string;
  rotulo: string;
  valor: number;
}

export interface SpaceDataTotals {
  consumo_total: number;
  consumo_corrente?: number;
  despesas?: number;
}

export interface NormalizedSpaceData {
  head: SpaceDataHead;
  totals: SpaceDataTotals;
  categorias: SpaceDataCategory[];
  classes: SpaceDataClass[];
  faixas?: SpaceDataAge[];
}

export interface SpaceApiResponse {
  ok: boolean;
  data?: NormalizedSpaceData;
  error?: string;
}

