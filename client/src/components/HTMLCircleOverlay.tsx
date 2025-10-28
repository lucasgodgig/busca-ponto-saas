import { useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/maplibre";

interface HTMLCircleOverlayProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  mapRef: React.RefObject<MapRef | null>;
}

export function HTMLCircleOverlay({ center, radiusMeters, mapRef }: HTMLCircleOverlayProps) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !divRef.current) return;

    const updatePosition = () => {
      const div = divRef.current;
      if (!div) return;

      // Converter coordenadas geográficas para pixel
      const centerPixel = map.project([center.lng, center.lat]);

      // Calcular raio em pixels
      const earthRadiusKm = 6371;
      const radiusKm = radiusMeters / 1000;
      const angularDistance = radiusKm / earthRadiusKm;
      const latOffset = (angularDistance * 180) / Math.PI;
      const edgePixel = map.project([center.lng, center.lat + latOffset]);
      const radiusPixels = Math.abs(edgePixel.y - centerPixel.y);

      // Posicionar o div
      div.style.left = (centerPixel.x - radiusPixels) + "px";
      div.style.top = (centerPixel.y - radiusPixels) + "px";
      div.style.width = (radiusPixels * 2) + "px";
      div.style.height = (radiusPixels * 2) + "px";

      console.log("✅ HTML Circle posicionado:", {
        center: centerPixel,
        radiusPixels,
        left: centerPixel.x - radiusPixels,
        top: centerPixel.y - radiusPixels,
      });
    };

    // Posicionar inicialmente
    updatePosition();

    // Atualizar quando o mapa se move
    map.on("move", updatePosition);
    map.on("zoom", updatePosition);

    return () => {
      map.off("move", updatePosition);
      map.off("zoom", updatePosition);
    };
  }, [center, radiusMeters, mapRef]);

  return (
    <div
      ref={divRef}
      className="absolute pointer-events-none"
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.25)",
        border: "3px solid #1e40af",
        borderRadius: "50%",
        zIndex: 10,
      }}
    />
  );
}

