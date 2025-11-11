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
import { Clock, Trash2, Database } from "lucide-react";
import { getFromCache, saveToCache, getCacheStats, clearAllCache, getCacheSize } from "@/services/spaceCache";
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
  
  // Modos de análise: 'radius' | 'point' | 'area' | null
  type AnalysisMode = 'radius' | 'point' | 'area' | null;
  const [activeMode, setActiveMode] = useState<AnalysisMode>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(1000); // Raio pré-selecionado em metros

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
      // Ativar modo radius automaticamente ao buscar endereço
      setActiveMode('radius');
      
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
      
      // Tentar buscar do cache primeiro
      const cachedData = getFromCache(lat, lng, currentRadius);
      if (cachedData) {
        console.log('[MapShell] Usando dados do cache (address)');
        setSpaceData(cachedData);
        setSpaceLoading(false);
        toast.success('Dados carregados do cache!', {
          description: 'Dados salvos anteriormente',
          icon: <Database className="w-4 h-4" />,
        });
        return;
      }
      
      fetch(`/api/space?lat=${lat}&lng=${lng}&radius=${currentRadius}`)
        .then((res) => res.json())
        .then((response) => {
          if (response.ok && response.data) {
            setSpaceData(response.data);
            // Salvar no cache
            saveToCache(lat, lng, currentRadius, response.data);
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
      // Só permite clicar se algum modo estiver ativo
      if (!activeMode) return;
      
      const { lngLat } = e;
      const newMarker = { lat: lngLat.lat, lng: lngLat.lng };
      
      // MODO: Consultar Raio
      if (activeMode === 'radius') {
        setMarker(newMarker);
        setRadius([selectedRadius]); // Atualizar radius para selectedRadius

        // Update circle on map
        const map = mapRef.current?.getMap();
        if (map) {
          upsertAnalysisCircle({
            map,
            center: [newMarker.lng, newMarker.lat],
            radiusMeters: selectedRadius,
          });
        }

        // Fetch space data
        setSpaceLoading(true);
        setSpaceError(null);
        
        // Tentar buscar do cache primeiro
        const cachedData = getFromCache(newMarker.lat, newMarker.lng, selectedRadius);
        if (cachedData) {
          setSpaceData(cachedData);
          setSpaceLoading(false);
          toast.success('Dados carregados do cache!', {
            icon: <Database className="w-4 h-4" />,
          });
          
          const newPoint: AnalysisPoint = {
            lat: newMarker.lat,
            lng: newMarker.lng,
            address: address || `${newMarker.lat.toFixed(5)}, ${newMarker.lng.toFixed(5)}`,
            segment,
            radius: selectedRadius,
            timestamp: Date.now(),
          };
          
          const updatedHistory = [newPoint, ...analysisHistory.filter(
            p => !(Math.abs(p.lat - newPoint.lat) < 0.0001 && Math.abs(p.lng - newPoint.lng) < 0.0001)
          )].slice(0, 5);
          
          setAnalysisHistory(updatedHistory);
          localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
          return;
        }
        
        try {
          const url = `/api/space?lat=${newMarker.lat}&lng=${newMarker.lng}&radius=${selectedRadius}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
          }
          
          const result = await response.json();
          
          if (result.ok && result.data) {
            setSpaceData(result.data);
            saveToCache(newMarker.lat, newMarker.lng, selectedRadius, result.data);
            toast.success("Dados carregados com sucesso!");
            
            const newPoint: AnalysisPoint = {
              lat: newMarker.lat,
              lng: newMarker.lng,
              address: address || `${newMarker.lat.toFixed(5)}, ${newMarker.lng.toFixed(5)}`,
              segment,
              radius: selectedRadius,
              timestamp: Date.now(),
            };
            
            const updatedHistory = [newPoint, ...analysisHistory.filter(
              p => !(Math.abs(p.lat - newPoint.lat) < 0.0001 && Math.abs(p.lng - newPoint.lng) < 0.0001)
            )].slice(0, 5);
            
            setAnalysisHistory(updatedHistory);
            localStorage.setItem('analysisHistory', JSON.stringify(updatedHistory));
          } else {
            const errorMsg = result.message || 'Erro ao buscar dados da localização';
            setSpaceError(errorMsg);
            toast.error(errorMsg);
          }
        } catch (err: any) {
          const errorMsg = err?.message || 'Erro ao buscar dados';
          setSpaceError(errorMsg);
          toast.error('Erro ao buscar dados da localização', {
            description: errorMsg,
          });
        } finally {
          setSpaceLoading(false);
        }
      }
      
      // MODO: Adicionar Ponto
      else if (activeMode === 'point') {
        setMarker(newMarker);
        toast.success('Ponto adicionado!');
      }
      
      // MODO: Desenhar Área
      else if (activeMode === 'area') {
        toast.info('Funcionalidade em desenvolvimento');
      }
    },
    [activeMode, selectedRadius, address, segment, analysisHistory]
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
            cursor={activeMode ? "crosshair" : "grab"}
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

          {/* Menu de modos de análise */}
          <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 space-y-1">
            <div className="text-xs font-semibold text-gray-500 px-2 py-1">MODOS DE ANÁLISE</div>
            
            {/* Modo: Consultar Raio */}
            <button
              onClick={() => setActiveMode(activeMode === 'radius' ? null : 'radius')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeMode === 'radius'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth="2" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
              Consulte um raio
            </button>
            
            {/* Modo: Adicionar Ponto */}
            <button
              onClick={() => setActiveMode(activeMode === 'point' ? null : 'point')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeMode === 'point'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Adicione um ponto
            </button>
            
            {/* Modo: Desenhar Área */}
            <button
              onClick={() => setActiveMode(activeMode === 'area' ? null : 'area')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeMode === 'area'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M3 3l7 7m4 4l7 7M3 21l7-7m4-4l7-7" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Desenhe uma área
            </button>
          </div>
          
          {/* Painel de opções do modo ativo */}
          {activeMode === 'radius' && (
            <div className="absolute top-4 left-56 z-10 bg-white rounded-lg shadow-lg p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2">SELECIONE O RAIO</div>
              <div className="flex gap-2">
                {[500, 1000, 1500, 2000, 3000, 5000].map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRadius(r)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      selectedRadius === r
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {r >= 1000 ? `${r/1000}km` : `${r}m`}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-2">Clique no mapa para analisar</div>
            </div>
          )}
          
          {activeMode === 'point' && (
            <div className="absolute top-4 left-56 z-10 bg-white rounded-lg shadow-lg p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2">ADICIONAR PONTO</div>
              <div className="text-xs text-gray-600">Clique no mapa para adicionar um marcador</div>
            </div>
          )}
          
          {activeMode === 'area' && (
            <div className="absolute top-4 left-56 z-10 bg-white rounded-lg shadow-lg p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2">DESENHAR ÁREA</div>
              <div className="text-xs text-gray-600">Clique para criar vértices do polígono</div>
            </div>
          )}

          {/* Botão de estatísticas de cache */}
          <div className="absolute top-20 right-4 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white shadow-lg">
                  <Database className="w-4 h-4 mr-2" />
                  Cache
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-2 py-2">
                  <div className="text-sm font-medium mb-2">Estatísticas do Cache</div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Hits:</span>
                      <span className="font-medium">{getCacheStats().hits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Misses:</span>
                      <span className="font-medium">{getCacheStats().misses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de acerto:</span>
                      <span className="font-medium">
                        {getCacheStats().hits + getCacheStats().misses > 0
                          ? Math.round((getCacheStats().hits / (getCacheStats().hits + getCacheStats().misses)) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entradas:</span>
                      <span className="font-medium">{getCacheSize().storage}</span>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    clearAllCache();
                    toast.success('Cache limpo com sucesso!');
                  }}
                  className="text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Cache
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Dropdown de histórico */}
          {analysisHistory.length > 0 && (
            <div className="absolute top-32 right-4 z-10">
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
                        
                        // Recarregar dados (tentar cache primeiro)
                        const cachedHistoryData = getFromCache(point.lat, point.lng, point.radius);
                        if (cachedHistoryData) {
                          setSpaceData(cachedHistoryData);
                          toast.success('Análise restaurada do cache!', {
                            icon: <Database className="w-4 h-4" />,
                          });
                        } else {
                          setSpaceLoading(true);
                          fetch(`/api/space?lat=${point.lat}&lng=${point.lng}&radius=${point.radius}`)
                            .then(res => res.json())
                            .then(response => {
                              if (response.ok && response.data) {
                                setSpaceData(response.data);
                                saveToCache(point.lat, point.lng, point.radius, response.data);
                                toast.success('Análise restaurada!');
                              }
                              setSpaceLoading(false);
                            })
                            .catch(() => {
                              setSpaceLoading(false);
                              toast.error('Erro ao restaurar análise');
                            });
                        }
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

