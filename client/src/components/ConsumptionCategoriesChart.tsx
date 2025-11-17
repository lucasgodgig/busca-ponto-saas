import { memo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
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
}

// Removido: filtro de segmento - agora mostra TODAS as categorias

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

function ConsumptionCategoriesChart({
  data,
}: ConsumptionCategoriesChartProps) {
  if (!data || !data.categorias) {
    return null;
  }

  // Categorias a serem excluídas do gráfico
  const EXCLUDED_CATEGORIES = ['cons_9_tobacco', 'cons_11_debt_reduction'];
  
  // Mostrar TODAS as categorias de consumo (sem filtro de segmento), exceto as excluídas
  const chartData = data.categorias
    .filter(cat => cat.valor > 0 && !EXCLUDED_CATEGORIES.includes(cat.chave)) // Filtrar categorias indesejadas
    .map(cat => ({
      name: cat.rotulo,
      valor: cat.valor || 0,
      fill: CATEGORY_COLORS[cat.chave] || "#3b82f6",
      chave: cat.chave,
    }))
    .sort((a, b) => b.valor - a.valor); // Ordenar por valor decrescente

  // Se não há dados, retornar null
  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm md:text-lg">Potencial de Consumo por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value) => {
                const millions = (value as number) / 1000000;
                return [`R$ ${millions.toFixed(1)}M`, 'Potencial'];
              }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
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
        <div className="mt-2 md:mt-4 grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-2 text-xs">
          {chartData.map((category, index) => (
            <div key={index} className="flex items-center gap-1">
              <div
                className="w-2 h-2 md:w-3 md:h-3 rounded"
                style={{ backgroundColor: category.fill }}
              />
              <span className="text-gray-600 truncate">{category.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(ConsumptionCategoriesChart);

