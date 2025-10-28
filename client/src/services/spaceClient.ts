import { trpc } from "@/lib/trpc";

export type SpaceData = {
  head: { people: number; income: number; consumer: number };
  totals: { consumo_total: number; consumo_corrente: number; despesas: number };
  categorias: { chave: string; rotulo: string; ordem: number; valor: number }[];
  classes: { sigla: string; domicilios: number; pct: number }[];
  faixas?: { chave: string; rotulo: string; valor: number }[];
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

