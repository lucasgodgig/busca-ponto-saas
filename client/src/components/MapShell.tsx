import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { debounce } from "lodash-es";
import { MAX_RADIUS, DEFAULT_RADIUS, DEBOUNCE_SLIDER_MS } from "@shared/constants";
import Map, { MapRef, Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import LeftPanel from "@/components/LeftPanel";
import DataPanel from "@/components/DataPanel";
import AddressSearch from "@/components/AddressSearch";
import { PDFReport } from "@/components/PDFReport";
import { upsertAnalysisCircle, clearAnalysisCircle } from "@/lib/mapCircle";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Clock, Trash2 } from "lucide-react";
import type { SpaceData } from "@/services/spaceClient";

interface MapShellProps {
  tenantId: number;
  loading?: boolean;
  onNavigateHome?: () => void;
}

export default function MapShell({ tenantId, loading = false, onNavigateHome }: MapShellProps) {
  const mapRef = useRef<MapRef>(null);
  const themeCleanupRef = useRef<(() => void) | null>(null);


  const [viewport, setViewport] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
    zoom: 11,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [radius, setRadius] = useState([DEFAULT_RADIUS]);

  // Debounced radius change handler
  const debouncedRadiusChange = useMemo(
    () => debounce((newRadius: number[]) => {
      setRadius(newRadius);
    }, DEBOUNCE_SLIDER_MS),
    []
  );
  const [segment, setSegment] = useState("academia");
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState(false);

  // Histórico de pontos analisados (últimos 5)
  type AnalysisPoint = {
    lat: number;
    lng: number;
    address: string;
    segment: string;
    radius: number;
    timestamp: number;
  };
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisPoint[]>(() => {
    const saved = localStorage.getItem('analysisHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Handle address selection
  const handleAddressSelect = useCallback(
    (lat: number, lng: number, addressStr: string) => {
      // Ativar modo de análise automaticamente ao buscar endereço
      setAnalysisMode(true);
      
      const newMarker = { lat, lng };
      setMarker(newMarker);
      setAddress(addressStr);

      // Update circle on map
      const map = mapRef.current?.getMap();
      if (map) {
        upsertAnalysisCircle({
          map,
          center: [lng, lat],
          radiusMeters: radius[0],
        });
      }

      // Validar raio
      const currentRadius = radius[0];
      if (currentRadius > MAX_RADIUS) {
        toast.error(`Raio máximo permitido: ${MAX_RADIUS}m`);
        return;
      }

      // Fetch space data
      setSpaceLoading(true);
      setSpaceError(null);
      fetch(`/api/space?lat=${lat}&lng=${lng}&radius=${currentRadius}`)
        .then((res) => res.json())
        .then((response) => {
          if (response.ok && response.data) {
            setSpaceData(response.data);
          } else {
            setSpaceError(response.error || 'Erro ao buscar dados');
          }
          setSpaceLoading(false);
        })
        .catch((err) => {
          console.error('[MapShell] Erro ao buscar dados:', err);
          const errorMsg = err.message || 'Erro ao buscar dados da localização';
          setSpaceError(errorMsg);
          toast.error(errorMsg, {
            description: 'Verifique se as variáveis de ambiente estão configuradas em Settings → Secrets',
            duration: 5000,
          });
          setSpaceLoading(false);
        });
    },
    [radius]
  );

  // Handle map click
  const handleMapClick = useCallback(
    async (e: any) => {
      // Só permite clicar se o modo de análise estiver ativo
      if (!analysisMode) return;
      
      const { lngLat } = e;
      const newMarker = { lat: lngLat.lat, lng: lngLat.lng };
      setMarker(newMarker);

      // Update circle on map
      const map = mapRef.current?.getMap();
      if (map) {
        upsertAnalysisCircle({
          map,
          center: [newMarker.lng, newMarker.lat],
          radiusMeters: radius[0],
        });
      }

      // Fetch space data
      setSpaceLoading(true);
      setSpaceError(null);
      
      try {
        const url = `/api/space?lat=${newMarker.lat}&lng=${newMarker.lng}&radius=${radius[0]}`;
        console.log('[MapShell] Fetching:', url);
        const response = await fetch(url);
        console.log('[MapShell] Response status:', response.status, response.ok);
        
        if (!response.ok) {
          const text = await response.text();
          console.error('[MapShell] Error response:', text);
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
        }
        
        const result = await response.json();
        console.log('[MapShell] Result:', result);
        
        if (result.ok && result.data) {
          setSpaceData(result.data);
          toast.success("Dados carregados com sucesso!");
          
          // Adicionar ao histórico
          const newPoint: AnalysisPoint = {
            lat: newMarker.lat,
            lng: newMarker.lng,
            address: address || `${newMarker.lat.toFixed(5)}, ${newMarker.lng.toFixed(5)}`,
            segment,
            radius: radius[0],
            timestamp: Date.now(),
          };
          
          const updatedHistory = [newPoint, ...analysisHistory.filter(
            p => !(Math.abs(p.lat - newPoint.lat) < 0.0001 && Math.abs(p.lng - newPoint.lng) < 0.0001)
          )].slice(0, 5);
          
          setAnalysisHistory(updatedHistory);
          localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
        } else {
          const errorMsg = result.error === 'CONFIG_MISSING' 
            ? 'API não configurada. Configure as variáveis em Settings → Secrets'
            : result.message || 'Erro ao buscar dados da localização';
          setSpaceError(errorMsg);
          toast.error(errorMsg, {
            description: result.error === 'CONFIG_MISSING' ? 'SPACE_API_BASE_URL e SPACE_API_KEY' : undefined,
            duration: 5000,
          });
        }
      } catch (err: any) {
        console.error('[MapShell] Catch error:', err);
        const errorMsg = err?.message || 'Erro ao buscar dados';
        setSpaceError(errorMsg);
        toast.error('Erro ao buscar dados da localização', {
          description: errorMsg,
          duration: 5000,
        });
      } finally {
        setSpaceLoading(false);
      }
    },
    [analysisMode, radius, address, segment, analysisHistory]
  );

  // Update circle when radius changes
  useEffect(() => {
    if (marker) {
      const map = mapRef.current?.getMap();
      if (map) {
        upsertAnalysisCircle({
          map,
          center: [marker.lng, marker.lat],
          radiusMeters: radius[0],
        });
      }
    }
  }, [radius, marker]);

  // Handle reset
  const handleReset = useCallback(() => {
    setMarker(null);
    setSpaceData(null);
    setSpaceError(null);
    clearAnalysisCircle(mapRef.current?.getMap());

  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-100">
      {/* Left Panel - Hidden on mobile, visible on desktop */}
      <div className="hidden md:flex md:w-64 md:border-r border-gray-200 h-auto overflow-y-auto">
        <LeftPanel
          radius={radius}
          onRadiusChange={debouncedRadiusChange}
          segment={segment}
          onSegmentChange={setSegment}
          loading={spaceLoading}
          onReset={handleReset}
          onNavigateHome={onNavigateHome}
        />
      </div>

      {/* Map Container - Full screen on mobile */}
      <div className="flex-1 flex flex-col relative h-screen md:h-auto">
        {/* Header with search and mobile controls */}
        <div className="flex flex-col gap-0.5 md:gap-3 bg-white border-b p-1.5 md:p-4 sticky top-0 z-40">
          {/* Mobile segment selector */}
          <div className="md:hidden">
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              disabled={spaceLoading}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="academia">Academia</option>
              <option value="petshop">PetShop</option>
              <option value="farmacia">Farmácia</option>
              <option value="delivery">Delivery</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          {/* Mobile radius slider */}
          <div className="md:hidden">
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-xs font-medium text-gray-700">Raio</label>
              <span className="text-xs text-gray-600">{radius[0]}m</span>
            </div>
            <Slider
              value={radius}
              onValueChange={setRadius}
              min={500}
              max={5000}
              step={100}
              disabled={spaceLoading}
              className="w-full"
            />
          </div>
          <AddressSearch onAddressSelect={handleAddressSelect} loading={spaceLoading} />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            ref={mapRef}
            initialViewState={viewport}
            onMove={(evt) => setViewport(evt.viewState)}
            onClick={handleMapClick}
            style={{ width: "100%", height: "100%" }}
            cursor={analysisMode ? "crosshair" : "grab"}
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          >
            {marker && (
              <Marker
                longitude={marker.lng}
                latitude={marker.lat}
                anchor="bottom"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
              </Marker>
            )}
          </Map>

          {/* Botão de modo de análise */}
          <div className="absolute top-4 right-4 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setAnalysisMode(!analysisMode)}
                  className={`px-4 py-2 rounded-lg shadow-lg font-medium transition-all ${
                    analysisMode
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                  }`}
                >
                  {analysisMode ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Modo Análise Ativo
                    </span>
                  ) : (
                    "Ativar Análise"
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{analysisMode ? "Clique no mapa para selecionar um ponto" : "Ative para selecionar pontos no mapa"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Dropdown de histórico */}
          {analysisHistory.length > 0 && (
            <div className="absolute top-20 right-4 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white shadow-lg">
                    <Clock className="w-4 h-4 mr-2" />
                    Histórico ({analysisHistory.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {analysisHistory.map((point, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={() => {
                        setMarker({ lat: point.lat, lng: point.lng });
                        setAddress(point.address);
                        setSegment(point.segment);
                        setRadius([point.radius]);
                        setViewport({
                          latitude: point.lat,
                          longitude: point.lng,
                          zoom: 14,
                        });
                        
                        // Restaurar círculo
                        const map = mapRef.current?.getMap();
                        if (map) {
                          upsertAnalysisCircle({
                            map,
                            center: [point.lng, point.lat],
                            radiusMeters: point.radius,
                          });
                        }
                        
                        // Recarregar dados
                        setSpaceLoading(true);
                        fetch(`/api/space?lat=${point.lat}&lng=${point.lng}&radius=${point.radius}`)
                          .then(res => res.json())
                          .then(response => {
                            if (response.ok && response.data) {
                              setSpaceData(response.data);
                              toast.success('Análise restaurada!');
                            }
                            setSpaceLoading(false);
                          })
                          .catch(() => {
                            setSpaceLoading(false);
                            toast.error('Erro ao restaurar análise');
                          });
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-1 w-full">
                        <div className="text-sm font-medium truncate">{point.address}</div>
                        <div className="text-xs text-muted-foreground">
                          {point.segment} • {point.radius}m • {new Date(point.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setAnalysisHistory([]);
                      localStorage.removeItem('analysisHistory');
                      toast.success('Histórico limpo!');
                    }}
                    className="text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Limpar Histórico
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Loading overlay */}
          {spaceLoading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
              <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium">Carregando dados...</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel at bottom */}
        {(spaceData || spaceLoading) && (
          <div className="bg-white border-t shadow-lg p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Analise de Dados</h3>
              {spaceData && (
                <PDFReport address={address} segment={segment} data={spaceData} />
              )}
            </div>
            <DataPanel data={spaceData} loading={spaceLoading} segment={segment} />
          </div>
        )}

        {/* Error message */}
        {spaceError && !spaceLoading && (
          <div className="bg-red-50 border-t border-red-200 p-4 text-red-700">
            {spaceError}
          </div>
        )}
      </div>
    </div>
  );
}

