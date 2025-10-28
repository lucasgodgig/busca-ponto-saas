import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceData } from "@/services/spaceClient";

interface ConsumptionCategoriesChartProps {
  data: SpaceData;
  segment: string;
}

// Mapeamento de segmentos para categorias adicionais
const segmentCategoryMap: Record<string, { key: keyof SpaceData; label: string; color: string }[]> = {
  academia: [
    { key: "cons_8_recreation", label: "Recreação e Esportes", color: "#f59e0b" },
  ],
  farmacia: [
    { key: "cons_6_health", label: "Saúde", color: "#ef4444" },
  ],
  restaurante: [
    { key: "cons_1_food", label: "Alimentos", color: "#8b5cf6" },
  ],
  petshop: [
    { key: "cons_8_recreation", label: "Recreação e Esportes", color: "#f59e0b" },
  ],
  salao: [
    { key: "cons_5_hygiene_care", label: "Higiene e Cuidados", color: "#06b6d4" },
  ],
};

export default function ConsumptionCategoriesChart({
  data,
  segment,
}: ConsumptionCategoriesChartProps) {
  // Preparar dados com categorias padrão
  const chartData = [
    {
      name: "Consumo Total",
      valor: data.cons_a_total || 0,
      fill: "#3b82f6",
    },
    {
      name: "Alimentos",
      valor: data.cons_1_food || 0,
      fill: "#10b981",
    },
    {
      name: "Vestuário",
      valor: data.cons_3_clothing || 0,
      fill: "#ec4899",
    },
    {
      name: "Transporte",
      valor: data.cons_4_transport || 0,
      fill: "#f59e0b",
    },
    {
      name: "Higiene",
      valor: data.cons_5_hygiene_care || 0,
      fill: "#06b6d4",
    },
    {
      name: "Saúde",
      valor: data.cons_6_health || 0,
      fill: "#ef4444",
    },
    {
      name: "Educação",
      valor: data.cons_7_education || 0,
      fill: "#8b5cf6",
    },
  ];

  // Adicionar categoria específica do segmento se existir
  const segmentCategories = segmentCategoryMap[segment.toLowerCase()] || [];
  for (const category of segmentCategories) {
    const value = data[category.key] as number || 0;
    if (value > 0) {
      chartData.push({
        name: category.label,
        valor: value,
        fill: category.color,
      });
    }
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
            <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
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

