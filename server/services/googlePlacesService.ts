import axios from 'axios';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  location: { latitude: number; longitude: number };
  url?: string;
  distance?: number;
}

/**
 * Mapeamento de segmentos para tipos de Google Places
 */
export function mapSegmentToTypes(segment: string): string[] {
  const segmentMap: Record<string, string[]> = {
    Academia: ['gym', 'fitness_center'],
    Farmácia: ['pharmacy', 'drugstore'],
    Petshop: ['pet_store', 'veterinary_care'],
    Restaurante: ['restaurant', 'cafe', 'fast_food'],
    Supermercado: ['supermarket', 'grocery_store'],
    Loja: ['shopping_mall', 'retail_store'],
    Clínica: ['doctor', 'dentist', 'health'],
  };

  return segmentMap[segment] || ['point_of_interest'];
}

/**
 * Tipos de sinergias (complementos)
 */
export function mapSynergyTypes(): string[] {
  return [
    'shopping_mall',
    'supermarket',
    'school',
    'university',
    'hospital',
    'train_station',
    'subway_station',
    'bus_station',
    'parking',
    'bank',
  ];
}

/**
 * Busca concorrentes próximos usando Google Places
 */
export async function fetchNearby(
  lat: number,
  lng: number,
  radius: number,
  types: string[]
): Promise<PlaceResult[]> {
  if (!API_KEY) {
    console.warn('[Google Places] API_KEY não configurada, retornando array vazio');
    return [];
  }

  try {
    const url = BASE_URL;
    const body = {
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
      includedTypes: types,
      maxResultCount: 20,
      languageCode: 'pt-BR',
    };

    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      timeout: 10000,
    });

    const places = (response.data.places || []).map((p: any) => ({
      id: p.id,
      name: p.displayName?.text || 'Sem nome',
      address: p.formattedAddress || 'Endereço não disponível',
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      openNow: p.currentOpeningHours?.openNow,
      location: p.location,
      url: p.googleMapsUri,
    }));

    return places;
  } catch (error) {
    console.error('[Google Places] Erro ao buscar concorrentes:', error);
    return [];
  }
}

/**
 * Calcula distância entre dois pontos (Haversine)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em km
}



/**
 * Interface para resultado de busca de endereço
 */
export interface PlaceSearchResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

/**
 * Interface para resultado de busca de concorrentes
 */
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

/**
 * Busca endereço usando Google Geocoding API
 */
export async function searchAddress(query: string): Promise<PlaceSearchResult | null> {
  if (!API_KEY) {
    console.warn('[Google Places] API_KEY não configurada');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${API_KEY}`;
    const response = await axios.get(url, { timeout: 5000 });

    if (response.data.status !== 'OK' || !response.data.results?.length) {
      return null;
    }

    const result = response.data.results[0];
    return {
      name: result.formatted_address,
      address: result.formatted_address,
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      placeId: result.place_id,
    };
  } catch (error) {
    console.error('[Google Places] Erro ao buscar endereço:', error);
    return null;
  }
}

/**
 * Busca concorrentes próximos
 */
export async function searchCompetitors(params: {
  lat: number;
  lng: number;
  radius: number;
  types: string[];
  pageToken?: string;
}): Promise<{ results: CompetitorResult[]; nextPageToken?: string }> {
  if (!API_KEY) {
    console.warn('[Google Places] API_KEY não configurada');
    return { results: [] };
  }

  try {
    const places = await fetchNearby(params.lat, params.lng, params.radius, params.types);
    
    const results: CompetitorResult[] = places.map((p) => ({
      name: p.name,
      address: p.address,
      lat: p.location.latitude,
      lng: p.location.longitude,
      rating: p.rating,
      userRatingsTotal: p.userRatingCount,
      placeId: p.id,
      types: params.types,
      openNow: p.openNow,
    }));

    return { results };
  } catch (error) {
    console.error('[Google Places] Erro ao buscar concorrentes:', error);
    return { results: [] };
  }
}

