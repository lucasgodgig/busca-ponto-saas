import { GoogleBoundsLiteral } from "@/lib/google";

export type NearbyPlace = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance_m: number;
  rating?: number;
  user_ratings_total?: number;
  open_now?: boolean;
  address?: string;
  url?: string;
};

export function mapSegmentToTypes(segment: string): string[] {
  const normalized = segment.trim().toLowerCase();

  const mappings: Record<string, string[]> = {
    academias: ["gym", "fitness_center"],
    academia: ["gym", "fitness_center"],
    gym: ["gym", "fitness_center"],
    crossfit: ["gym", "fitness_center"],
    musculacao: ["gym", "fitness_center"],
    pilates: ["gym", "fitness_center"],
    "personal trainer": ["gym", "fitness_center"],

    farmacias: ["pharmacy", "drugstore"],
    farmacia: ["pharmacy", "drugstore"],
    drogaria: ["pharmacy", "drugstore"],
    drogarias: ["pharmacy", "drugstore"],

    petshop: ["pet_store", "veterinary_care"],
    petshops: ["pet_store", "veterinary_care"],
    pet: ["pet_store", "veterinary_care"],
    veterinario: ["veterinary_care", "pet_store"],
    veterinaria: ["veterinary_care", "pet_store"],
  };

  if (mappings[normalized]) {
    return mappings[normalized];
  }

  return normalized ? [normalized] : [];
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function computeDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return Math.round(R * c);
}

export function formatDistance(distanceMeters: number): string {
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }
  return `${distanceMeters} m`;
}

export function exportNearbyToCsv(places: NearbyPlace[], center: { lat: number; lng: number }) {
  if (!places.length) return;

  const rows = [
    ["Nome", "Latitude", "Longitude", "Distância (m)", "Rating", "Avaliações", "Status", "Endereço", "Link"],
    ...places.map((place) => [
      place.name,
      place.lat,
      place.lng,
      place.distance_m,
      place.rating ?? "",
      place.user_ratings_total ?? "",
      place.open_now === undefined ? "" : place.open_now ? "Aberto" : "Fechado",
      place.address ?? "",
      place.url ?? "",
    ]),
  ];

  const csvContent = rows
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return "";
          const str = String(value).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `concorrentes-${center.lat.toFixed(4)}-${center.lng.toFixed(4)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function boundsFromRadius(center: { lat: number; lng: number }, radius: number): GoogleBoundsLiteral {
  const earthRadius = 6378137; // WGS84
  const latDelta = (radius / earthRadius) * (180 / Math.PI);
  const lngDelta = (radius / (earthRadius * Math.cos((Math.PI / 180) * center.lat))) * (180 / Math.PI);

  return {
    north: center.lat + latDelta,
    south: center.lat - latDelta,
    east: center.lng + lngDelta,
    west: center.lng - lngDelta,
  };
}

export type NearbyPage = {
  results: NearbyPlace[];
  nextPageToken?: string;
};
