import { trpc } from "@/lib/trpc";

export type SpaceData = {
  head: { people: number; income: number; consumer: number };
  totals: { consumo_total: number; consumo_corrente: number; despesas: number };
  categorias: { chave: string; rotulo: string; ordem: number; valor: number }[];
  classes: { sigla: string; domicilios: number; pct: number }[];
  faixas?: { chave: string; rotulo: string; valor: number }[];
  // Campos de consumo por categoria
  cons_a_total?: number;
  cons_b_current?: number;
  cons_c_expenditure?: number;
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
  // Outros campos
  [key: string]: any;
};

// Esta função será usada em um contexto de componente React com hooks
// Para chamar a query, use: await trpc.space.normalize.query({ lat, lng, radius })
export async function fetchSpace(
  lat: number,
  lng: number,
  radius: number,
  queryFn: (input: { lat: number; lng: number; radius: number }) => Promise<any>
): Promise<SpaceData> {
  const result = await queryFn({ lat, lng, radius });
  if (!result.ok) throw new Error(result.error || "SPACE_ERROR");
  return result.data as SpaceData;
}

