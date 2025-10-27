import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Users, DollarSign, Home, TrendingUp, TrendingDown,
  Baby, User, Users as UsersIcon, Briefcase, Heart
} from "lucide-react";

interface SidePanelSpaceProps {
  data: any;
  onSaveArea?: () => void;
  onGenerateStudy?: () => void;
  onBack?: () => void;
  onExportCSV?: () => void;
  competitors?: any[];
  loading?: boolean;
}

export default function SidePanelSpace({ data, onSaveArea, onGenerateStudy, onBack, onExportCSV, competitors, loading }: SidePanelSpaceProps) {
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

  // Formatar números (para habitantes - sem casas decimais, sem compact)
  const formatNumber = (value: number) => {
    if (!value) return '0';
    return new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'standard',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value}%`;
  };

  const censusChange = parseFloat(data.census_change || 0);
  const incomeRate = parseFloat(data.income_rate || 0);
  const householdsGrowth = parseFloat(data.households_growth || 0);

  // Calcular domicílios (aproximado)
  const households = Math.round((data.people || 0) / 2.8);

  // Calcular densidade hab/hectare
  const radiusKm = (data.radius || 1500) / 1000;
  const areaHectares = Math.PI * radiusKm * radiusKm * 100;
  const density = (data.people || 0) / areaHectares;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{data.muni || 'Localização'}</h2>
          </div>
          {data._mock && (
            <Badge variant="secondary" className="text-xs">
              ⚠️ Dados mockados
            </Badge>
          )}
        </div>
        {onBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="w-full"
          >
            ← Voltar para controles
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Cards principais - 3 colunas */}
        <div className="grid grid-cols-3 gap-3">
          {/* Card Habitantes */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1">
                <Users className="w-5 h-5 text-orange-600" />
                {censusChange !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${censusChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {censusChange > 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="font-medium">{formatPercent(censusChange)}</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-orange-900">{formatNumber(data.people || 0)}</div>
              <div className="text-xs text-orange-700 font-medium">Habitantes ⓘ</div>
              <div className="text-xs text-orange-600 mt-1">
                {density.toFixed(2)} hab/hectare densidade
              </div>
            </CardContent>
          </Card>

          {/* Card Renda */}
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1">
                <DollarSign className="w-5 h-5 text-teal-600" />
                {incomeRate !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${incomeRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {incomeRate > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="font-medium">{formatPercent(incomeRate)}</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-teal-900">{formatCurrency(data.income || 0)}</div>
              <div className="text-xs text-teal-700 font-medium">Renda ⓘ</div>
            </CardContent>
          </Card>

          {/* Card Domicílios */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-1">
                <Home className="w-5 h-5 text-blue-600" />
                {householdsGrowth !== 0 && (
                  <div className={`flex items-center gap-1 text-xs ${householdsGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {householdsGrowth > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span className="font-medium">{formatPercent(householdsGrowth)}</span>
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-blue-900">{formatNumber(households)}</div>
              <div className="text-xs text-blue-700 font-medium">domicílios - Cresceu 27.8% ↑</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Classes Sociais */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {[
                { name: 'A++', value: data.class_a1 || 0, color: 'bg-purple-500', width: ((data.class_a1 || 0) / (data.people || 1)) * 100 },
                { name: 'A+', value: data.class_a2 || 0, color: 'bg-blue-500', width: ((data.class_a2 || 0) / (data.people || 1)) * 100 },
                { name: 'A', value: data.class_b1 || 0, color: 'bg-green-500', width: ((data.class_b1 || 0) / (data.people || 1)) * 100 },
                { name: 'B', value: data.class_b2 || 0, color: 'bg-lime-500', width: ((data.class_b2 || 0) / (data.people || 1)) * 100 },
                { name: 'C', value: data.class_c || 0, color: 'bg-yellow-500', width: ((data.class_c || 0) / (data.people || 1)) * 100 },
                { name: 'D', value: data.class_d || 0, color: 'bg-orange-500', width: ((data.class_d || 0) / (data.people || 1)) * 100 },
                { name: 'E', value: data.class_e || 0, color: 'bg-red-500', width: ((data.class_e || 0) / (data.people || 1)) * 100 },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-8 text-xs font-medium text-right">{item.name}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className={`${item.color} h-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all`}
                      style={{ width: `${Math.max(item.width, 5)}%` }}
                    >
                      {item.value > 0 && formatNumber(item.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ícones Demográficos */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Baby, label: 'Bebês', value: data.age_babies || 0, subtext: '3.4%' },
                { icon: User, label: 'Crianças', value: data.age_kids || 0, subtext: '16.7%' },
                { icon: UsersIcon, label: 'Adolescentes', value: data.age_teens || 0, subtext: '3k' },
                { icon: Briefcase, label: 'Adultos', value: data.age_adults || 0, subtext: '21.2%' },
                { icon: User, label: 'Jovens', value: data.age_young_adults || 0, subtext: '1.8k' },
                { icon: UsersIcon, label: 'Meia-idade', value: data.age_middle_age || 0, subtext: '4k' },
                { icon: Heart, label: 'Idosos', value: data.age_young_elderly || 0, subtext: '2.3k' },
                { icon: Heart, label: 'Idosos+', value: data.age_elderly || 0, subtext: '443' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
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

        {/* Card Idosos + Família Destaque */}
        <div className="flex gap-2 items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">🧓</span>
            <span className="font-medium">Idosos • Família Destaque ⓘ</span>
          </div>
        </div>

        {/* Card Potencial de Consumo - Destaque Laranja */}
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(data.consumer || 0).replace('R$', 'R$').replace(',00', '')} MI
            </div>
            <div className="text-sm font-medium opacity-90">potencial de consumo mensal</div>
          </CardContent>
        </Card>

        {/* Lista de Categorias de Consumo */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              {[
                { icon: '❤️', label: 'Assistência à saúde', value: data.cons_6_health || 1620000, percent: '8.7%' },
                { icon: '🛡️', label: 'Plano/Seguro saúde', value: data.cons_health_insurance || 588000, percent: '3.1%' },
                { icon: '🏥', label: 'Consulta médica', value: data.cons_medical || 74200, percent: '0.4%' },
                { icon: '❤️', label: 'Assistência à saúde', value: data.cons_6_health || 1620000, percent: '8.7%' },
                { icon: '📚', label: 'Exames diversos', value: data.cons_exams || 32900, percent: '0.2%' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
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

        {/* Seção de Concorrentes */}
        {competitors && competitors.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Concorrentes Próximos ({competitors.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {competitors.map((competitor, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-blue-100 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{competitor.name}</p>
                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {competitor.address}
                        </p>
                      </div>
                      {competitor.rating && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                          <span className="text-xs font-semibold text-yellow-800">★ {competitor.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    {competitor.userRatingsTotal && (
                      <p className="text-xs text-gray-500">({competitor.userRatingsTotal} avaliações)</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botões de ação */}
        <div className="flex gap-2 sticky bottom-0 bg-background pt-2 pb-2">
          <Button
            onClick={onSaveArea}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            💾 Salvar área
          </Button>
          <Button
            onClick={onGenerateStudy}
            className="flex-1"
            disabled={loading}
          >
            📋 Gerar Estudo
          </Button>
        </div>
      </div>
    </div>
  );
}

