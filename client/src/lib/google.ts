const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";

let mapsScriptPromise: Promise<typeof window.google> | null = null;

function ensureApiKey() {
  if (!GOOGLE_API_KEY) {
    throw new Error("Google Maps API key is not configured. Set VITE_GOOGLE_MAPS_API_KEY or VITE_GOOGLE_PLACES_API_KEY.");
  }
}

export function loadGoogleMapsScript(): Promise<typeof window.google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps script can only be loaded in the browser"));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  ensureApiKey();

  if (!mapsScriptPromise) {
    mapsScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        "script[data-google-maps=\"true\"]"
      );

      if (existing) {
        existing.addEventListener("load", () => {
          if (window.google) {
            resolve(window.google);
          } else {
            reject(new Error("Google Maps script loaded without google object"));
          }
        });
        existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places&language=pt-BR&region=BR`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMaps = "true";
      script.addEventListener("load", () => {
        if (window.google) {
          resolve(window.google);
        } else {
          reject(new Error("Google Maps script loaded without google object"));
        }
      });
      script.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")));
      document.head.appendChild(script);
    });
  }

  return mapsScriptPromise;
}

interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

async function fetchGeocode(url: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  ensureApiKey();

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Google Geocoding request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const result = data.results[0];
  const location = result.geometry?.location;
  if (!location) {
    return null;
  }

  return {
    lat: location.lat,
    lng: location.lng,
    address: result.formatted_address ?? result.name ?? "",
    placeId: result.place_id,
  };
}

export async function geocodePlaceId(placeId: string, signal?: AbortSignal): Promise<GeocodeResult> {
  const encoded = encodeURIComponent(placeId);
  const result = await fetchGeocode(
    `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encoded}&key=${GOOGLE_API_KEY}`,
    signal
  );
  if (!result) {
    throw new Error("Não foi possível localizar o endereço selecionado");
  }
  return result;
}

export async function geocodeAddress(text: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  if (!text.trim()) {
    return null;
  }
  const encoded = encodeURIComponent(text.trim());
  return await fetchGeocode(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${GOOGLE_API_KEY}`,
    signal
  );
}

export type GoogleBoundsLiteral = {
  east: number;
  west: number;
  north: number;
  south: number;
};
