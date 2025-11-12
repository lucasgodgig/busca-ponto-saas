import { circle as turfCircle } from "@turf/turf";
import type { Map as MapLibreMap, LngLatLike } from "maplibre-gl";

export type CircleParams = { map: MapLibreMap; center: LngLatLike; radiusMeters: number };

export function upsertAnalysisCircle({ map, center, radiusMeters }: CircleParams) {
  // GeoJSON do círculo (64 segmentos é suficiente)
  const feature = turfCircle(center as any, radiusMeters / 1000, { steps: 64, units: "kilometers", properties: { kind: "analysis" } });
  const data = { type: "FeatureCollection", features: [feature] } as GeoJSON.FeatureCollection;

  // Cria/atualiza a source
  if (map.getSource("analysis-circle-source")) {
    (map.getSource("analysis-circle-source") as any).setData(data);
  } else {
    map.addSource("analysis-circle-source", { type: "geojson", data });
    // Fill
    map.addLayer({
      id: "analysis-circle-fill",
      type: "fill",
      source: "analysis-circle-source",
      paint: {
        "fill-color": "#3B82F6",        // azul
        "fill-opacity": 0.25
      }
    });
    // Borda
    map.addLayer({
      id: "analysis-circle-line",
      type: "line",
      source: "analysis-circle-source",
      paint: {
        "line-color": "#2563EB",        // azul mais escuro
        "line-width": 2
      }
    });
  }
}

export function clearAnalysisCircle(map?: MapLibreMap | null) {
  if (!map) return; // Segurança: não fazer nada se mapa não existir
  if (map.getLayer("analysis-circle-line")) map.removeLayer("analysis-circle-line");
  if (map.getLayer("analysis-circle-fill")) map.removeLayer("analysis-circle-fill");
  if (map.getSource("analysis-circle-source")) map.removeSource("analysis-circle-source");
}

