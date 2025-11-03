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

  // Handle address selection
  const handleAddressSelect = useCallback(
    (lat: number, lng: number, addressStr: string) => {
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
          const errorMsg = err.message || 'Erro ao buscar dados';
          setSpaceError(errorMsg);
          toast.error(errorMsg);
          setSpaceLoading(false);
        });
    },
    [radius]
  );

  // Handle map click
  const handleMapClick = useCallback(
    async (e: any) => {
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
        const response = await fetch(`/api/space?lat=${newMarker.lat}&lng=${newMarker.lng}&radius=${radius[0]}`);
        const result = await response.json();
        
        if (result.ok && result.data) {
          setSpaceData(result.data);
          toast.success("Dados carregados com sucesso!");
        } else {
          setSpaceError("Erro ao buscar dados");
          toast.error("Erro ao buscar dados da localização");
        }
      } catch (err: any) {
        console.error("Erro ao buscar dados:", err);
        setSpaceError(err?.message || "Erro ao buscar dados");
        toast.error("Erro ao buscar dados");
      } finally {
        setSpaceLoading(false);
      }
    },
    [radius]
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

