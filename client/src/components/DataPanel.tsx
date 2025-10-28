import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Home, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface SpaceDataHead {
  people: number;
  income: number;
  consumer: number;
}

interface SpaceDataCategory {
  chave: string;
  rotulo: string;
  ordem: number;
  valor: number;
}

interface SpaceDataTotals {
  consumo_total: number;
  consumo_corrente: number;
  despesas: number;
}

interface DataPanelProps {
  data: {
    head: SpaceDataHead;
    totals: SpaceDataTotals;
    categorias: SpaceDataCategory[];
  } | null;
  loading?: boolean;
}

const CONSUMPTION_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#f9ca24",
  "#6c5ce7",
  "#a29bfe",
  "#fd79a8",
  "#fdcb6e",
];

export default function DataPanel({ data, loading }: DataPanelProps) {
  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="mt-2">Carregando dados...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500">
        Clique no mapa para carregar dados
      </div>
    );
  }

  const { head, totals, categorias } = data;

  // Preparar dados para gráfico de consumo
  const consumptionData = categorias
    .slice(0, 8)
    .map((cat) => ({
      name: cat.rotulo,
      value: cat.valor,
    }));

  // Calcular densidade populacional
  const density = head.people > 0 ? (head.people / 1.5).toFixed(2) : "0";

  return (
    <div className="space-y-4">
      {/* Cards de Informações Principais */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Habitantes</p>
                <p className="text-2xl font-bold text-orange-900">
                  {Math.round(head.people).toLocaleString("pt-BR")}
                </p>
                <p className="text-xs text-orange-600">
                  {parseFloat(density).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} hab/hectare
                </p>
              </div>
              <Users className="w-10 h-10 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Renda Média</p>
                <p className="text-2xl font-bold text-green-900">
                  R$ {head.income.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-green-600">Renda per capita</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  Potencial de Consumo
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  R$ {(totals.consumo_total / 1000000).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  M
                </p>
                <p className="text-xs text-blue-600">Total na área</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Consumo por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Consumo por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={consumptionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  `R$ ${(value / 1000000).toFixed(0)}M`
                }
              />
              <Tooltip
                formatter={(value) =>
                  `R$ ${(value as number).toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}`
                }
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resumo de Consumo */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-2">Consumo Corrente</p>
            <p className="text-2xl font-bold text-gray-900">
              R$ {(totals.consumo_corrente / 1000000).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              M
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-2">Despesas</p>
            <p className="text-2xl font-bold text-gray-900">
              R$ {(totals.despesas / 1000000).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              M
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

