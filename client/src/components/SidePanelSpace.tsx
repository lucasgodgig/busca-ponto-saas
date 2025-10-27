import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, DollarSign, TrendingUp, TrendingDown, Building2 } from "lucide-react";

interface SidePanelSpaceProps {
  data: any;
  onSaveArea?: () => void;
  onGenerateStudy?: () => void;
  loading?: boolean;
}

export default function SidePanelSpace({ data, onSaveArea, onGenerateStudy, loading }: SidePanelSpaceProps) {
  console.log("SidePanelSpace - data received:", data);

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Clique no mapa e execute uma consulta para ver os dados</p>
        </div>
      </div>
    );
  }

  // Formatar números
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value || 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value || 0);
  };

  const censusChange = parseFloat(data.census_change || 0);
  const incomeRate = parseFloat(data.income_rate || 0);

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4">
      {/* Header com localização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {data.muni || 'Localização'}
          </CardTitle>
          {data._mock && (
            <CardDescription className="text-xs">
              <Badge variant="secondary" className="text-xs">
                ⚠️ Dados mockados (API não configurada)
              </Badge>
            </CardDescription>
          )}
        </CardHeader>
      </Card>

      {/* Card de Habitantes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Habitantes</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold">{formatNumber(data.people || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Censo 2010
              </div>
            </div>
            {censusChange !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${censusChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {censusChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(censusChange)}%
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Densidade:</span>
              <span className="font-medium">{formatNumber(data.density || 0)} hab/hac</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card de Renda */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Renda Média</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold">{formatCurrency(data.income || 0)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                por domicílio/mês (2025)
              </div>
            </div>
            {incomeRate !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${incomeRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {incomeRate > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(incomeRate)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card de Potencial de Consumo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Potencial de Consumo</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">{formatCurrency(data.consumer || 0)}</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Alimentação:</span>
              <span className="font-medium">{formatCurrency(data.cons_1_food || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Habitação:</span>
              <span className="font-medium">{formatCurrency(data.cons_2_housing || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vestuário:</span>
              <span className="font-medium">{formatCurrency(data.cons_3_clothing || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transporte:</span>
              <span className="font-medium">{formatCurrency(data.cons_4_transport || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classes Sociais */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição por Classe Social</CardTitle>
          <CardDescription className="text-xs">Quantidade de pessoas por classe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: 'Classe A1', value: data.class_a1 || 0, color: 'bg-green-500' },
              { name: 'Classe A2', value: data.class_a2 || 0, color: 'bg-green-400' },
              { name: 'Classe B1', value: data.class_b1 || 0, color: 'bg-blue-500' },
              { name: 'Classe B2', value: data.class_b2 || 0, color: 'bg-blue-400' },
              { name: 'Classe C', value: data.class_c || 0, color: 'bg-yellow-500' },
              { name: 'Classe D', value: data.class_d || 0, color: 'bg-orange-500' },
              { name: 'Classe E', value: data.class_e || 0, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${item.color}`}></div>
                <span className="text-sm flex-1">{item.name}</span>
                <span className="text-sm font-medium">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Faixas Etárias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Distribuição por Faixa Etária</CardTitle>
          <CardDescription className="text-xs">Habitantes segmentados por idade</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bebês (0-2):</span>
              <span className="font-medium">{formatNumber(data.age_babies || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Crianças (3-11):</span>
              <span className="font-medium">{formatNumber(data.age_kids || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adolescentes (12-17):</span>
              <span className="font-medium">{formatNumber(data.age_teens || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Jovens (18-24):</span>
              <span className="font-medium">{formatNumber(data.age_young_adults || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adultos (25-39):</span>
              <span className="font-medium">{formatNumber(data.age_adults || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Meia-idade (40-59):</span>
              <span className="font-medium">{formatNumber(data.age_middle_age || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Idosos (60-79):</span>
              <span className="font-medium">{formatNumber(data.age_young_elderly || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Idosos+ (80+):</span>
              <span className="font-medium">{formatNumber(data.age_elderly || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicadores Demográficos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Indicadores Demográficos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">População Ativa (20-65):</span>
            <span className="font-medium">{data.pop_active || 0}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Índice de Juventude:</span>
            <span className="font-medium">{data.pop_youngness || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Índice de Envelhecimento:</span>
            <span className="font-medium">{data.pop_oldness || 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Atividade Econômica */}
      {data.clu_N_nome && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atividade Econômica Principal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Segmento:</span>
              <span className="font-medium">{data.clu_N_nome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atividades:</span>
              <span className="font-medium">{data.clu_N_atv || 0}</span>
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
          Salvar Área
        </Button>
        <Button
          onClick={onGenerateStudy}
          className="flex-1"
          disabled={loading}
        >
          Gerar Estudo
        </Button>
      </div>
    </div>
  );
}

