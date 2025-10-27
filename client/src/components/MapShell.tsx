"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import Map, { MapRef, Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { circle } from "@turf/turf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import SidePanelSpace from "@/components/SidePanelSpace";
import { setupSpaceDataTheme, spaceDataThemeConstants } from "@/lib/spaceDataTheme";
import LocationSearch from "@/components/LocationSearch";
import CompetitorsPanel from "@/components/CompetitorsPanel";
import { GoogleBoundsLiteral } from "@/lib/google";

interface MapShellProps {
  tenantId: number;
  loading?: boolean;
}

interface AnalysisParams {
  center: { lat: number; lng: number };
  radius: number;
  segment: string;
  address?: string;
}

export default function MapShell({ tenantId, loading = false }: MapShellProps) {
  const mapRef = useRef<MapRef>(null);
  const themeCleanupRef = useRef<(() => void) | null>(null);

  const [viewport, setViewport] = useState({
    latitude: -23.55052,
    longitude: -46.633308,
    zoom: 13,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>({
    lat: -23.55052,
    lng: -46.633308,
  });
  const [radius, setRadius] = useState([1500]);

  const [searchAddress, setSearchAddress] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [businessSegment, setBusinessSegment] = useState("");
  const [searching, setSearching] = useState(false);
  const [autocompleteBounds, setAutocompleteBounds] = useState<GoogleBoundsLiteral | null>(null);

  const mapStyleUrl = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  const panelCardClass = "border border-white/60 bg-white/85 backdrop-blur-sm shadow-[0_20px_50px_-35px_rgba(13,31,79,0.45)]";

  const [layers, setLayers] = useState({
    demografia: true,
    renda: true,
    fluxo: true,
    concorrencia: true,
  });

  const [queryResult, setQueryResult] = useState<any>(null);
  const [analysisParams, setAnalysisParams] = useState<AnalysisParams | null>(null);

  const circleData = useMemo(() => {
    if (!marker) return null;
    try {
      const circleFeature = circle([marker.lng, marker.lat], radius[0] / 1000, { units: "kilometers" });
      const cleanFeature = {
        type: circleFeature.type,
        geometry: circleFeature.geometry,
        properties: {},
      };
      return {
        type: "FeatureCollection" as const,
        features: [cleanFeature],
      };
    } catch (error) {
      console.error("Erro ao gerar círculo:", error);
      return null;
    }
  }, [marker?.lat, marker?.lng, radius[0]]);

  const updateAutocompleteBounds = useCallback(() => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance) return;
    const bounds = mapInstance.getBounds();
    if (!bounds) return;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    setAutocompleteBounds({
      north: ne.lat,
      east: ne.lng,
      south: sw.lat,
      west: sw.lng,
    });
  }, [mapRef]);

  const handleLocationSelect = useCallback(
    ({ lat, lng, address }: { lat: number; lng: number; address: string }) => {
      setMarker({ lat, lng });
      setViewport((prev) => ({ ...prev, latitude: lat, longitude: lng, zoom: Math.max(prev.zoom, 15) }));
      setSelectedAddress(address);
      setSearchAddress(address);

      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: 15,
        duration: 1000,
      });

      toast.success("Localização atualizada!");
    },
    [mapRef]
  );

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

  const handleQuickQuery = useCallback(async () => {
    if (!marker) {
      toast.error("Selecione uma localização no mapa");
      return;
    }

    setSearching(true);
    const trimmedSegment = businessSegment.trim();

    try {
      await spaceQueryMutation.mutateAsync({
        tenantId,
        lat: marker.lat,
        lng: marker.lng,
        radius: radius[0],
        segment: trimmedSegment || undefined,
      });

      setAnalysisParams({
        center: { lat: marker.lat, lng: marker.lng },
        radius: radius[0],
        segment: trimmedSegment,
        address: selectedAddress || searchAddress,
      });
    } finally {
      setSearching(false);
    }
  }, [marker, radius, tenantId, businessSegment, selectedAddress, searchAddress, spaceQueryMutation]);

  const handleBack = useCallback(() => {
    setQueryResult(null);
    setAnalysisParams(null);
  }, []);

  const handleMapLoad = useCallback(() => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance) return;

    themeCleanupRef.current?.();
    themeCleanupRef.current = setupSpaceDataTheme(mapInstance) ?? null;
    updateAutocompleteBounds();
  }, [updateAutocompleteBounds]);

  useEffect(() => {
    const mapInstance = mapRef.current?.getMap();
    if (!mapInstance) return;

    themeCleanupRef.current?.();
    themeCleanupRef.current = setupSpaceDataTheme(mapInstance) ?? null;

    updateAutocompleteBounds();

    return () => {
      themeCleanupRef.current?.();
      themeCleanupRef.current = null;
    };
  }, [mapStyleUrl, updateAutocompleteBounds]);

  const renderSidePanel = () => {
    if (queryResult) {
      return (
        <div className="space-y-4 overflow-y-auto h-full pb-4">
          <SidePanelSpace
            data={queryResult?.data}
            onBack={handleBack}
            address={analysisParams?.address || selectedAddress || searchAddress}
            radius={analysisParams?.radius ?? radius[0]}
          />
          <CompetitorsPanel
            center={analysisParams?.center ?? null}
            radius={analysisParams?.radius ?? radius[0]}
            segment={analysisParams?.segment ?? ""}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4 overflow-y-auto h-full pb-4">
        <Card className={panelCardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Buscar Localização</CardTitle>
            <CardDescription className="text-xs">Digite um endereço ou CEP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <LocationSearch
              value={searchAddress}
              onChange={setSearchAddress}
              onSelect={handleLocationSelect}
              bounds={autocompleteBounds}
            />
            <p className="text-xs text-gray-500">Ou clique no mapa para definir um ponto</p>
          </CardContent>
        </Card>

        <Card className={panelCardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Raio de Análise</CardTitle>
            <CardDescription className="text-xs">{radius[0]}m ({(radius[0] / 1000).toFixed(2)}km)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Slider value={radius} onValueChange={setRadius} min={500} max={5000} step={100} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>500m</span>
              <span>5km</span>
            </div>
          </CardContent>
        </Card>

        <Card className={panelCardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Segmento do Negócio</CardTitle>
            <CardDescription className="text-xs">Informe o segmento para buscar concorrentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="text"
              placeholder="Ex: academias, farmácias, petshops"
              value={businessSegment}
              onChange={(e) => setBusinessSegment(e.target.value)}
              className="border-sky-200 focus:border-sky-500 focus:ring-sky-500"
            />
            <p className="text-xs text-yellow-600">⚠️ Usado para listar concorrentes via Google Places</p>
          </CardContent>
        </Card>

        <Card className={panelCardClass}>
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
                    setLayers({
                      ...layers,
                      [key]: checked,
                    })
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={handleQuickQuery}
          disabled={searching || !marker}
          className="w-full h-11 text-base font-semibold bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 hover:from-sky-600 hover:via-sky-700 hover:to-indigo-700 text-white rounded-xl shadow-[0_15px_35px_rgba(56,131,255,0.45)]"
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
    <div className="flex h-full gap-4 bg-[#040617]">
      <div className="relative flex-1 rounded-3xl overflow-hidden shadow-[0_40px_120px_-45px_rgba(79,199,255,0.65)] border border-white/5">
        <Map
          ref={mapRef}
          initialViewState={viewport}
          style={{ width: "100%", height: "100%" }}
          mapStyle={mapStyleUrl}
          onLoad={handleMapLoad}
          onMove={(evt) => {
            setViewport(evt.viewState);
            updateAutocompleteBounds();
          }}
          onClick={(e) => {
            const { lng, lat } = e.lngLat;
            setMarker({ lat, lng });
            setSelectedAddress("");
            setSearchAddress("");
          }}
        >
          {circleData && (
            <Source id="circle-source" type="geojson" data={circleData}>
              <Layer
                id="circle-fill"
                type="fill"
                paint={{
                  "fill-color": spaceDataThemeConstants.PRIMARY_GLOW,
                  "fill-opacity": 0.12,
                }}
              />
              <Layer
                id="circle-stroke"
                type="line"
                paint={{
                  "line-color": spaceDataThemeConstants.SECONDARY_GLOW,
                  "line-width": 2.2,
                  "line-opacity": 0.9,
                }}
              />
            </Source>
          )}

          {marker && (
            <Marker longitude={marker.lng} latitude={marker.lat} anchor="bottom">
              <div className="relative">
                <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(138,245,255,0.9),rgba(23,133,255,0.4))] blur-sm opacity-80" />
                <div className="w-11 h-11 bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-600 rounded-full border border-white/40 shadow-[0_15px_45px_rgba(79,199,255,0.5)] flex items-center justify-center cursor-move transform hover:scale-110 transition-transform relative">
                  <MapPin className="w-5 h-5 text-white drop-shadow" />
                </div>
              </div>
            </Marker>
          )}
        </Map>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,199,255,0.25),transparent_55%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen"
          style={{ background: "linear-gradient(140deg, rgba(9,18,56,0.85) 0%, rgba(15,42,122,0.55) 45%, rgba(14,95,128,0.35) 100%)" }}
        />
        <div className="pointer-events-none absolute inset-0 border border-white/10 rounded-3xl" />
      </div>

      <div className="w-96 bg-white/95 backdrop-blur rounded-3xl shadow-[0_35px_120px_-45px_rgba(13,31,79,0.8)] overflow-hidden flex flex-col border border-white/60">
        <div className="bg-gradient-to-r from-sky-100 via-cyan-100 to-transparent border-b border-white/60 p-4 flex items-center justify-between">
          {queryResult && (
            <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2 text-sky-700 hover:text-sky-800">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          )}
          <h2 className="text-lg font-bold text-gray-800">
            {queryResult ? "Resultados da Análise" : "Análise de Localização"}
          </h2>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4">{renderSidePanel()}</div>
      </div>
    </div>
  );
}
