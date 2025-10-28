import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp } from "lucide-react";
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
  } | null;
  loading?: boolean;
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
    <div className="space-y-4">
      {/* Cards de Informações Principais */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Gráficos de Classe Social e Faixa Etária */}
      <div className="grid grid-cols-2 gap-4">
        {/* Gráfico de Classe Social */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Classe Social</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={classData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, pct }) => `${name} ${pct.toFixed(1)}%`}
                  outerRadius={80}
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
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Faixa Etária */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição por Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
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
  );
}

