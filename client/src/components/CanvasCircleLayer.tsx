import { useEffect } from "react";
import { MapRef } from "react-map-gl/maplibre";
import type { Map as MapLibreMap } from "maplibre-gl";

interface CanvasCircleLayerProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  mapRef: React.RefObject<MapRef | null>;
}

export function CanvasCircleLayer({ center, radiusMeters, mapRef }: CanvasCircleLayerProps) {
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Criar um custom layer que desenha no canvas
    const canvasLayer = {
      id: "circle-canvas-layer",
      type: "custom" as const,
      renderingContext: "2d" as const,
      onAdd(map: MapLibreMap, gl: WebGLRenderingContext) {
        console.log("✅ Canvas layer adicionado ao mapa");
      },
      render(gl: WebGLRenderingContext, matrix: number[]) {
        const canvas = map.getCanvas();
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Converter coordenadas geográficas para pixel
        const centerPixel = map.project([center.lng, center.lat]);

        // Calcular raio em pixels
        const earthRadiusKm = 6371;
        const radiusKm = radiusMeters / 1000;
        const angularDistance = radiusKm / earthRadiusKm;
        const latOffset = (angularDistance * 180) / Math.PI;
        const edgePixel = map.project([center.lng, center.lat + latOffset]);
        const radiusPixels = Math.abs(edgePixel.y - centerPixel.y);

        // Desenhar círculo preenchido
        ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
        ctx.beginPath();
        ctx.arc(centerPixel.x, centerPixel.y, radiusPixels, 0, Math.PI * 2);
        ctx.fill();

        // Desenhar borda
        ctx.strokeStyle = "#1e40af";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerPixel.x, centerPixel.y, radiusPixels, 0, Math.PI * 2);
        ctx.stroke();

        console.log("✅ Canvas circle renderizado");
      },
    };

    // Remover layer anterior se existir
    try {
      if (map.getLayer("circle-canvas-layer")) {
        map.removeLayer("circle-canvas-layer");
      }
    } catch (e) {
      // Layer não existe, tudo bem
    }

    // Adicionar novo layer
    try {
      map.addLayer(canvasLayer as any);
      console.log("✅ Canvas circle layer adicionado");
    } catch (error) {
      console.error("Erro ao adicionar canvas layer:", error);
    }

    return () => {
      try {
        if (map.getLayer("circle-canvas-layer")) {
          map.removeLayer("circle-canvas-layer");
        }
      } catch (e) {
        // Layer já foi removido
      }
    };
  }, [center, radiusMeters, mapRef]);

  return null;
}

