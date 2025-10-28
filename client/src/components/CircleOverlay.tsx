import { useEffect, useRef } from "react";
import { MapRef } from "react-map-gl/maplibre";

interface CircleOverlayProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  mapRef: React.RefObject<MapRef | null>;
}

export function CircleOverlay({ center, radiusMeters, mapRef }: CircleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Configurar tamanho do canvas
    const rect = map.getContainer().getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

    // Desenhar círculo preenchido (azul com transparência)
    ctx.fillStyle = "rgba(59, 130, 246, 0.25)";
    ctx.beginPath();
    ctx.arc(centerPixel.x, centerPixel.y, radiusPixels, 0, Math.PI * 2);
    ctx.fill();

    // Desenhar borda do círculo (azul mais escuro)
    ctx.strokeStyle = "#1e40af";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerPixel.x, centerPixel.y, radiusPixels, 0, Math.PI * 2);
    ctx.stroke();

    console.log("✅ Círculo desenhado no canvas:", {
      center: centerPixel,
      radiusPixels,
      radiusMeters,
    });
  }, [center, radiusMeters, mapRef]);

  // Atualizar posição do canvas quando o mapa se move
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !containerRef.current) return;

    const handleMove = () => {
      // Forçar re-render do canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    };

    map.on("move", handleMove);
    return () => {
      map.off("move", handleMove);
    };
  }, [mapRef]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: "block" }}
      />
    </div>
  );
}

