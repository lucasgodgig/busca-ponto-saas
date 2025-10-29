import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LeftPanelProps {
  radius: number[];
  onRadiusChange: (value: number[]) => void;
  segment: string;
  onSegmentChange: (value: string) => void;
  loading?: boolean;
  onReset?: () => void;
  onNavigateHome?: () => void;
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
          // Chamar callback para navegar para home
          if (onNavigateHome) {
            onNavigateHome();
          }
        }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 border-b hover:from-blue-700 hover:to-blue-800 transition text-left cursor-pointer"
      >
        <p className="text-sm text-blue-100">Mapa Interativo</p>
      </button>

      {/* Content */}
      <div className="flex-1 p-2 md:p-4 space-y-3 md:space-y-6">
        {/* Raio de Análise */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Raio de Análise</CardTitle>
            <CardDescription className="text-xs">
              {radius[0]}m ({(radius[0] / 1000).toFixed(2)}km)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Slider
              value={radius}
              onValueChange={onRadiusChange}
              min={500}
              max={5000}
              step={100}
              disabled={loading}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>500m</span>
              <span>5km</span>
            </div>
          </CardContent>
        </Card>

        {/* Segmento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Segmento do Negócio</CardTitle>
            <CardDescription className="text-xs">
              Selecione o tipo de negócio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={segment} onValueChange={onSegmentChange} disabled={loading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um segmento" />
              </SelectTrigger>
              <SelectContent>
                {SEGMENTS.map((seg) => (
                  <SelectItem key={seg.value} value={seg.value}>
                    {seg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

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
        <p>Clique no mapa para selecionar uma localização</p>
      </div>
    </div>
  );
}

