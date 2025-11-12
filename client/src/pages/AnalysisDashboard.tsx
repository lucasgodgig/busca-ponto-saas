import { useState, useRef } from "react";
import { ArrowLeft, MapPin, Users, DollarSign, Home, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MapShell, { MapShellRef } from "@/components/MapShell";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface AnalysisData {
  people: number;
  income: number;
  density: number;
  consumer: number;
  class_a1: number;
  class_a2: number;
  class_b1: number;
  class_b2: number;
  class_c: number;
  class_d: number;
  class_e: number;
  age_babies: number;
  age_kids: number;
  age_teens: number;
  age_young_adults: number;
  age_adults: number;
  age_middle_age: number;
  age_young_elderly: number;
  age_elderly: number;
  census_change: number;
  income_rate: number;
  [key: string]: any;
}

const SOCIAL_CLASS_COLORS = {
  "A++": "#a855f7",
  "A+": "#3b82f6",
  "A": "#22c55e",
  "B": "#84cc16",
  "C": "#eab308",
  "D": "#f97316",
  "E": "#ef4444",
};

const AGE_GROUP_COLORS = {
  "0-2 anos": "#fca5a5",
  "3-12 anos": "#fb923c",
  "13-19 anos": "#fbbf24",
  "20-34 anos": "#86efac",
  "35-49 anos": "#4ade80",
  "50-64 anos": "#60a5fa",
  "65-79 anos": "#a78bfa",
  "80+ anos": "#e879f9",
};

export default function AnalysisDashboard() {
  const mapShellRef = useRef<MapShellRef>(null);
  
  const navigate = (path: string) => {
    window.location.href = path;
  };
  const [data, setData] = useState<AnalysisData | null>(null);
  const [socialClassData, setSocialClassData] = useState<any[]>([]);
  const [ageGroupData, setAgeGroupData] = useState<any[]>([]);

  useEffect(() => {
    // Extrair dados do sessionStorage
    const storedData = sessionStorage.getItem('analysisData');
    const state = storedData ? JSON.parse(storedData) : null;
    
    if (!state?.data) {
      if (typeof navigate === 'function') navigate("/app");
      return;
    }

    // Normalizar dados
    const normalizedData = {
      ...state.data,
      people: state.data.people || 0,
      income: state.data.income || 0,
      density: state.data.density || 0,
      consumer: state.data.consumer || 0,
      class_a1: state.data.class_a1 || 0,
      class_a2: state.data.class_a2 || 0,
      class_b1: state.data.class_b1 || 0,
      class_b2: state.data.class_b2 || 0,
      class_c: state.data.class_c || 0,
      class_d: state.data.class_d || 0,
      class_e: state.data.class_e || 0,
      age_babies: state.data.age_babies || 0,
      age_kids: state.data.age_kids || 0,
      age_teens: state.data.age_teens || 0,
      age_young_adults: state.data.age_young_adults || 0,
      age_adults: state.data.age_adults || 0,
      age_middle_age: state.data.age_middle_age || 0,
      age_young_elderly: state.data.age_young_elderly || 0,
      age_elderly: state.data.age_elderly || 0,
    };

    setData(normalizedData);

    // Preparar dados de classes sociais
    const socialClasses = [
      { name: "A++", value: normalizedData.class_a1 },
      { name: "A+", value: normalizedData.class_a2 },
      { name: "A", value: normalizedData.class_b1 },
      { name: "B", value: normalizedData.class_b2 },
      { name: "C", value: normalizedData.class_c },
      { name: "D", value: normalizedData.class_d },
      { name: "E", value: normalizedData.class_e },
    ];
    setSocialClassData(socialClasses);

    // Preparar dados de faixas etárias
    const ageGroups = [
      { name: "0-2 anos", value: normalizedData.age_babies },
      { name: "3-12 anos", value: normalizedData.age_kids },
      { name: "13-19 anos", value: normalizedData.age_teens },
      { name: "20-34 anos", value: normalizedData.age_young_adults },
      { name: "35-49 anos", value: normalizedData.age_adults },
      { name: "50-64 anos", value: normalizedData.age_middle_age },
      { name: "65-79 anos", value: normalizedData.age_young_elderly },
      { name: "80+ anos", value: normalizedData.age_elderly },
    ];
    setAgeGroupData(ageGroups);
  }, [location, navigate]);

  if (!data) {
    return null;
  }

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value || 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value || 0);

  const formatPercent = (value: number) => {
    const numeric = Number(value);
    return `${numeric > 0 ? "+" : ""}${numeric.toFixed(1)}%`;
  };

  const totalPopulation = socialClassData.reduce((sum, item) => sum + item.value, 0);
  const totalAgePopulation = ageGroupData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Mapa à esquerda */}
      <div className="w-full md:flex-1 md:border-r border-b md:border-b-0 border-gray-200 relative h-[50vh] md:h-auto">
        <MapShell ref={mapShellRef} tenantId={data?.tenantId || 0} />
      </div>

      {/* Dashboard à direita */}
      <div className="w-full md:w-[500px] overflow-y-auto h-[50vh] md:h-auto">
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 
                className="text-2xl md:text-3xl font-bold text-gray-900 cursor-pointer hover:text-primary transition-colors"
                onClick={() => mapShellRef.current?.resetMap()}
                title="Clique para limpar todas as marcações"
              >
                Mapa Interativo
              </h1>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Dashboard de dados demográficos e de mercado</p>
            </div>

          </div>

          {/* Disclaimer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Dados conectados</span> de ferramentas oficiais com base no Censo. Para informações específicas, consulte o time da Sistema Busca Ponto.
            </p>
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <Users className="w-4 md:w-5 h-4 md:h-5 text-orange-600" />
                  {data.census_change && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${data.census_change > 0 ? "text-green-600" : "text-red-600"}`}>
                      {data.census_change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercent(data.census_change)}
                    </div>
                  )}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-orange-900">{formatNumber(data.people)}</div>
                <div className="text-xs text-orange-700 font-medium mt-1">Habitantes</div>
                <div className="text-xs text-orange-600 mt-2">{data.density.toFixed(0)} hab/hectare</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <DollarSign className="w-4 md:w-5 h-4 md:h-5 text-teal-600" />
                  {data.income_rate && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${data.income_rate > 0 ? "text-green-600" : "text-red-600"}`}>
                      {data.income_rate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercent(data.income_rate)}
                    </div>
                  )}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-teal-900">{formatCurrency(data.income)}</div>
                <div className="text-xs text-teal-700 font-medium mt-1">Renda Média</div>
                <div className="text-xs text-teal-600 mt-2">Renda per capita</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start justify-between mb-2">
                  <Home className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-blue-900">{formatNumber(Math.round(data.people / 2.8))}</div>
                <div className="text-xs text-blue-700 font-medium mt-1">Domícílios</div>
                <div className="text-xs text-blue-600 mt-2">Estimados na área</div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico de Classes Sociais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 md:w-5 h-4 md:h-5" />
                  Distribuição por Classe Social
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={socialClassData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(value as number)} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                      {socialClassData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(SOCIAL_CLASS_COLORS)[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Faixas Etárias */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 md:w-5 h-4 md:h-5" />
                  Distribuição por Faixa Etária
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ageGroupData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatNumber(value as number)} />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]}>
                      {ageGroupData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={Object.values(AGE_GROUP_COLORS)[index]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Potencial de Consumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Potencial de Consumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="text-center p-2 md:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-blue-900">{formatCurrency(data.consumer)}</div>
                  <div className="text-xs text-blue-700 mt-1">Total</div>
                </div>
                <div className="text-center p-2 md:p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-purple-900">{formatCurrency(data.cons_a_total || 0)}</div>
                  <div className="text-xs text-purple-700 mt-1">Classe A</div>
                </div>
                <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-green-900">{formatCurrency(data.cons_b_current || 0)}</div>
                  <div className="text-xs text-green-700 mt-1">Classe B</div>
                </div>
                <div className="text-center p-2 md:p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg md:text-2xl font-bold text-yellow-900">{formatCurrency(data.cons_c_expenditure || 0)}</div>
                  <div className="text-xs text-yellow-700 mt-1">Classe C</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

