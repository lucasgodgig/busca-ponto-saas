"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowUpDown, Download, MapPin, Star } from "lucide-react";
import {
  exportNearbyToCsv,
  fetchNearby,
  formatDistance,
  mapSegmentToTypes,
  NearbyPlace,
} from "@/services/placesNearby";
import { toast } from "sonner";

interface CompetitorsPanelProps {
  center: { lat: number; lng: number } | null;
  radius: number;
  segment: string;
}

type SortOption = "distance" | "rating";

export default function CompetitorsPanel({ center, radius, segment }: CompetitorsPanelProps) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  const hasCenter = !!center;
  const trimmedSegment = segment.trim();

  const loadPlaces = useCallback(
    async (pageToken?: string, append = false) => {
      if (!center || !trimmedSegment) return;

      const types = mapSegmentToTypes(trimmedSegment);
      if (!types.length) {
        toast.warning("Defina um segmento válido para buscar concorrentes");
        return;
      }

      setLoading(true);
      try {
        const response = await fetchNearby({
          lat: center.lat,
          lng: center.lng,
          radius,
          types,
          pageToken,
        });

        setPlaces((current) => (append ? [...current, ...response.results] : response.results));
        setNextPageToken(response.nextPageToken);
      } catch (error) {
        console.error("Erro ao buscar concorrentes", error);
        toast.error("Não foi possível carregar os concorrentes");
      } finally {
        setLoading(false);
      }
    },
    [center, radius, trimmedSegment]
  );

  useEffect(() => {
    if (!center || !trimmedSegment) {
      setPlaces([]);
      setNextPageToken(undefined);
      return;
    }

    loadPlaces();
  }, [center, radius, trimmedSegment, loadPlaces]);

  const sortedPlaces = useMemo(() => {
    const items = [...places];
    if (sortBy === "rating") {
      return items.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
    return items.sort((a, b) => a.distance_m - b.distance_m);
  }, [places, sortBy]);

  const handleExport = useCallback(() => {
    if (!center) return;
    if (!places.length) {
      toast.warning("Nenhum concorrente para exportar");
      return;
    }
    exportNearbyToCsv(sortedPlaces, center);
    toast.success("CSV exportado com sucesso!");
  }, [center, places.length, sortedPlaces]);

  if (!hasCenter) {
    return null;
  }

  if (!trimmedSegment) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Informe um segmento para listar concorrentes
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base font-semibold text-blue-900 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Concorrentes próximos
        </CardTitle>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance" className="text-xs">Mais próximos</SelectItem>
              <SelectItem value="rating" className="text-xs">Melhor avaliação</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-800" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !places.length ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : null}

        {!loading && !places.length ? (
          <div className="text-sm text-blue-900/80">Nenhum concorrente encontrado para o segmento selecionado.</div>
        ) : null}

        {places.length > 0 ? (
          <ScrollArea className="max-h-72 pr-3">
            <div className="space-y-3">
              {sortedPlaces.map((place) => (
                <div key={place.id} className="bg-white/90 border border-blue-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <a
                        href={place.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sm text-blue-900 hover:underline"
                      >
                        {place.name}
                      </a>
                      <div className="text-xs text-blue-700 mt-1">{place.address ?? "Endereço não informado"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium text-blue-900 bg-blue-100/80 rounded-full px-2 py-0.5">
                        {formatDistance(place.distance_m)}
                      </span>
                      {place.rating ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                          <Star className="w-3 h-3" /> {place.rating.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-blue-800/80">
                    {place.user_ratings_total ? (
                      <span>{place.user_ratings_total} avaliações</span>
                    ) : null}
                    {place.open_now !== undefined ? (
                      <span className={place.open_now ? "text-emerald-600" : "text-rose-600"}>
                        {place.open_now ? "Aberto agora" : "Fechado"}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : null}

        {nextPageToken ? (
          <Button
            variant="secondary"
            className="w-full"
            size="sm"
            onClick={() => loadPlaces(nextPageToken, true)}
            disabled={loading}
          >
            <ArrowUpDown className="w-4 h-4 mr-2" /> Carregar mais
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
