import type { Map as MapLibreMap, LayerSpecification } from "maplibre-gl";

const isDev = typeof import.meta !== "undefined" ? import.meta.env?.DEV ?? false : false;

const BACKGROUND_COLOR = "#05071b";
const LAND_COLOR = "#080d2b";
const WATER_COLOR = "#0d1f4f";
const PRIMARY_GLOW = "#4fc7ff";
const SECONDARY_GLOW = "#8af5ff";

interface LayerMatcher {
  idIncludes?: string[];
  type?: LayerSpecification["type"];
  paint: Record<string, any>;
}

const LAYER_MATCHERS: LayerMatcher[] = [
  {
    type: "background",
    paint: {
      "background-color": BACKGROUND_COLOR,
    },
  },
  {
    idIncludes: ["land", "landcover", "landuse", "park"],
    type: "fill",
    paint: {
      "fill-color": LAND_COLOR,
      "fill-opacity": 0.95,
    },
  },
  {
    idIncludes: ["water"],
    type: "fill",
    paint: {
      "fill-color": WATER_COLOR,
    },
  },
  {
    idIncludes: ["waterway"],
    type: "line",
    paint: {
      "line-color": WATER_COLOR,
      "line-opacity": 0.8,
    },
  },
  {
    idIncludes: ["boundary"],
    type: "line",
    paint: {
      "line-color": "#23305f",
      "line-opacity": 0.6,
    },
  },
  {
    idIncludes: ["road", "highway"],
    type: "line",
    paint: {
      "line-color": "#2d4bcf",
      "line-width": 1.4,
      "line-opacity": 0.85,
    },
  },
  {
    idIncludes: ["path", "street"],
    type: "line",
    paint: {
      "line-color": "#345fe0",
      "line-opacity": 0.6,
    },
  },
  {
    idIncludes: ["building"],
    type: "fill",
    paint: {
      "fill-color": "#0f1c45",
      "fill-opacity": 0.85,
    },
  },
  {
    idIncludes: ["building"],
    type: "line",
    paint: {
      "line-color": "#1d3a7b",
      "line-opacity": 0.5,
    },
  },
];

function matchesLayer(layer: LayerSpecification, matcher: LayerMatcher) {
  if (matcher.type && layer.type !== matcher.type) {
    return false;
  }

  if (matcher.idIncludes && !matcher.idIncludes.some((token) => layer.id.includes(token))) {
    return false;
  }

  return true;
}

function safeSetPaint(map: MapLibreMap, layerId: string, property: string, value: any) {
  if (!map.getLayer(layerId)) return;

  try {
    map.setPaintProperty(layerId, property, value);
  } catch (error) {
    if (isDev) {
      console.warn(`[spaceDataTheme] Failed to set ${property} on ${layerId}`, error);
    }
  }
}

export function applySpaceDataTheme(map: MapLibreMap) {
  const style = map.getStyle();
  if (!style?.layers) return;

  style.layers.forEach((layer) => {
    LAYER_MATCHERS.forEach((matcher) => {
      if (matchesLayer(layer, matcher)) {
        Object.entries(matcher.paint).forEach(([property, value]) => {
          safeSetPaint(map, layer.id, property, value);
        });
      }
    });
  });

  try {
    (map as unknown as { setFog?: (options: Record<string, any>) => void }).setFog?.({
      "range": [1, 10],
      "horizon-blend": 0.2,
      "color": "#030716",
      "high-color": "#0d1f4f",
      "space-color": "#02030c",
      "star-intensity": 0.15,
    });
  } catch (error) {
    if (isDev) {
      console.warn("[spaceDataTheme] Failed to set fog", error);
    }
  }

  try {
    (map as unknown as { setLight?: (options: Record<string, any>) => void }).setLight?.({
      anchor: "viewport",
      color: SECONDARY_GLOW,
      intensity: 0.6,
    });
  } catch (error) {
    if (isDev) {
      console.warn("[spaceDataTheme] Failed to set light", error);
    }
  }
}

export function setupSpaceDataTheme(map: MapLibreMap) {
  const apply = () => applySpaceDataTheme(map);

  if (map.loaded()) {
    apply();
  } else {
    map.once("load", apply);
  }

  map.on("styledata", apply);

  return () => {
    map.off("styledata", apply);
  };
}

export const spaceDataThemeConstants = {
  BACKGROUND_COLOR,
  LAND_COLOR,
  WATER_COLOR,
  PRIMARY_GLOW,
  SECONDARY_GLOW,
};
