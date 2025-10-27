import { GoogleBoundsLiteral } from "@/lib/google";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";

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

export type NearbyResponse = {
  results: NearbyPlace[];
  nextPageToken?: string;
};

function ensureApiKey() {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google Places API key not configured.");
  }
}

export function mapSegmentToTypes(segment: string): string[] {
  const normalized = segment.trim().toLowerCase();

  const mappings: Record<string, string[]> = {
    academias: ["gym", "fitness_center"],
    academia: ["gym", "fitness_center"],
    gym: ["gym", "fitness_center"],
    farmacias: ["pharmacy", "drugstore"],
    farmacia: ["pharmacy", "drugstore"],
    petshop: ["pet_store", "veterinary_care"],
    petshops: ["pet_store", "veterinary_care"],
    pet: ["pet_store", "veterinary_care"],
  };

  if (mappings[normalized]) {
    return mappings[normalized];
  }

  return normalized ? [normalized] : [];
}

function buildNearbyUrl(params: {
  lat: number;
  lng: number;
  radius: number;
  types: string[];
  pageToken?: string;
}) {
  const { lat, lng, radius, types, pageToken } = params;
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", `${radius}`);
  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    if (types.length) {
      url.searchParams.set("type", types[0]);
      if (types.length > 1) {
        url.searchParams.set("keyword", types.slice(1).join(" "));
      }
    }
  }
  url.searchParams.set("key", GOOGLE_API_KEY);
  url.searchParams.set("language", "pt-BR");
  return url.toString();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function computeDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
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

export async function fetchNearby(params: {
  lat: number;
  lng: number;
  radius: number;
  types: string[];
  pageToken?: string;
}): Promise<NearbyResponse> {
  ensureApiKey();

  const url = buildNearbyUrl(params);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nearby search failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data.results) {
    return { results: [] };
  }

  const results: NearbyPlace[] = data.results.map((place: any) => {
    const location = place.geometry?.location;
    const lat = location?.lat ?? 0;
    const lng = location?.lng ?? 0;
    const distance_m = computeDistanceMeters({ lat: params.lat, lng: params.lng }, { lat, lng });

    return {
      id: place.place_id,
      name: place.name,
      lat,
      lng,
      distance_m,
      rating: typeof place.rating === "number" ? place.rating : undefined,
      user_ratings_total: place.user_ratings_total,
      open_now: place.opening_hours?.open_now,
      address: place.vicinity || place.formatted_address,
      url: place.place_id ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}` : undefined,
    };
  });

  return {
    results,
    nextPageToken: data.next_page_token,
  };
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
