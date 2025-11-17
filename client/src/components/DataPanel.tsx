import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { memo } from "react";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { getConsumptionKey, getConsumptionLabel } from "@/lib/segmentConfig";
import SegmentConsumptionChart from "./SegmentConsumptionChart";
import ConsumptionCategoriesChart from "./ConsumptionCategoriesChart";
import type { SpaceData } from "@/services/spaceClient";

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

interface SpaceDataClass {
  sigla: string;
  domicilios: number;
  pct: number;
}

interface SpaceDataAge {
  chave: string;
  rotulo: string;
  valor: number;
}

interface SpaceDataTotals {
  consumo_total: number;
}

interface DataPanelProps {
  data: {
    head: SpaceDataHead;
    totals: SpaceDataTotals;
    categorias: SpaceDataCategory[];
    classes?: SpaceDataClass[];
    faixas?: SpaceDataAge[];
    [key: string]: any; // Para acessar campos dinâmicos como cons_8_recreation
  } | null;
  loading?: boolean;
  segment?: string; // Segmento selecionado
}

const CLASS_COLORS = ["#ff6b6b", "#ee5a6f", "#f78fb3", "#ffa502", "#ffd93d", "#6bcf7f", "#4d96ff"];
const AGE_COLORS = ["#ff6b6b", "#4ecdc4", "#45b7d1", "#f9ca24", "#6c5ce7", "#a29bfe", "#fd79a8", "#fdcb6e"];

// Tradução de faixas etárias
const ageLabels: { [key: string]: string } = {
  age_babies: "Bebês (0-3)",
  age_kids: "Crianças (4-11)",
  age_teens: "Adolescentes (12-17)",
  age_young_adults: "Jovens Adultos (18-34)",
  age_adults: "Adultos (35-49)",
  age_middle_age: "Meia Idade (50-64)",
  age_young_eldery: "Idosos Jovens (65-74)",
  age_eldery: "Idosos (75+)",
};

function DataPanel({ data, loading, segment }: DataPanelProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {/* Skeleton para cards principais */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 animate-pulse rounded-lg h-24"></div>
          ))}
        </div>
        {/* Skeleton para gráfico */}
        <div className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
        <div className="bg-gray-200 animate-pulse rounded-lg h-48"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado carregado</h3>
        <p className="text-sm text-gray-500">Busque um endereço ou clique no mapa para visualizar dados demográficos</p>
      </div>
    );
  }

  const { head, totals, classes, faixas } = data;

  // Calcular densidade populacional (head.people já está em milhares, converter para habitantes)
  const inhabitants = head.people * 1000; // Converter de milhares para habitantes
  const density = inhabitants > 0 ? (inhabitants / 1.5).toFixed(2) : "0";

  // Preparar dados para gráfico de classe social
  const classData = (classes || []).map((cls) => ({
    name: cls.sigla,
    value: cls.domicilios,
    pct: cls.pct,
  }));

  // Preparar dados para gráfico de faixa etária
  const ageData = (faixas || []).map((age) => ({
    name: ageLabels[age.chave] || age.rotulo,
    value: age.valor,
  }));

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Cards de Informações Principais */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Visão Geral</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Habitantes</p>
                <p className="text-2xl font-bold text-orange-900">
                  {Math.round(inhabitants).toLocaleString("pt-BR")}
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
                  R$ {(head.income * 1000).toLocaleString("pt-BR", {
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
                  R$ {(totals.consumo_total / 1000000).toFixed(1).replace('.', ',')}
                  M
                </p>
                <p className="text-xs text-blue-600">Total na área</p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Gráficos de Classe Social e Faixa Etária */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição Demográfica</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Classe Social */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-lg">Distribuição por Classe Social</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={classData}
                  cx="40%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, pct }) => pct >= 5 ? `${name} ${pct.toFixed(1)}%` : ""}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {classData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CLASS_COLORS[index % CLASS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    `${(value as number).toLocaleString("pt-BR")} domicílios`
                  }
                />
                <Legend 
                  layout="vertical" 
                  align="right" 
                  verticalAlign="middle"
                  formatter={(value, entry) => {
                    const pct = ((entry.payload.value / classData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
                    return `${value} ${pct}%`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Faixa Etária */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm md:text-lg">Distribuição por Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 9 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value) =>
                    `${(value as number).toLocaleString("pt-BR")} pessoas`
                  }
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Gráfico de Categorias de Consumo */}
      {data && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Análise de Consumo</h2>
          <div className="overflow-x-auto">
            <ConsumptionCategoriesChart
              data={data as SpaceData}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(DataPanel);

