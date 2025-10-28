import { useRef, useState, useCallback, useEffect } from "react";
import Map, { MapRef, Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import LeftPanel from "@/components/LeftPanel";
import DataPanel from "@/components/DataPanel";
import AddressSearch from "@/components/AddressSearch";
import { upsertAnalysisCircle, clearAnalysisCircle } from "@/lib/mapCircle";
import type { SpaceData } from "@/services/spaceClient";

interface MapShellProps {
  tenantId: number;
  loading?: boolean;
}

export default function MapShell({ tenantId, loading = false }: MapShellProps) {
  const mapRef = useRef<MapRef>(null);
  const themeCleanupRef = useRef<(() => void) | null>(null);

  const [viewport, setViewport] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
    zoom: 11,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState([1500]);
  const [segment, setSegment] = useState("academia");
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);

  // Handle address selection
  const handleAddressSelect = useCallback(
    (lat: number, lng: number, address: string) => {
      const newMarker = { lat, lng };
      setMarker(newMarker);

      // Update circle on map
      const map = mapRef.current?.getMap();
      if (map) {
        upsertAnalysisCircle({
          map,
          center: [lng, lat],
          radiusMeters: radius[0],
        });
      }

      // Fetch space data
      setSpaceLoading(true);
      setSpaceError(null);
      fetch(`/api/space?lat=${lat}&lng=${lng}&radius=${radius[0]}`)
        .then((res) => res.json())
        .then((data) => {
          setSpaceData(data);
          setSpaceLoading(false);
        })
        .catch((err) => {
          setSpaceError(err.message);
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

  return (
    <div className="flex h-screen w-full bg-gray-100">
      {/* Left Panel */}
      <LeftPanel
        radius={radius}
        onRadiusChange={setRadius}
        segment={segment}
        onSegmentChange={setSegment}
        loading={spaceLoading}
        onReset={() => {
          setMarker(null);
          setSpaceData(null);
          setSpaceError(null);
          clearAnalysisCircle(mapRef.current?.getMap());
        }}
      />

      {/* Map Container */}
      <div className="flex-1 flex flex-col relative">
        {/* Header with search and coordinates */}
        <div className="flex flex-col gap-3 bg-white border-b p-4">
          <AddressSearch onAddressSelect={handleAddressSelect} loading={spaceLoading} />
          {marker && (
            <div className="text-xs text-gray-600">
              Ponto selecionado: {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
            </div>
          )}
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
          <div className="bg-white border-t shadow-lg p-6 max-h-96 overflow-y-auto">
            <DataPanel data={spaceData} loading={spaceLoading} />
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

