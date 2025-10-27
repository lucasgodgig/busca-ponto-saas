import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Users,
  DollarSign,
  Home,
  TrendingUp,
  TrendingDown,
  Baby,
  User,
  Users as UsersIcon,
  Heart,
} from "lucide-react";

interface SidePanelSpaceProps {
  data: any;
  onSaveArea?: () => void;
  onGenerateStudy?: () => void;
  onBack?: () => void;
  loading?: boolean;
  address?: string;
  radius?: number;
}

const normalizeNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "standard",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value || 0);

const formatPercent = (value: number) => {
  if (!value) return "0%";
  const numeric = Number(value);
  const formatted = Number.isFinite(numeric) ? numeric.toFixed(1) : "0.0";
  return `${numeric > 0 ? "+" : ""}${formatted}%`;
};

export default function SidePanelSpace({
  data,
  onSaveArea,
  onGenerateStudy,
  onBack,
  loading,
  address,
  radius,
}: SidePanelSpaceProps) {
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Clique no mapa e execute uma consulta para ver os dados</p>
        </div>
      </div>
    );
  }

  const censusChange = normalizeNumber(data.census_change);
  const incomeRate = normalizeNumber(data.income_rate);
  const householdsGrowth = normalizeNumber(data.households_growth);
  const people = normalizeNumber(data.people ?? data.population);
  const households = Math.max(Math.round(people / 2.8), 0);
  const areaRadius = normalizeNumber(radius ?? data.radius ?? data.area_radius ?? 1500, 1500);
  const radiusKm = areaRadius / 1000;
  const areaHectares = Math.max(Math.PI * radiusKm * radiusKm * 100, 1);
  const density = people / areaHectares;
  const consumerPotential = normalizeNumber(data.consumer ?? data.cons_a_total ?? data.cons_total);
  const incomeValue = normalizeNumber(data.income ?? data.avg_income ?? data.income_total);

  const socialClasses = [
    { name: "A++", value: normalizeNumber(data.class_a1), color: "bg-purple-500" },
    { name: "A+", value: normalizeNumber(data.class_a2), color: "bg-blue-500" },
    { name: "A", value: normalizeNumber(data.class_b1), color: "bg-green-500" },
    { name: "B", value: normalizeNumber(data.class_b2), color: "bg-lime-500" },
    { name: "C", value: normalizeNumber(data.class_c), color: "bg-yellow-500" },
    { name: "D", value: normalizeNumber(data.class_d), color: "bg-orange-500" },
    { name: "E", value: normalizeNumber(data.class_e), color: "bg-red-500" },
  ];

  const demographics = [
    { icon: Baby, label: "Bebês", value: normalizeNumber(data.age_babies), subtext: "0-3" },
    { icon: User, label: "Crianças", value: normalizeNumber(data.age_kids), subtext: "4-11" },
    { icon: UsersIcon, label: "Adolescentes", value: normalizeNumber(data.age_teens), subtext: "12-17" },
    { icon: UsersIcon, label: "Jovens", value: normalizeNumber(data.age_young_adults), subtext: "18-24" },
    { icon: User, label: "Adultos", value: normalizeNumber(data.age_adults), subtext: "25-39" },
    { icon: UsersIcon, label: "Meia-idade", value: normalizeNumber(data.age_middle_age), subtext: "40-59" },
    { icon: Heart, label: "Idosos", value: normalizeNumber(data.age_young_elderly), subtext: "60-74" },
    { icon: Heart, label: "Idosos+", value: normalizeNumber(data.age_elderly), subtext: "75+" },
  ];

  const consumptionCategories = [
    { icon: "❤️", label: "Assistência à saúde", value: normalizeNumber(data.cons_6_health), percent: "8.7%" },
    { icon: "🛡️", label: "Plano/Seguro saúde", value: normalizeNumber(data.cons_health_insurance), percent: "3.1%" },
    { icon: "🏥", label: "Consulta médica", value: normalizeNumber(data.cons_medical), percent: "0.4%" },
    { icon: "📚", label: "Exames diversos", value: normalizeNumber(data.cons_exams), percent: "0.2%" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 bg-background border-b p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{data.muni || "Localização"}</h2>
          </div>
          {data._mock && (
            <Badge variant="secondary" className="text-xs">
              ⚠️ Dados mockados
            </Badge>
          )}
        </div>
        {address ? <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{address}</p> : null}
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack} className="w-full">
            ← Voltar para controles
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1">
                <Users className="w-5 h-5 text-orange-600" />
                {censusChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${censusChange > 0 ? "text-green-600" : "text-red-600"}`}>
                    {censusChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="font-medium">{formatPercent(censusChange)}</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-orange-900">{formatNumber(people)}</div>
              <div className="text-xs text-orange-700 font-medium">Habitantes ⓘ</div>
              <div className="text-xs text-orange-600 mt-1">{density.toFixed(2)} hab/hectare densidade</div>
            </CardContent>
          </Card>

          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1">
                <DollarSign className="w-5 h-5 text-teal-600" />
                {incomeRate !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${incomeRate > 0 ? "text-green-600" : "text-red-600"}`}>
                    {incomeRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="font-medium">{formatPercent(incomeRate)}</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-teal-900">{formatCurrency(incomeValue)}</div>
              <div className="text-xs text-teal-700 font-medium">Renda ⓘ</div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1">
                <Home className="w-5 h-5 text-blue-600" />
                {householdsGrowth !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${householdsGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                    {householdsGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="font-medium">{formatPercent(householdsGrowth)}</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-blue-900">{formatNumber(households)}</div>
              <div className="text-xs text-blue-700 font-medium">domicílios estimados</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {socialClasses.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-8 text-xs font-medium text-right">{item.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`${item.color} h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all`}
                      style={{ width: `${Math.max((item.value / Math.max(people, 1)) * 100, 5)}%` }}
                    >
                      {item.value > 0 && formatNumber(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {demographics.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-xs font-medium">{formatNumber(item.value)}</div>
                  <div className="text-xs text-muted-foreground">{item.subtext}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">🧓</span>
            <span className="font-medium">Idosos • Família Destaque ⓘ</span>
          </div>
          <span className="text-xs text-muted-foreground">Raio analisado: {Math.round(areaRadius)} m</span>
        </div>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold mb-1">{formatCurrency(consumerPotential)}</div>
            <div className="text-sm font-medium opacity-90">potencial de consumo mensal</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              {consumptionCategories.map((item, idx) => (
                <div key={`${item.label}-${idx}`} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className="text-muted-foreground">{item.label}:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                    <span className="text-xs text-muted-foreground">({item.percent})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 sticky bottom-0 bg-background pt-2 pb-2">
          <Button onClick={onSaveArea} variant="outline" className="flex-1" disabled={loading}>
            💾 Salvar área
          </Button>
          <Button onClick={onGenerateStudy} className="flex-1" disabled={loading}>
            📋 Gerar Estudo
          </Button>
        </div>
      </div>
    </div>
  );
}
