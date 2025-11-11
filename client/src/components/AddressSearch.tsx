"use client";

import { Search, Loader2, MapPin, AlertCircle, X } from "lucide-react";
import { useRef, useState, useEffect, useCallback, useTransition } from "react";

interface AddressSearchProps {
  onAddressSelect: (lat: number, lng: number, address: string) => void;
  loading?: boolean;
}

interface Suggestion {
  id: string;
  description: string;
  placeId: string;
  lat?: number;
  lng?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function AddressSearch({ onAddressSelect, loading }: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<Suggestion[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Inicializar Google Places API uma única vez
  useEffect(() => {
    console.log('[AddressSearch] Inicializando Google Places API...');
    
    if (!window.google) {
      console.error('[AddressSearch] window.google não disponível');
      setError("Google Maps API não carregada");
      return;
    }

    if (!window.google.maps || !window.google.maps.places) {
      console.error('[AddressSearch] Google Places API não disponível');
      setError("Google Places API não carregada");
      return;
    }

    try {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      console.log('[AddressSearch] Google Places API inicializada com sucesso');
    } catch (err) {
      console.error("[AddressSearch] Erro ao carregar Google Places:", err);
      setError("Erro ao carregar Google Places");
    }
  }, []);

  // Handler para input - apenas atualiza o valor
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  // Handler para buscar (Enter ou botão)
  const handleSearch = useCallback(() => {
    console.log('[AddressSearch] handleSearch chamado, inputValue:', inputValue);
    
    if (!inputValue.trim()) {
      setError("Digite um endereço");
      return;
    }

    if (!autocompleteServiceRef.current) {
      console.error('[AddressSearch] autocompleteServiceRef.current é null');
      setError("Serviço de busca não disponível");
      return;
    }

    console.log('[AddressSearch] Chamando getPlacePredictions...');
    setIsLoading(true);
    setError(null);

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: inputValue,
        sessionToken: sessionTokenRef.current,
        componentRestrictions: { country: "br" },
      },
      (predictions: any[], status: string) => {
        console.log('[AddressSearch] Callback recebido, status:', status, 'predictions:', predictions);
        setIsLoading(false);

        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          console.error("[AddressSearch] Erro ao buscar sugestões:", status);
          setError("Erro ao buscar endereços");
          setSuggestions([]);
          suggestionsRef.current = [];
          return;
        }

        if (!predictions || predictions.length === 0) {
          setError("Nenhum endereço encontrado");
          setSuggestions([]);
          suggestionsRef.current = [];
          return;
        }

        const formattedSuggestions: Suggestion[] = predictions.map(
          (prediction: any) => ({
            id: prediction.place_id,
            description: prediction.description,
            placeId: prediction.place_id,
          })
        );

        suggestionsRef.current = formattedSuggestions;
        startTransition(() => {
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
        });
        setError(null);
      }
    );
  }, [inputValue]);

  // Handler para selecionar uma sugestão
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    if (!placesServiceRef.current) {
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    placesServiceRef.current.getDetails(
      { placeId: suggestion.placeId, sessionToken: sessionTokenRef.current },
      (place: any, status: string) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
          console.error('[AddressSearch] Erro ao obter detalhes:', status);
          setError("Erro ao obter detalhes do local");
          setIsLoading(false);
          return;
        }

        if (!place.geometry?.location) {
          console.error('[AddressSearch] Sem geometria:', place);
          setError("Local sem coordenadas");
          setIsLoading(false);
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || suggestion.description;

        onAddressSelect(lat, lng, address);

        // Limpar
        setInputValue("");
        setSuggestions([]);
        suggestionsRef.current = [];
        setShowSuggestions(false);
        setError(null);
        setIsLoading(false);

        // Criar novo session token
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      }
    );
  }, [onAddressSelect]);

  // Handler para limpar input
  const handleClear = useCallback(() => {
    setInputValue("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
      setError(null);
      startTransition(() => {
        setSuggestions([]);
      });
      suggestionsRef.current = [];
      setShowSuggestions(false);
    }
  }, []);

  // Handler para Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className="w-full relative">
      <div className="relative">
        {/* Input com ícone */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar endereço ou CEP..."
            disabled={loading || isLoading}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Fechar dropdown com delay para permitir clique na sugestão
              if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = setTimeout(() => {
                setShowSuggestions(false);
              }, 150);
            }}
            autoComplete="off"
            className="w-full pl-10 pr-10 py-2 md:py-3 text-sm md:text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          {/* Botão de limpar */}
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Botão de pesquisar */}
          <button
            onClick={handleSearch}
            disabled={loading || isLoading || !inputValue.trim()}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600 disabled:text-gray-300 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Dropdown de sugestões */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 md:max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectSuggestion(suggestion);
                }}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-4 py-2 md:py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer text-sm md:text-base"
              >
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 truncate">{suggestion.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs md:text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-red-700">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

