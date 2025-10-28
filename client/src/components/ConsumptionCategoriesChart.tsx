import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceData } from "@/services/spaceClient";

interface ConsumptionCategoriesChartProps {
  data: {
    categorias?: Array<{
      chave: string;
      rotulo: string;
      ordem: number;
      valor: number;
    }>;
    [key: string]: any;
  };
  segment: string;
}

// Mapeamento de segmentos para categorias adicionais
const segmentCategoryMap: Record<string, { chave: string; rotulo: string; color: string }[]> = {
  academia: [
    { chave: "cons_8_recreation", rotulo: "Recreação e Esportes", color: "#f59e0b" },
  ],
  farmacia: [
    { chave: "cons_6_health", rotulo: "Remédios", color: "#ef4444" },
  ],
  restaurante: [
    { chave: "cons_1_food", rotulo: "Alimentos", color: "#8b5cf6" },
  ],
  petshop: [
    { chave: "cons_8_recreation", rotulo: "Recreação e Esportes", color: "#f59e0b" },
  ],
  salao: [
    { chave: "cons_5_hygiene_care", rotulo: "Higiene e Cuidados", color: "#06b6d4" },
  ],
  delivery: [
    { chave: "cons_1_food", rotulo: "Alimentação fora do domicílio", color: "#8b5cf6" },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  cons_a_total: "#3b82f6",
  cons_1_food: "#10b981",
  cons_3_clothing: "#ec4899",
  cons_4_transport: "#f59e0b",
  cons_5_hygiene_care: "#06b6d4",
  cons_6_health: "#ef4444",
  cons_7_education: "#8b5cf6",
  cons_8_recreation: "#f59e0b",
};

export default function ConsumptionCategoriesChart({
  data,
  segment,
}: ConsumptionCategoriesChartProps) {
  if (!data || !data.categorias) {
    return null;
  }

  // Preparar dados com categorias padrão
  const standardKeys = [
    "cons_a_total",
    "cons_1_food",
    "cons_3_clothing",
    "cons_4_transport",
    "cons_5_hygiene_care",
    "cons_6_health",
    "cons_7_education",
  ];

  const chartData = data.categorias
    .filter(cat => standardKeys.includes(cat.chave) && cat.valor > 0)
    .map(cat => ({
      name: cat.rotulo,
      valor: cat.valor || 0,
      fill: CATEGORY_COLORS[cat.chave] || "#3b82f6",
      chave: cat.chave,
    }));

  // Adicionar categoria específica do segmento se existir e não for duplicata
  const segmentCategories = segmentCategoryMap[segment.toLowerCase()] || [];
  for (const category of segmentCategories) {
    const existingCategory = data.categorias.find(c => c.chave === category.chave);
    
    // Verificar se já existe na lista padrão
    const alreadyExists = chartData.some(d => d.chave === category.chave);
    
    // Adicionar apenas se existir, tiver valor > 0 e não for duplicata
    if (existingCategory && existingCategory.valor > 0 && !alreadyExists) {
      chartData.push({
        name: category.rotulo,
        valor: existingCategory.valor,
        fill: category.color,
        chave: category.chave,
      });
    }
  }

  // Se não há dados, retornar null
  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Potencial de Consumo por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => {
                const millions = (value as number) / 1000000;
                return `R$ ${millions.toFixed(1)}M`;
              }}
            />
            <Bar dataKey="valor" fill="#3b82f6" radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Bar
                  key={`bar-${index}`}
                  dataKey="valor"
                  fill={entry.fill}
                  radius={[0, 8, 8, 0]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {chartData.map((category, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: category.fill }}
              />
              <span className="text-gray-600">{category.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

