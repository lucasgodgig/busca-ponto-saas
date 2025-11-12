import { useState, useRef, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
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

export interface MapShellRef {
  resetMap: () => void;
}

const MapShell = forwardRef<MapShellRef, MapShellProps>(({ tenantId, loading = false, onNavigateHome }, ref) => {
  const mapRef = useRef<MapRef>(null);

  // Função de reset exposta para componentes pais
  useImperativeHandle(ref, () => ({
    resetMap: () => {
      // Limpar todos os estados
      console.log('[MapShell] Resetando mapa...');
      setMarker(null);
      setAddress("");
      setRadius([DEFAULT_RADIUS]);
      setSelectedRadius(DEFAULT_RADIUS);
      setSpaceData(null);
      setSpaceError(null);
      setAnalysisMode(false);
      setActiveMode(null);
      setSavedPoints([]); // Limpar pontos salvos
      setPolygonVertices([]);
      setIsDrawingPolygon(false);
      setContextMenuPoint(null);
      setContextMenuPosition(null);
      
      // Limpar círculo do mapa
      clearAnalysisCircle();
      
      console.log('[MapShell] Mapa resetado com sucesso');
      toast.success('Mapa limpo!', {
        description: 'Todas as marcações foram removidas',
      });
    },
  }));
  const themeCleanupRef = useRef<(() => void) | null>(null);


  const [viewport, setViewport] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
    zoom: 11,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>("");
  const [radius, setRadius] = useState([DEFAULT_RADIUS]);
  const [selectedRadius, setSelectedRadius] = useState<number>(DEFAULT_RADIUS); // Raio pré-selecionado em metros

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
  
  // Pontos adicionados manualmente (modo "Adicionar Ponto")
  type SavedPoint = {
    id: string;
    lat: number;
    lng: number;
    name?: string;
  };
  const [savedPoints, setSavedPoints] = useState<SavedPoint[]>([]);
  const [contextMenuPoint, setContextMenuPoint] = useState<SavedPoint | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Polígonos desenhados (modo "Desenhar Área")
  const [polygonVertices, setPolygonVertices] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);

  // Função para calcular área do polígono usando algoritmo de Shoelace geodésico
  const calculatePolygonArea = useCallback((vertices: Array<{ lat: number; lng: number }>): number => {
    if (vertices.length < 3) return 0;

    // Converter lat/lng para coordenadas planas (projeção Web Mercator simplificada)
    // 1 grau de latitude ≈ 111.32 km
    // 1 grau de longitude varia com latitude: 111.32 * cos(lat)
    const toMeters = (lat: number, lng: number) => {
      const latMeters = lat * 111320; // metros por grau de latitude
      const lngMeters = lng * 111320 * Math.cos(lat * Math.PI / 180); // ajustado pela latitude
      return { x: lngMeters, y: latMeters };
    };

    // Converter todos os vértices para metros
    const points = vertices.map(v => toMeters(v.lat, v.lng));

    // Algoritmo de Shoelace para calcular área
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }

    return Math.abs(area / 2); // Retorna área em m²
  }, []);

  // Calcular área atual do polígono
  const polygonArea = useMemo(() => {
    return calculatePolygonArea(polygonVertices);
  }, [polygonVertices, calculatePolygonArea]);

  // Formatar área para exibição (m² ou km²)
  const formatArea = useCallback((areaM2: number): string => {
    if (areaM2 === 0) return 'calculando...';
    if (areaM2 >= 1000000) {
      return `${(areaM2 / 1000000).toFixed(2)} km²`;
    }
    return `${areaM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²`;
  }, []);

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

      // Centralizar mapa no endereço usando flyTo para animação suave
      const map = mapRef.current?.getMap();
      if (map) {
        map.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1500, // Animação de 1.5 segundos
        });
        
        // Update circle on map com selectedRadius
        upsertAnalysisCircle({
          map,
          center: [lng, lat],
          radiusMeters: selectedRadius,
        });
      }
      
      // Atualizar viewport (fallback se flyTo não funcionar)
      setViewport({
        latitude: lat,
        longitude: lng,
        zoom: 14,
      });

      // Atualizar radius com selectedRadius
      setRadius([selectedRadius]);

      // Mostrar toast informando que o usuário pode ajustar o raio
      toast.info('Endereço encontrado!', {
        description: 'Ajuste o raio e clique no botão "Analisar Localização"',
        duration: 4000,
      });
    },
    [selectedRadius]
  );

  // Handle analyze current location (from button)
  const handleAnalyzeCurrentLocation = useCallback(async () => {
    if (!marker) {
      toast.error('Nenhuma localização selecionada');
      return;
    }

    // Update circle on map with current radius
    const map = mapRef.current?.getMap();
    if (map) {
      upsertAnalysisCircle({
        map,
        center: [marker.lng, marker.lat],
        radiusMeters: radius[0],
      });
    }

    // Fetch space data
    setSpaceLoading(true);
    setSpaceError(null);
    
    // Tentar buscar do cache primeiro
    const cachedData = getFromCache(marker.lat, marker.lng, radius[0]);
    if (cachedData) {
      setSpaceData(cachedData);
      setSpaceLoading(false);
      toast.success('Dados carregados do cache!', {
        icon: <Database className="w-4 h-4" />,
      });
      
      const newPoint: AnalysisPoint = {
        lat: marker.lat,
        lng: marker.lng,
        address: address || `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}`,
        segment,
        radius: radius[0],
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
      const url = `/api/space?lat=${marker.lat}&lng=${marker.lng}&radius=${radius[0]}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }
      
      const result = await response.json();
      
      if (result.ok && result.data) {
        setSpaceData(result.data);
        saveToCache(marker.lat, marker.lng, radius[0], result.data);
        toast.success("Dados carregados com sucesso!");
        
        const newPoint: AnalysisPoint = {
          lat: marker.lat,
          lng: marker.lng,
          address: address || `${marker.lat.toFixed(5)}, ${marker.lng.toFixed(5)}`,
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
        setSpaceError(result.error || 'Erro desconhecido');
        toast.error('Erro ao carregar dados');
      }
    } catch (err: any) {
      setSpaceError(err.message || 'Erro ao carregar dados');
      toast.error('Erro ao carregar dados', {
        description: err.message,
      });
    } finally {
      setSpaceLoading(false);
    }
  }, [marker, radius, address, segment, analysisHistory]);

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
        const newPoint: SavedPoint = {
          id: `point-${Date.now()}`,
          lat: newMarker.lat,
          lng: newMarker.lng,
        };
        setSavedPoints(prev => [...prev, newPoint]);
        toast.success('Ponto adicionado! Clique com botão direito para opções');
      }
      
      // MODO: Desenhar Área
      else if (activeMode === 'area') {
        // Verificar se clicou perto do primeiro ponto para fechar polígono (mínimo 3 vértices)
        if (polygonVertices.length >= 2) {
          const firstVertex = polygonVertices[0];
          const distance = Math.sqrt(
            Math.pow(newMarker.lat - firstVertex.lat, 2) + 
            Math.pow(newMarker.lng - firstVertex.lng, 2)
          );
          
          // Se clicar a menos de 0.005 graus (~500m) do primeiro ponto, fechar polígono
          if (distance < 0.005) {
            setIsDrawingPolygon(false);
            toast.success(`Polígono fechado com ${polygonVertices.length} vértices!`, {
              description: 'Clique em "Analisar Área" para ver os dados',
            });
            return; // Não adicionar novo vértice, apenas fechar
          }
        }
        
        // Adicionar novo vértice
        const newVertex = { lat: newMarker.lat, lng: newMarker.lng };
        setPolygonVertices(prev => [...prev, newVertex]);
        setIsDrawingPolygon(true);
        
        if (polygonVertices.length === 0) {
          toast.info('Clique para adicionar vértices. Clique próximo ao primeiro ponto para fechar.');
        } else {
          toast.info(`Vértice ${polygonVertices.length + 1} adicionado`);
        }
      }
    },
    [activeMode, selectedRadius, address, segment, analysisHistory, polygonVertices]
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

  // Detectar query param reset e limpar mapa
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldReset = urlParams.get('reset');
    
    if (shouldReset) {
      console.log('[MapShell] Reset detectado via query param');
      // Limpar todos os estados
      setMarker(null);
      setAddress("");
      setRadius([DEFAULT_RADIUS]);
      setSelectedRadius(DEFAULT_RADIUS);
      setSpaceData(null);
      setSpaceError(null);
      setAnalysisMode(false);
      setActiveMode(null);
      setSavedPoints([]);
      setPolygonVertices([]);
      setIsDrawingPolygon(false);
      setContextMenuPoint(null);
      setContextMenuPosition(null);
      
      // Limpar círculo do mapa (se mapa já estiver pronto)
      const map = mapRef.current?.getMap();
      if (map) {
        clearAnalysisCircle(map);
      }
      
      // Remover o query param da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      toast.success('Mapa limpo!', {
        description: 'Todas as marcações foram removidas',
        duration: 2000,
      });
    }
  }, []); // Roda apenas uma vez ao montar

  // Update circle when selectedRadius changes (modo radius ativo)
  useEffect(() => {
    if (marker && activeMode === 'radius') {
      const map = mapRef.current?.getMap();
      if (map) {
        upsertAnalysisCircle({
          map,
          center: [marker.lng, marker.lat],
          radiusMeters: selectedRadius,
        });
      }
      // Atualizar radius também
      setRadius([selectedRadius]);
    }
  }, [selectedRadius, marker, activeMode]);

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
          hasAddress={!!marker}
          onAnalyze={handleAnalyzeCurrentLocation}
          activeMode={activeMode}
          onModeChange={setActiveMode}
          selectedRadius={selectedRadius}
          onSelectedRadiusChange={setSelectedRadius}
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
          <AddressSearch 
            onAddressSelect={handleAddressSelect} 
            onInputChange={(value) => {
              // Limpar dados quando usuário digita novo endereço
              if (value && spaceData) {
                setSpaceData(null);
              }
            }}
            loading={spaceLoading} 
          />
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
            
            {/* Vértices do polígono sendo desenhado */}
            {polygonVertices.map((vertex, index) => (
              <Marker
                key={`vertex-${index}`}
                longitude={vertex.lng}
                latitude={vertex.lat}
                anchor="center"
              >
                <div className="relative">
                  {/* Quadrado branco com borda azul, como na referência */}
                  <div className="w-4 h-4 bg-white border-2 border-blue-500 shadow-lg" />
                  {index === 0 && polygonVertices.length > 0 && isDrawingPolygon && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                      Clique aqui para fechar
                    </div>
                  )}
                </div>
              </Marker>
            ))}
            
            {/* Markers dos pontos salvos */}
            {savedPoints.map(point => (
              <Marker
                key={point.id}
                longitude={point.lng}
                latitude={point.lat}
                anchor="bottom"
              >
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuPoint(point);
                    setContextMenuPosition({ x: e.clientX, y: e.clientY });
                  }}
                  className="w-6 h-6 bg-green-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>
              </Marker>
            ))}
            
            {/* Marcadores dos vértices do polígono */}
            {polygonVertices.map((vertex, index) => (
              <Marker
                key={`polygon-vertex-${index}`}
                longitude={vertex.lng}
                latitude={vertex.lat}
                anchor="center"
              >
                <div
                  className="w-3 h-3 bg-white rounded-full border-2 border-blue-600 shadow-md cursor-pointer hover:scale-125 transition-transform"
                  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  onClick={(e) => {
                    e.stopPropagation(); // Evita propagação para handleMapClick
                    // Se clicar no primeiro marcador E já tem pelo menos 2 vértices, fechar polígono
                    if (index === 0 && polygonVertices.length >= 2 && isDrawingPolygon) {
                      setIsDrawingPolygon(false);
                      toast.success(`Polígono fechado com ${polygonVertices.length} vértices!`, {
                        description: 'Clique em "Analisar Área" para ver os dados',
                      });
                    }
                  }}
                />
              </Marker>
            ))}
            
            {/* Linhas do polígono */}
            {polygonVertices.length > 1 && (
              <>
                <Source
                  id="polygon-lines"
                  type="geojson"
                  data={{
                    type: 'FeatureCollection',
                    features: [{
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'LineString',
                        coordinates: polygonVertices.map(v => [v.lng, v.lat]),
                      },
                    }],
                  }}
                >
                  <Layer
                    id="polygon-lines-layer"
                    type="line"
                    paint={{
                      'line-color': isDrawingPolygon ? '#3b82f6' : '#10b981', // Azul durante desenho, verde quando fechado
                      'line-width': 3,
                    }}
                  />
                </Source>
                
                {/* Linha de fechamento (do último vértice ao primeiro) */}
                {!isDrawingPolygon && polygonVertices.length >= 3 && (
                  <Source
                    id="polygon-closing-line"
                    type="geojson"
                    data={{
                      type: 'FeatureCollection',
                      features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                          type: 'LineString',
                          coordinates: [
                            [polygonVertices[polygonVertices.length - 1].lng, polygonVertices[polygonVertices.length - 1].lat],
                            [polygonVertices[0].lng, polygonVertices[0].lat],
                          ],
                        },
                      }],
                    }}
                  >
                    <Layer
                      id="polygon-closing-line-layer"
                      type="line"
                      paint={{
                        'line-color': '#10b981', // Verde para linha de fechamento
                        'line-width': 3,
                      }}
                    />
                  </Source>
                )}
                
                {/* Preenchimento do polígono fechado */}
                {!isDrawingPolygon && polygonVertices.length >= 3 && (
                  <Source
                    id="polygon-fill"
                    type="geojson"
                    data={{
                      type: 'FeatureCollection',
                      features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                          type: 'Polygon',
                          coordinates: [[...polygonVertices.map(v => [v.lng, v.lat]), [polygonVertices[0].lng, polygonVertices[0].lat]]],
                        },
                      }],
                    }}
                  >
                    <Layer
                      id="polygon-fill-layer"
                      type="fill"
                      paint={{
                        'fill-color': '#10b981', // Verde para preenchimento
                        'fill-opacity': 0.25,
                      }}
                    />
                  </Source>
                )}
              </>
            )}

          </Map>

          {/* Menu movido para LeftPanel */}
            

          

          
          {activeMode === 'area' && (
            <div className="absolute top-4 left-56 z-10 bg-white rounded-lg shadow-lg p-3 space-y-2">
              <div className="text-xs font-semibold text-gray-500">DESENHAR ÁREA</div>
              <div className="text-xs text-gray-600 mb-2 space-y-1">
                <div>
                  {polygonVertices.length === 0 
                    ? 'Clique no mapa para iniciar o polígono'
                    : `${polygonVertices.length} vértice(s) adicionado(s)`
                  }
                </div>
                {polygonVertices.length > 0 && (
                  <div className="font-semibold text-blue-600">
                    Área: {formatArea(polygonArea)}
                  </div>
                )}
              </div>
              {polygonVertices.length > 0 && (
                <div className="flex flex-col gap-2">
                  {/* Botões de controle do polígono */}
                  <div className="flex gap-2">
                    {isDrawingPolygon ? (
                      <button
                        onClick={() => {
                          if (polygonVertices.length >= 3) {
                            setIsDrawingPolygon(false);
                            toast.success(`Polígono fechado com ${polygonVertices.length} vértices!`);
                          } else {
                            toast.error('Mínimo de 3 vértices necessários');
                          }
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        Fechar Polígono
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          // Usar análise real de polígono
                          setSpaceLoading(true);
                          setSpaceError(null);
                          
                          try {
                            const response = await fetch('/api/space/polygon', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                polygon: polygonVertices,
                              }),
                            });
                            
                            const result = await response.json();
                            
                            if (result.ok && result.data) {
                              setSpaceData(result.data);
                              
                              // Mostrar informações sobre a análise
                              const meta = result.meta;
                              toast.success('Análise da área concluída!', {
                                description: meta ? `${meta.polygon} | Raio: ${Math.round(meta.queryRadius)}m` : undefined,
                              });
                            } else {
                              setSpaceError(result.error || 'Erro ao analisar área');
                              toast.error('Erro ao analisar área');
                            }
                          } catch (err: any) {
                            setSpaceError(err.message || 'Erro ao analisar área');
                            toast.error('Erro ao analisar área', {
                              description: err.message,
                            });
                          } finally {
                            setSpaceLoading(false);
                          }
                        }}
                        disabled={spaceLoading}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {spaceLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Analisando...
                          </>
                        ) : (
                          'Analisar Área'
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setPolygonVertices([]);
                        setIsDrawingPolygon(false);
                        toast.info('Polígono limpo');
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-medium hover:bg-red-700 transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                  
                  {/* Informação adicional quando polígono está fechado */}
                  {!isDrawingPolygon && (
                    <div className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                      Polígono fechado. Clique em "Analisar Área" para ver os dados.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Indicador de Modo Ativo */}
          {activeMode && (
            <div className="absolute top-4 right-4 z-10">
              <div className={`bg-white rounded-lg shadow-lg px-4 py-2 border-l-4 ${
                activeMode === 'radius' ? 'border-blue-600' :
                activeMode === 'point' ? 'border-green-600' :
                'border-purple-600'
              }`}>
                <div className="flex items-center gap-2">
                  {activeMode === 'radius' && (
                    <>
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="8" strokeWidth="2" />
                        <circle cx="12" cy="12" r="2" fill="currentColor" />
                      </svg>
                      <div>
                        <div className="text-xs font-semibold text-blue-900">Modo: Consultar Raio</div>
                        <div className="text-xs text-blue-600">
                          Raio: {selectedRadius >= 1000 ? `${selectedRadius/1000}km` : `${selectedRadius}m`}
                        </div>
                      </div>
                    </>
                  )}
                  {activeMode === 'point' && (
                    <>
                      <MapPin className="w-4 h-4 text-green-600" />
                      <div>
                        <div className="text-xs font-semibold text-green-900">Modo: Adicionar Ponto</div>
                        <div className="text-xs text-green-600">Clique no mapa para marcar</div>
                      </div>
                    </>
                  )}
                  {activeMode === 'area' && (
                    <>
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 3l7 7m4 4l7 7M3 21l7-7m4-4l7-7" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <div>
                        <div className="text-xs font-semibold text-purple-900">Modo: Desenhar Área</div>
                        <div className="text-xs text-purple-600">
                          {polygonVertices.length === 0 
                            ? 'Clique para iniciar' 
                            : `${polygonVertices.length} vértice(s)`
                          }
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
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
                      key={`analysis-${point.timestamp}-${idx}`}
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
                          {point.radius}m • {new Date(point.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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

          {/* Menu contextual para pontos salvos */}
          {contextMenuPoint && contextMenuPosition && (
            <>
              {/* Overlay para fechar menu ao clicar fora */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => {
                  setContextMenuPoint(null);
                  setContextMenuPosition(null);
                }}
              />
              
              <div
                className="fixed z-30 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[200px]"
                style={{
                  left: `${contextMenuPosition.x}px`,
                  top: `${contextMenuPosition.y}px`,
                }}
              >
                <button
                  onClick={() => {
                    window.open(`https://www.google.com/maps?q=${contextMenuPoint.lat},${contextMenuPoint.lng}`, '_blank');
                    setContextMenuPoint(null);
                    setContextMenuPosition(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir no Google Maps
                </button>
                
                <button
                  onClick={() => {
                    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${contextMenuPoint.lat},${contextMenuPoint.lng}`, '_blank');
                    setContextMenuPoint(null);
                    setContextMenuPosition(null);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Street View
                </button>
                
                <div className="border-t border-gray-200 my-1" />
                
                <div className="px-4 py-1 text-xs font-semibold text-gray-500">Consultar raios</div>
                
                {[500, 1000, 1500, 2000, 3000, 5000].map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      // Ativar modo radius, definir raio e fazer análise
                      setActiveMode('radius');
                      setSelectedRadius(r);
                      setRadius([r]);
                      setMarker({ lat: contextMenuPoint.lat, lng: contextMenuPoint.lng });
                      
                      // Atualizar círculo
                      const map = mapRef.current?.getMap();
                      if (map) {
                        upsertAnalysisCircle({
                          map,
                          center: [contextMenuPoint.lng, contextMenuPoint.lat],
                          radiusMeters: r,
                        });
                      }
                      
                      // Buscar dados
                      setSpaceLoading(true);
                      setSpaceError(null);
                      
                      const cachedData = getFromCache(contextMenuPoint.lat, contextMenuPoint.lng, r);
                      if (cachedData) {
                        setSpaceData(cachedData);
                        setSpaceLoading(false);
                        toast.success('Dados carregados do cache!', {
                          icon: <Database className="w-4 h-4" />,
                        });
                      } else {
                        fetch(`/api/space?lat=${contextMenuPoint.lat}&lng=${contextMenuPoint.lng}&radius=${r}`)
                          .then(res => res.json())
                          .then(result => {
                            if (result.ok && result.data) {
                              setSpaceData(result.data);
                              saveToCache(contextMenuPoint.lat, contextMenuPoint.lng, r, result.data);
                              toast.success('Dados carregados com sucesso!');
                            }
                            setSpaceLoading(false);
                          })
                          .catch(() => {
                            setSpaceLoading(false);
                            toast.error('Erro ao buscar dados');
                          });
                      }
                      
                      setContextMenuPoint(null);
                      setContextMenuPosition(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    {r >= 1000 ? `${r/1000}km` : `${r}m`}
                  </button>
                ))}
                
                <div className="border-t border-gray-200 my-1" />
                
                <button
                  onClick={() => {
                    setSavedPoints(prev => prev.filter(p => p.id !== contextMenuPoint.id));
                    setContextMenuPoint(null);
                    setContextMenuPosition(null);
                    toast.success('Ponto removido');
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover ponto
                </button>
              </div>
            </>
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
});

MapShell.displayName = 'MapShell';

export default MapShell;
