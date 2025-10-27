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
  openNow?: boolean;
}

export interface SearchCompetitorsParams {
  lat: number;
  lng: number;
  radius: number;
  types: string[];
  pageToken?: string;
}

export interface SearchCompetitorsResponse {
  results: CompetitorResult[];
  nextPageToken?: string;
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
export async function searchCompetitors({
  lat,
  lng,
  radius,
  types,
  pageToken,
}: SearchCompetitorsParams): Promise<SearchCompetitorsResponse> {
  const keyword = types[0] ?? "Negócio";

  if (!ENV.googlePlacesApiKey) {
    console.warn("[Google Places] API key não configurada, retornando dados mockados");
    return { results: generateMockCompetitors(keyword) };
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("key", ENV.googlePlacesApiKey);
    url.searchParams.set("language", "pt-BR");

    if (pageToken) {
      url.searchParams.set("pagetoken", pageToken);
    } else {
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("radius", String(radius));

      if (types.length) {
        url.searchParams.set("type", types[0]);
        if (types.length > 1) {
          url.searchParams.set("keyword", types.slice(1).join(" "));
        }
      }
    }

    const fetchWithRetry = async (attempt = 0): Promise<SearchCompetitorsResponse> => {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Nearby search failed with status ${response.status}`);
      }

      const data = await response.json();
      const status: string = data.status;

      if (status === "INVALID_REQUEST" && pageToken && attempt < 3) {
        // Next page token may require a short delay before becoming valid.
        await new Promise(resolve => setTimeout(resolve, 1500));
        return fetchWithRetry(attempt + 1);
      }

      if (status !== "OK" && status !== "ZERO_RESULTS") {
        throw new Error(`Nearby search returned status ${status}`);
      }

      const results = (data.results ?? []).map((place: any) => ({
        name: place.name,
        address: place.vicinity || place.formatted_address || "Endereço não disponível",
        lat: place.geometry?.location?.lat ?? 0,
        lng: place.geometry?.location?.lng ?? 0,
        rating: typeof place.rating === "number" ? place.rating : undefined,
        userRatingsTotal: place.user_ratings_total,
        placeId: place.place_id,
        types: place.types,
        openNow: place.opening_hours?.open_now,
      }));

      return {
        results,
        nextPageToken: data.next_page_token,
      };
    };

    return await fetchWithRetry();
  } catch (error) {
    console.error("[Google Places] Erro ao buscar concorrentes:", error);
    return { results: generateMockCompetitors(keyword) };
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
    openNow: Math.random() > 0.5,
  }));
}

