/**
 * Tipos compartilhados para Google Places API
 */

export interface PlaceLocation {
  latitude: number;
  longitude: number;
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  location: PlaceLocation;
  url?: string;
  distance?: number;
}

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

export type BusinessSegment = 
  | 'Academia'
  | 'Farmácia'
  | 'Petshop'
  | 'Restaurante'
  | 'Supermercado'
  | 'Loja'
  | 'Clínica';

