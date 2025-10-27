"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { MapRef, Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { circle } from "@turf/turf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search, ArrowLeft, Zap, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SidePanelSpace from "@/components/SidePanelSpace";

interface MapShellProps {
  tenantId: number;
  loading?: boolean;
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
  const [addressLabel, setAddressLabel] = useState("São Paulo, SP");

  // Estado de busca
  const [searchAddress, setSearchAddress] = useState("");
  const [businessSegment, setBusinessSegment] = useState("");
  const [searching, setSearching] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estado do estilo do mapa
  const [mapStyle, setMapStyle] = useState<'positron' | 'voyager'>('positron');
  
  const mapStyleUrl = mapStyle === 'positron' 
    ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

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

  // Gerar círculo geodésico
  const circleData = useMemo(() => {
    if (!marker) return null;
    try {
      const circleFeature = circle([marker.lng, marker.lat], radius[0] / 1000, { units: "kilometers" });
      return circleFeature;
    } catch (error) {
      console.error("Erro ao gerar círculo:", error);
      return null;
    }
  }, [marker, radius]);

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
    const formattedAddress = address.formatted_address || address.name || "";
    
    setSearchAddress("");
    setAddressLabel(formattedAddress);
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
        segment: businessSegment || undefined,
      });

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

  // Exportar CSV
  const handleExportCSV = useCallback(() => {
    if (!competitors || competitors.length === 0) {
      toast.error("Nenhum concorrente para exportar");
      return;
    }

    const csv = [
      ["Nome", "Endereço", "Rating", "Avaliações", "Latitude", "Longitude"],
      ...competitors.map(c => [
        c.name,
        c.address,
        c.rating || "N/A",
        c.userRatingsTotal || "N/A",
        c.lat,
        c.lng,
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `concorrentes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success("CSV exportado com sucesso!");
  }, [competitors]);

  // Renderizar painel lateral
  const renderSidePanel = () => {
    if (queryResult) {
      return (
        <SidePanelSpace 
          data={queryResult?.data} 
          competitors={competitors}
          onBack={handleBack}
          onExportCSV={handleExportCSV}
        />
      );
    }

    return (
      <div className="space-y-4 overflow-y-auto h-full pb-4">
        {/* Buscar Localização */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Buscar Localização</CardTitle>
            <CardDescription className="text-xs">Digite um endereço ou CEP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Ex: Av. Paulista, 1000, São Paulo"
                value={searchAddress}
                onChange={(e) => handleSearchAddressChange(e.target.value)}
                onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                className="pr-10 border-green-200 focus:border-green-500 focus:ring-green-500"
              />
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-green-600 hover:text-green-700"
                onClick={() => handleSelectAddress({ lat: marker?.lat, lng: marker?.lng })}
              >
                <Search className="w-4 h-4" />
              </Button>
              
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {addressSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectAddress(suggestion)}
                      className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm border-b last:border-b-0"
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
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Raio de Análise</CardTitle>
            <CardDescription className="text-xs">{radius[0]}m ({(radius[0] / 1000).toFixed(2)}km)</CardDescription>
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
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Segmento do Negócio</CardTitle>
            <CardDescription className="text-xs">Digite o tipo de negócio para buscar concorrentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="text"
              placeholder="Ex: padaria, farmácia, restaurante"
              value={businessSegment}
              onChange={(e) => setBusinessSegment(e.target.value)}
              className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
            />
            <p className="text-xs text-yellow-600">⚠️ Será usado para buscar concorrentes próximos</p>
          </CardContent>
        </Card>

        {/* Estilo do Mapa */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Estilo do Mapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button
                variant={mapStyle === 'positron' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapStyle('positron')}
                className="flex-1"
              >
                Claro
              </Button>
              <Button
                variant={mapStyle === 'voyager' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMapStyle('voyager')}
                className="flex-1"
              >
                Detalhado
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Camadas de Dados */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Camadas de Dados</CardTitle>
            <CardDescription className="text-xs">Selecione as informações a visualizar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(layers).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="capitalize cursor-pointer text-sm">{key.replace("_", " ")}</Label>
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
          className="w-full h-11 text-base font-semibold bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-md"
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Executar Consulta Rápida
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex h-full gap-4 bg-gray-50">
      {/* Mapa */}
      <div className="flex-1 rounded-lg overflow-hidden shadow-lg">
        <Map
          ref={mapRef}
          initialViewState={viewport}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyleUrl}
          onMove={(evt) => setViewport(evt.viewState)}
          onClick={(e) => {
            const { lng, lat } = e.lngLat;
            setMarker({ lat, lng });
            setAddressLabel(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setSearchAddress("");
          }}
        >
          {/* Círculo Geodésico */}
          {circleData && (
            <Source id="circle-source" type="geojson" data={circleData}>
              <Layer
                id="circle-fill"
                type="fill"
                paint={{
                  "fill-color": "#4ade80",
                  "fill-opacity": 0.1,
                }}
              />
              <Layer
                id="circle-stroke"
                type="line"
                paint={{
                  "line-color": "#22c55e",
                  "line-width": 2,
                }}
              />
            </Source>
          )}

          {/* Marcador */}
          {marker && (
            <Marker
              longitude={marker.lng}
              latitude={marker.lat}
              anchor="bottom"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center cursor-move transform hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5 text-white" />
              </div>
            </Marker>
          )}

          {/* Marcadores de Concorrentes */}
          {competitors.map((competitor, idx) => (
            <Marker
              key={idx}
              longitude={competitor.lng}
              latitude={competitor.lat}
              anchor="bottom"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold hover:scale-125 transition-transform">
                {idx + 1}
              </div>
            </Marker>
          ))}
        </Map>
      </div>

      {/* Painel Lateral */}
      <div className="w-96 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 p-4 flex items-center justify-between">
          {queryResult && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="flex items-center gap-2 text-green-600 hover:text-green-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <h2 className="text-lg font-bold text-gray-800">
            {queryResult ? "Resultados da Análise" : "Análise de Localização"}
          </h2>
          {competitors.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              title="Exportar concorrentes como CSV"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {renderSidePanel()}
        </div>
      </div>
    </div>
  );
}

