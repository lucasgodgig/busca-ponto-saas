"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Map, { MapRef, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SidePanelSpace from "@/components/SidePanelSpace";

interface MapShellProps {
  tenantId: number;
  loading?: boolean;
  onQuickQuery?: (lat: number, lng: number, radius: number) => Promise<any>;
}

export default function MapShell({ tenantId, loading = false }: MapShellProps) {
  const mapRef = useRef<MapRef>(null);
  
  // Estado do mapa
  const [viewport, setViewport] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
    zoom: 13,
  });

  // Estado do marcador e raio
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>({
    lat: -23.55052,
    lng: -46.633308,
  });
  const [radius, setRadius] = useState([1500]); // em metros

  // Estado de busca
  const [searchAddress, setSearchAddress] = useState("");
  const [businessSegment, setBusinessSegment] = useState("");
  const [searching, setSearching] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estado das camadas
  const [layers, setLayers] = useState({
    demografia: true,
    renda: true,
    fluxo: true,
    concorrencia: true,
  });

  // Estado dos resultados
  const [queryResult, setQueryResult] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);

  const handleSearchAddressChange = useCallback((value: string) => {
    setSearchAddress(value);
    
    if (value.length <= 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Buscar sugestões quando o valor muda
  const { data: addressData } = trpc.places.searchAddress.useQuery(
    { query: searchAddress },
    { enabled: searchAddress.length > 2 }
  );

  // Atualizar sugestões quando dados chegam
  useEffect(() => {
    if (addressData && searchAddress.length > 2) {
      setAddressSuggestions(addressData ? [addressData] : []);
      setShowSuggestions(true);
    }
  }, [addressData, searchAddress]);

  const handleSelectAddress = useCallback((address: any) => {
    const lat = address.geometry?.location?.lat || address.lat;
    const lng = address.geometry?.location?.lng || address.lng;
    
    setSearchAddress(address.formatted_address || address.name || "");
    setMarker({ lat, lng });
    setViewport({
      latitude: lat,
      longitude: lng,
      zoom: 15,
    });
    setShowSuggestions(false);

    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: 15,
      duration: 1000,
    });

    toast.success("Localização atualizada!");
  }, []);

  // Mutation para consulta rápida
  const spaceQueryMutation = trpc.space.query.useMutation({
    onSuccess: (result) => {
      setQueryResult(result);
      toast.success("Análise concluída!");
    },
    onError: (error) => {
      console.error("Erro na consulta:", error);
      toast.error("Erro ao executar análise");
    },
  });

  // Executar consulta rápida
  const handleQuickQuery = useCallback(async () => {
    if (!marker) {
      toast.error("Selecione uma localização no mapa");
      return;
    }

    setSearching(true);
    try {
      // Executar consulta à Space API
      await spaceQueryMutation.mutateAsync({
        tenantId,
        lat: marker.lat,
        lng: marker.lng,
        radius: radius[0],
      });

      // Buscar concorrentes será feito via useQuery em um useEffect separado
      // Por enquanto, apenas deixar vazio
      setCompetitors([]);
    } finally {
      setSearching(false);
    }
  }, [marker, radius, tenantId, spaceQueryMutation]);

  // Buscar concorrentes quando houver segmento
  const { data: competitorData } = trpc.places.searchCompetitors.useQuery(
    {
      lat: marker?.lat || 0,
      lng: marker?.lng || 0,
      radius: radius[0],
      businessType: businessSegment,
    },
    { enabled: !!businessSegment && !!marker }
  );

  useEffect(() => {
    if (competitorData) {
      setCompetitors(competitorData || []);
    }
  }, [competitorData]);

  // Voltar aos controles
  const handleBack = useCallback(() => {
    setQueryResult(null);
    setCompetitors([]);
  }, []);

  // Renderizar painel lateral
  const renderSidePanel = () => {
    if (queryResult) {
      return (
        <SidePanelSpace 
          data={queryResult?.data} 
          competitors={competitors}
          onBack={handleBack}
        />
      );
    }

    return (
      <div className="space-y-4 overflow-y-auto">
        {/* Buscar Localização */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Buscar Localização</CardTitle>
            <CardDescription>Digite um endereço ou CEP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ex: Av. Paulista, 1000, São Paulo"
                value={searchAddress}
                onChange={(e) => handleSearchAddressChange(e.target.value)}
                onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                className="pr-10"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => handleSelectAddress({ lat: marker?.lat, lng: marker?.lng })}
              >
                <Search className="w-4 h-4" />
              </Button>
              
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {addressSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectAddress(suggestion)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-b-0"
                    >
                      {suggestion.formatted_address || suggestion.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Ou clique no mapa para definir um ponto</p>
          </CardContent>
        </Card>

        {/* Raio de Análise */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Raio de Análise</CardTitle>
            <CardDescription>{radius[0]}m ({(radius[0] / 1000).toFixed(2)}km)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={500}
              max={5000}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>500m</span>
              <span>5km</span>
            </div>
          </CardContent>
        </Card>

        {/* Segmento do Negócio */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Segmento do Negócio</CardTitle>
            <CardDescription>Digite o tipo de negócio para buscar concorrentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="text"
              placeholder="Ex: padaria, farmácia, restaurante"
              value={businessSegment}
              onChange={(e) => setBusinessSegment(e.target.value)}
            />
            <p className="text-xs text-yellow-600">⚠️ Será usado para buscar concorrentes próximos</p>
          </CardContent>
        </Card>

        {/* Camadas de Dados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Camadas de Dados</CardTitle>
            <CardDescription>Selecione as informações a visualizar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(layers).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="capitalize cursor-pointer">{key.replace("_", " ")}</Label>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) =>
                    setLayers({ ...layers, [key]: checked })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Botão de Executar Consulta */}
        <Button
          onClick={handleQuickQuery}
          disabled={searching || !marker}
          className="w-full h-10 text-base font-semibold"
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Executar Consulta Rápida
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex h-full gap-4">
      {/* Mapa */}
      <div className="flex-1 rounded-lg overflow-hidden shadow-lg">
        <Map
          ref={mapRef}
          initialViewState={viewport}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          onMove={(evt) => setViewport(evt.viewState)}
          onClick={(e) => {
            const { lng, lat } = e.lngLat;
            setMarker({ lat, lng });
            setSearchAddress("");
          }}
        >
          {marker && (
            <Marker
              longitude={marker.lng}
              latitude={marker.lat}
              anchor="bottom"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-move">
                <MapPin className="w-4 h-4 text-white" />
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Painel Lateral */}
      <div className="w-96 bg-white rounded-lg shadow-lg p-4 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          {queryResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <h2 className="text-lg font-semibold">
            {queryResult ? "Resultados da Análise" : "Análise de Localização"}
          </h2>
        </div>
        
        {renderSidePanel()}
      </div>
    </div>
  );
}

