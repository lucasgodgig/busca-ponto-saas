import { memo } from 'react';
import { MIN_RADIUS, MAX_RADIUS } from '@shared/constants';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';

type AnalysisMode = 'radius' | 'point' | 'area' | null;

interface LeftPanelProps {
  radius: number[];
  onRadiusChange: (value: number[]) => void;
  segment: string;
  onSegmentChange: (value: string) => void;
  loading?: boolean;
  onReset?: () => void;
  onNavigateHome?: () => void;
  hasAddress?: boolean;
  onAnalyze?: () => void;
  activeMode: AnalysisMode;
  onModeChange: (mode: AnalysisMode) => void;
  selectedRadius: number;
  onSelectedRadiusChange: (radius: number) => void;
}

const SEGMENTS = [
  { value: 'academia', label: 'Academia' },
  { value: 'petshop', label: 'PetShop' },
  { value: 'farmacia', label: 'Farmácia' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'outros', label: 'Outros' },
];

export default function LeftPanel({
  radius,
  onRadiusChange,
  segment,
  onSegmentChange,
  loading = false,
  onReset,
  onNavigateHome,
  hasAddress = false,
  onAnalyze,
  activeMode,
  onModeChange,
  selectedRadius,
  onSelectedRadiusChange,
}: LeftPanelProps) {
  return (
    <div className="w-full md:w-80 bg-white shadow-lg flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <button
        onClick={() => {
          // Limpar input
          const input = document.querySelector('input[placeholder*="Buscar endereço"]') as HTMLInputElement;
          if (input) {
            input.value = "";
          }
          // Resetar mapa em vez de navegar
          if (onReset) {
            onReset();
          }
        }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 border-b hover:from-blue-700 hover:to-blue-800 transition text-left cursor-pointer"
      >
        <p className="text-sm text-blue-100">Mapa Interativo</p>
      </button>

      {/* Content */}
      <div className="flex-1 p-2 md:p-4 space-y-3 md:space-y-6">
        {/* Modos de Análise */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Modos de Análise</CardTitle>
            <CardDescription className="text-xs">
              Selecione como deseja analisar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Modo: Consultar Raio */}
            <button
              onClick={() => onModeChange(activeMode === 'radius' ? null : 'radius')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeMode === 'radius'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
              Consulte um raio
            </button>
            
            {/* Seleção de Raio (apenas quando modo radius ativo) */}
            {activeMode === 'radius' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-xs font-semibold text-blue-900 mb-2">Selecione o Raio</div>
                <div className="grid grid-cols-3 gap-2">
                  {[500, 1000, 1500, 2000, 3000, 5000].map(r => (
                    <button
                      key={r}
                      onClick={() => onSelectedRadiusChange(r)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                        selectedRadius === r
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {r >= 1000 ? `${r/1000}km` : `${r}m`}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Modo: Adicionar Ponto */}
            <button
              onClick={() => onModeChange(activeMode === 'point' ? null : 'point')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeMode === 'point'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Adicione um ponto
            </button>
            
            {/* Modo: Desenhar Área */}
            <button
              onClick={() => onModeChange(activeMode === 'area' ? null : 'area')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeMode === 'area'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 3l7 7m4 4l7 7M3 21l7-7m4-4l7-7" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Desenhe uma área
            </button>
          </CardContent>
        </Card>

        {/* Botão de Análise */}
        {hasAddress && onAnalyze && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <button
                onClick={onAnalyze}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Analisar Localização
                  </>
                )}
              </button>
              <p className="text-xs text-green-700 mt-2 text-center">
                Clique para gerar análise completa
              </p>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        {loading && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">Carregando dados...</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-4 bg-gray-50 text-xs text-gray-500">
        {hasAddress ? (
          <p className="text-green-600 font-medium">✓ Endereço selecionado. Ajuste o raio e clique em "Analisar".</p>
        ) : (
          <p>Busque um endereço acima para começar</p>
        )}
      </div>
    </div>
  );
}

