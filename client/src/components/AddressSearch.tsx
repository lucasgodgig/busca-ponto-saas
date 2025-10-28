import React, { useRef, useEffect, useState } from "react";
import { Search, Loader2, MapPin, AlertCircle, X } from "lucide-react";

interface AddressSearchProps {
  onAddressSelect: (lat: number, lng: number, address: string) => void;
  loading?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export default function AddressSearch({ onAddressSelect, loading }: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    // Carregar Google Places Autocomplete
    if (!window.google) {
      setError("Google Maps API não carregada");
      return;
    }

    const input = inputRef.current;
    if (!input) return;

    try {
      // Criar autocomplete com opções melhoradas
      autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
        types: ["geocode"],
        componentRestrictions: { country: "br" },
        fields: ["geometry", "formatted_address", "address_components"],
      });

      // Listener para quando um lugar é selecionado
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();

        if (!place.geometry) {
          setError("Nenhuma localização encontrada para este endereço");
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address;

        setSelectedAddress(address);
        setError(null);
        onAddressSelect(lat, lng, address);
      });

      // Listener para erros
      autocompleteRef.current.addListener("invalid_address", () => {
        setError("Endereço inválido. Tente novamente.");
      });
    } catch (err) {
      setError("Erro ao carregar autocomplete do Google Places");
    }

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onAddressSelect]);

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
      setSelectedAddress("");
      setError(null);
    }
  };

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
            className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
          />
          {/* Botão de limpar */}
          {inputRef.current?.value && (
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

        {/* Mensagem de sucesso */}
        {selectedAddress && !error && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-900">Localização selecionada</p>
              <p className="text-sm text-green-700 truncate">{selectedAddress}</p>
            </div>
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
        {!selectedAddress && !error && (
          <p className="mt-2 text-xs text-gray-500">
            Digite um endereço, bairro, CEP ou cidade para buscar
          </p>
        )}
      </div>
    </div>
  );
}

