"use client";

import { Search, Loader2, MapPin, AlertCircle, X } from "lucide-react";
import { useRef, useState, useEffect, useCallback, useLayoutEffect, useTransition } from "react";

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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingSuggestionRef = useRef(false);
  const shouldFocusRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Restaurar foco ANTES da renderização
  useLayoutEffect(() => {
    if (shouldFocusRef.current && inputRef.current) {
      inputRef.current.focus();
      shouldFocusRef.current = false;
    }
  });

  // Inicializar Google Places API uma única vez
  useEffect(() => {
    if (!window.google) {
      setError("Google Maps API não carregada");
      return;
    }

    try {
      // Criar novo session token para cada busca
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      
      // Inicializar serviços
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
    } catch (err) {
      console.error("Erro ao carregar Google Places:", err);
      setError("Erro ao carregar Google Places");
    }
  }, []);

  // Limpar input quando o componente é desmontado
  useEffect(() => {
    return () => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };
  }, []);

  // Handler para input com debounce
  const handleInputChange = useCallback((value: string) => {
    // Atualizar estado do input
    setInputValue(value);
    
    // Sempre manter foco no input
    shouldFocusRef.current = true;

    // Limpar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Se vazio, limpar sugestões
    if (!value.trim()) {
      setSuggestions([]);
      suggestionsRef.current = [];
      setShowSuggestions(false);
      return;
    }

    // Debounce a busca
    debounceTimerRef.current = setTimeout(
      async () => {
        if (!autocompleteServiceRef.current) return;

        try {
          setIsLoading(true);
          const predictions = await autocompleteServiceRef.current.getPlacePredictions({
            input: value,
            sessionToken: sessionTokenRef.current,
            componentRestrictions: { country: "br" },
          });

          const formattedSuggestions: Suggestion[] = (predictions.predictions || []).map(
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
        } catch (err) {
          console.error("Erro ao buscar sugestões:", err);
          setError("Erro ao buscar endereços");
          setSuggestions([]);
          suggestionsRef.current = [];
        } finally {
          setIsLoading(false);
        }
      },
      300
    );
  }, []);

  // Handler para selecionar uma sugestão
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    console.log('[AddressSearch] handleSelectSuggestion chamado com:', suggestion);
    if (!placesServiceRef.current) {
      console.error('[AddressSearch] placesServiceRef.current é null');
      return;
    }

    isSelectingSuggestionRef.current = true;
    setIsLoading(true);
    setShowSuggestions(false);

    placesServiceRef.current.getDetails(
      { placeId: suggestion.placeId, sessionToken: sessionTokenRef.current },
      (place: any, status: string) => {
        isSelectingSuggestionRef.current = false;

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

        console.log('[AddressSearch] Chamando onAddressSelect:', { lat, lng, address });
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

  // Em mobile, retornar modal fixo
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none">
        {/* Overlay semi-transparente quando dropdown está aberto */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute inset-0 bg-black bg-opacity-30 pointer-events-auto"
            onClick={() => setShowSuggestions(false)}
          />
        )}
        
        {/* Modal fixo no topo */}
        <div className="absolute top-0 left-0 right-0 bg-white shadow-lg z-50 pointer-events-auto">
          <div className="p-3 space-y-2">
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
                autoFocus
                autoComplete="off"
                className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
              />
              {/* Botão de limpar */}
              {inputValue && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              {/* Loading spinner */}
              {(loading || isLoading) && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
              )}
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
          </div>

          {/* Dropdown de sugestões */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="border-t border-gray-200 max-h-64 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleSelectSuggestion(suggestion);
                  }}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer active:bg-blue-100"
                >
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{suggestion.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: retornar layout original
  return (
    <div className="w-full">
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
            autoComplete="off"
            className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          {/* Botão de limpar */}
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {/* Loading spinner */}
          {(loading || isLoading) && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Dropdown de sugestões */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto pointer-events-auto">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectSuggestion(suggestion);
                }}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors flex items-start gap-3 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{suggestion.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mensagem de erro */}
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

