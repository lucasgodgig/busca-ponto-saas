import { useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/maplibre";

interface SVGCircleOverlayProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  mapRef: React.RefObject<MapRef | null>;
}

export function SVGCircleOverlay({ center, radiusMeters, mapRef }: SVGCircleOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !svgRef.current || !containerRef.current) return;

    const updateCircle = () => {
      const svg = svgRef.current;
      if (!svg) return;

      // Converter coordenadas geográficas para pixel
      const centerPixel = map.project([center.lng, center.lat]);

      // Calcular raio em pixels (aproximado)
      const earthRadiusKm = 6371;
      const radiusKm = radiusMeters / 1000;
      const angularDistance = radiusKm / earthRadiusKm;

      // Ponto a 90 graus de distância para calcular raio em pixels
      const latOffset = (angularDistance * 180) / Math.PI;
      const edgePixel = map.project([center.lng, center.lat + latOffset]);
      const radiusPixels = Math.abs(edgePixel.y - centerPixel.y);

      // Limpar SVG anterior
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      // Criar círculo preenchido
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", centerPixel.x.toString());
      circle.setAttribute("cy", centerPixel.y.toString());
      circle.setAttribute("r", radiusPixels.toString());
      circle.setAttribute("fill", "rgba(59, 130, 246, 0.25)");
      circle.setAttribute("stroke", "#1e40af");
      circle.setAttribute("stroke-width", "3");
      svg.appendChild(circle);

      console.log("✅ SVG Círculo desenhado:", {
        center: centerPixel,
        radiusPixels,
        radiusMeters,
      });
    };

    // Desenhar círculo inicial
    updateCircle();

    // Atualizar quando o mapa se move
    map.on("move", updateCircle);
    map.on("zoom", updateCircle);

    return () => {
      map.off("move", updateCircle);
      map.off("zoom", updateCircle);
    };
  }, [center, radiusMeters, mapRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}

