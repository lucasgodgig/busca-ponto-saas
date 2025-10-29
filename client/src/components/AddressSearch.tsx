import React, { useRef, useEffect, useState, useCallback, useTransition, useLayoutEffect } from "react";
import { Search, Loader2, MapPin, AlertCircle, X } from "lucide-react";

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

    if (value.length < 2) {
      // Usar startTransition para não bloquear a digitação
      startTransition(() => {
        setSuggestions([]);
        setShowSuggestions(false);
      });
      suggestionsRef.current = [];
      return;
    }

    // Debounce de 300ms antes de fazer a requisição
    debounceTimerRef.current = setTimeout(() => {
      if (!autocompleteServiceRef.current) return;

      setIsLoading(true);
      
      // Buscar predictions
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: value,
          componentRestrictions: { country: "br" },
          sessionToken: sessionTokenRef.current,
          types: ["geocode", "establishment"], // Incluir estabelecimentos
        },
        (predictions: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const newSuggestions: Suggestion[] = predictions.map((prediction) => ({
              id: prediction.place_id,
              description: prediction.description,
              placeId: prediction.place_id,
            }));
            suggestionsRef.current = newSuggestions;
            
            // Usar startTransition para não bloquear a digitação
            startTransition(() => {
              setSuggestions(newSuggestions);
              setShowSuggestions(true);
            });
            
            setError(null);
          } else if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            setError("Erro ao buscar sugestões");
          }
          setIsLoading(false);
          shouldFocusRef.current = true;
        }
      );
    }, 300);
  }, []);

  // Adicionar listener ao input - apenas uma vez
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = (e: Event) => {
      const value = (e.target as HTMLInputElement).value;
      handleInputChange(value);
    };

    const handleFocus = () => {
      if (suggestionsRef.current.length > 0) {
        setShowSuggestions(true);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Se estamos selecionando uma sugestão, não fechar o dropdown
      if (isSelectingSuggestionRef.current) {
        // Restaurar foco no input
        setTimeout(() => {
          input.focus();
        }, 0);
        return;
      }

      // Verificar se o foco saiu para um elemento fora do componente
      // Usar setTimeout para permitir que o clique na sugestão seja processado
      setTimeout(() => {
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !relatedTarget.closest('[class*="cursor-pointer"]')) {
          setShowSuggestions(false);
        }
      }, 100);
    };

    input.addEventListener("input", handleInput);
    input.addEventListener("focus", handleFocus);
    input.addEventListener("blur", handleBlur);

    return () => {
      input.removeEventListener("input", handleInput);
      input.removeEventListener("focus", handleFocus);
      input.removeEventListener("blur", handleBlur);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleInputChange]); // Apenas handleInputChange como dependência

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

    // Obter detalhes do lugar
    placesServiceRef.current.getDetails(
      {
        placeId: suggestion.placeId,
        fields: ["geometry", "formatted_address"],
        sessionToken: sessionTokenRef.current,
      },
      (place: any, status: string) => {
        console.log('[AddressSearch] getDetails callback:', { status, hasGeometry: !!place?.geometry });
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place.geometry) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address;

          console.log('[AddressSearch] Coordenadas obtidas:', { lat, lng, address });
          setError(null);
          
          startTransition(() => {
            setSuggestions([]);
          });
          suggestionsRef.current = [];
          
          if (inputRef.current) {
            inputRef.current.value = address;
          }

          // Criar novo session token para próxima busca
          sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();

          // Chamar callback com coordenadas
          console.log('[AddressSearch] Chamando onAddressSelect com:', { lat, lng, address });
          onAddressSelect(lat, lng, address);
        } else {
          console.error('[AddressSearch] Erro ao obter detalhes:', status);
          setError("Erro ao obter detalhes do local");
        }
        setIsLoading(false);
        isSelectingSuggestionRef.current = false;
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
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
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
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Erro</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Dica de uso */}
        {!error && (
          <p className="mt-2 text-xs text-gray-500">
            Digite um endereço, bairro, CEP, cidade ou local específico (Terminal de Ônibus, Estação, etc) para buscar
          </p>
        )}
      </div>
    </div>
  );
}

