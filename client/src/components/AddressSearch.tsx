import React, { useRef, useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";

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
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    // Carregar Google Places Autocomplete
    if (!window.google) {
      console.warn("Google Maps API não carregada");
      return;
    }

    const input = inputRef.current;
    if (!input) return;

    // Criar autocomplete
    autocompleteRef.current = new window.google.maps.places.Autocomplete(input, {
      types: ["geocode"],
      componentRestrictions: { country: "br" },
    });

    // Listener para quando um lugar é selecionado
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();

      if (!place.geometry) {
        console.error("Nenhuma geometria encontrada para este lugar");
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const address = place.formatted_address;

      onAddressSelect(lat, lng, address);
    });

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onAddressSelect]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Buscar endereço ou CEP..."
          disabled={loading || isLoading}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {(loading || isLoading) && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 animate-spin" />
        )}
      </div>
    </div>
  );
}

