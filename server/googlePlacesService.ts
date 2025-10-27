import { ENV } from "./_core/env";

export interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export interface CompetitorResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  placeId: string;
  types?: string[];
}

/**
 * Busca endereço usando Google Places Autocomplete + Geocoding
 */
export async function searchAddress(query: string): Promise<PlaceSearchResult | null> {
  if (!ENV.googlePlacesApiKey) {
    console.warn("[Google Places] API key não configurada");
    return null;
  }

  try {
    // Usar Geocoding API para buscar endereço
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${ENV.googlePlacesApiKey}`
    );

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.warn("[Google Places] Nenhum resultado encontrado para:", query);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      name: result.formatted_address,
      address: result.formatted_address,
      lat: location.lat,
      lng: location.lng,
      placeId: result.place_id,
    };
  } catch (error) {
    console.error("[Google Places] Erro ao buscar endereço:", error);
    return null;
  }
}

/**
 * Busca concorrentes próximos usando Google Places Nearby Search
 */
export async function searchCompetitors(
  lat: number,
  lng: number,
  radius: number,
  businessType: string
): Promise<CompetitorResult[]> {
  if (!ENV.googlePlacesApiKey) {
    console.warn("[Google Places] API key não configurada, retornando dados mockados");
    return generateMockCompetitors(businessType);
  }

  try {
    // Usar Places API Nearby Search
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(businessType)}&key=${ENV.googlePlacesApiKey}`
    );

    const data = await response.json();

    if (data.status !== "OK" || !data.results) {
      console.warn("[Google Places] Nenhum concorrente encontrado");
      return generateMockCompetitors(businessType);
    }

    return data.results.slice(0, 20).map((place: any) => ({
      name: place.name,
      address: place.vicinity || place.formatted_address || "Endereço não disponível",
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      placeId: place.place_id,
      types: place.types,
    }));
  } catch (error) {
    console.error("[Google Places] Erro ao buscar concorrentes:", error);
    return generateMockCompetitors(businessType);
  }
}

/**
 * Gera dados mockados de concorrentes quando a API não está disponível
 */
function generateMockCompetitors(businessType: string): CompetitorResult[] {
  const mockNames = [
    `${businessType} Central`,
    `${businessType} Premium`,
    `${businessType} Express`,
    `${businessType} Popular`,
    `${businessType} da Praça`,
  ];

  return mockNames.map((name, index) => ({
    name,
    address: `Rua Exemplo, ${100 + index * 50} - São Paulo, SP`,
    lat: -23.55052 + (Math.random() - 0.5) * 0.01,
    lng: -46.633308 + (Math.random() - 0.5) * 0.01,
    rating: 3.5 + Math.random() * 1.5,
    userRatingsTotal: Math.floor(Math.random() * 500) + 50,
    placeId: `mock_place_${index}`,
    types: ["establishment", "point_of_interest"],
  }));
}

