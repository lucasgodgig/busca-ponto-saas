import { useState, useCallback, useRef } from "react";
import Map, { MapRef, Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SidePanelSpace from "@/components/SidePanelSpace";

interface MapShellProps {
  tenantId: number;
  onQuickQuery: (lat: number, lng: number, radius: number) => Promise<any>;
  loading?: boolean;
}

export default function MapShell({ tenantId, onQuickQuery, loading = false }: MapShellProps) {
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

  // Estado das camadas
  const [layers, setLayers] = useState({
    demografia: true,
    renda: true,
    fluxo: true,
    concorrencia: true,
  });

  // Estado dos resultados
  const [queryResult, setQueryResult] = useState<any>(null);

  // Hook para buscar endereço
  const utils = trpc.useUtils();

  // Buscar endereço usando Google Places API
  const handleSearchAddress = useCallback(async () => {
    if (!searchAddress.trim()) {
      toast.error("Digite um endereço para buscar");
      return;
    }

    setSearching(true);
    try {
      const result = await utils.client.places.searchAddress.query({ query: searchAddress });

      if (!result) {
        toast.error("Endereço não encontrado");
        return;
      }

      // Atualizar viewport e marcador
      setViewport({
        latitude: result.lat,
        longitude: result.lng,
        zoom: 15,
      });
      setMarker({ lat: result.lat, lng: result.lng });

      // Centralizar mapa
      mapRef.current?.flyTo({
        center: [result.lng, result.lat],
        zoom: 15,
        duration: 1000,
      });

      toast.success("Endereço encontrado!");
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      toast.error("Erro ao buscar endereço");
    } finally {
      setSearching(false);
    }
  }, [searchAddress, utils]);

  // Executar consulta rápida
  const handleQuickQuery = useCallback(async () => {
    if (!marker) {
      toast.error("Clique no mapa para definir um local");
      return;
    }

    try {
      const result = await onQuickQuery(marker.lat, marker.lng, radius[0]);
      
      // Buscar concorrentes se houver segmento definido
      let competitors: any[] = [];
      if (businessSegment.trim()) {
        try {
          competitors = await utils.client.places.searchCompetitors.query({
            lat: marker.lat,
            lng: marker.lng,
            radius: radius[0],
            businessType: businessSegment,
          });
        } catch (err) {
          console.error("Erro ao buscar concorrentes:", err);
        }
      }
      
      setQueryResult({ ...result, competitors });
      toast.success("Consulta realizada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar consulta");
    }
  }, [marker, radius, businessSegment, onQuickQuery, utils]);

  // Adicionar marcador ao clicar no mapa
  const handleMapClick = useCallback((event: any) => {
    const { lngLat } = event;
    setMarker({
      lat: lngLat.lat,
      lng: lngLat.lng,
    });
  }, []);

  return (
    <div className="flex h-screen">
      {/* Mapa - 60% da tela */}
      <div className="w-[60%] relative">
        <Map
          ref={mapRef}
          {...viewport}
          onMove={(evt) => setViewport(evt.viewState)}
          onClick={handleMapClick}
          style={{ width: "100%", height: "100%" }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        >
          {marker && (
            <Marker latitude={marker.lat} longitude={marker.lng}>
              <MapPin className="w-8 h-8 text-primary fill-primary/20" />
            </Marker>
          )}
        </Map>

        {/* Badge de coordenadas */}
        {marker && (
          <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg border">
            <p className="text-xs font-mono">
              {marker.lat.toFixed(5)}, {marker.lng.toFixed(5)}
            </p>
          </div>
        )}
      </div>

      {/* Painel lateral - 40% da tela */}
      <div className="w-[40%] bg-muted/30 flex flex-col h-full">
        {queryResult && queryResult.data ? (
          <SidePanelSpace
            data={queryResult.data}
            loading={loading}
            competitors={queryResult.competitors}
            onBack={() => setQueryResult(null)}
            onSaveArea={() => {
              toast.success("Área salva com sucesso!");
            }}
            onGenerateStudy={() => {
              toast.info("Redirecionando para criar estudo...");
              // TODO: Redirecionar para página de novo estudo
            }}
          />
        ) : (
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Busca de endereço */}
          <Card>
            <CardHeader>
              <CardTitle>Buscar Localização</CardTitle>
              <CardDescription>Digite um endereço ou CEP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Av. Paulista, 1000, São Paulo"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchAddress()}
                />
                <Button
                  onClick={handleSearchAddress}
                  disabled={searching}
                  size="icon"
                >
                  {searching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Ou clique no mapa para definir um ponto
              </p>
            </CardContent>
          </Card>

          {/* Raio de análise */}
          <Card>
            <CardHeader>
              <CardTitle>Raio de Análise</CardTitle>
              <CardDescription>
                {radius[0]}m ({(radius[0] / 1000).toFixed(1)}km)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Slider
                value={radius}
                onValueChange={setRadius}
                min={500}
                max={5000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>500m</span>
                <span>5km</span>
              </div>
            </CardContent>
          </Card>

          {/* Segmento do negócio */}
          <Card>
            <CardHeader>
              <CardTitle>Segmento do Negócio</CardTitle>
              <CardDescription>Digite o tipo de negócio para buscar concorrentes</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Ex: padaria, farmácia, restaurante"
                value={businessSegment}
                onChange={(e) => setBusinessSegment(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-2">
                💡 Será usado para buscar concorrentes próximos
              </p>
            </CardContent>
          </Card>

          {/* Camadas */}
          <Card>
            <CardHeader>
              <CardTitle>Camadas de Dados</CardTitle>
              <CardDescription>Selecione as informações a visualizar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="demografia">Demografia</Label>
                <Switch
                  id="demografia"
                  checked={layers.demografia}
                  onCheckedChange={(checked) =>
                    setLayers({ ...layers, demografia: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="renda">Renda</Label>
                <Switch
                  id="renda"
                  checked={layers.renda}
                  onCheckedChange={(checked) =>
                    setLayers({ ...layers, renda: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="fluxo">Fluxo de Pessoas</Label>
                <Switch
                  id="fluxo"
                  checked={layers.fluxo}
                  onCheckedChange={(checked) =>
                    setLayers({ ...layers, fluxo: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="concorrencia">Concorrência</Label>
                <Switch
                  id="concorrencia"
                  checked={layers.concorrencia}
                  onCheckedChange={(checked) =>
                    setLayers({ ...layers, concorrencia: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Botão de consulta rápida */}
          <Button
            onClick={handleQuickQuery}
            disabled={!marker || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Consultando...
              </>
            ) : (
              "Executar Consulta Rápida"
            )}
          </Button>

          {/* Informações */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  💡 <strong>Dica:</strong> Clique no mapa para definir um ponto de análise
                </p>
                <p>
                  📊 As consultas são debitadas do seu plano mensal
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </div>
  );
}

