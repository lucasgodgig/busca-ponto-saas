"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { geocodeAddress, geocodePlaceId, loadGoogleMapsScript, GoogleBoundsLiteral } from "@/lib/google";
import { toast } from "sonner";

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  bounds?: GoogleBoundsLiteral | null;
  className?: string;
  placeholder?: string;
}

const DEBOUNCE_MS = 280;

type AutocompleteInstance = any;

declare global {
  interface Window {
    google?: any;
  }
}

export function LocationSearch({
  value,
  onChange,
  onSelect,
  bounds,
  className,
  placeholder = "Ex: Av. Paulista, 1000, São Paulo",
}: LocationSearchProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<AutocompleteInstance>(null);
  const addressControllerRef = useRef<AbortController | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [pendingTextLookup, setPendingTextLookup] = useState<string | null>(null);
  const debounceTimer = useRef<number | null>(null);

  const currentBounds = useMemo(() => bounds, [bounds]);

  const cleanupAutocomplete = useCallback(() => {
    if (autocompleteRef.current && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }
    autocompleteRef.current = null;
  }, []);

  const attachAutocomplete = useCallback(async () => {
    try {
      const google = await loadGoogleMapsScript();
      if (!inputRef.current) return;

      cleanupAutocomplete();

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "br" },
        fields: ["place_id", "formatted_address", "geometry"],
        strictBounds: false,
      });

      if (currentBounds) {
        const sw = new google.maps.LatLng(currentBounds.south, currentBounds.west);
        const ne = new google.maps.LatLng(currentBounds.north, currentBounds.east);
        autocomplete.setBounds(new google.maps.LatLngBounds(sw, ne));
      }

      autocomplete.addListener("place_changed", async () => {
        const place = autocomplete.getPlace();
        if (!place?.place_id) {
          return;
        }

        addressControllerRef.current?.abort();
        const controller = new AbortController();
        addressControllerRef.current = controller;

        setIsResolving(true);
        try {
          const result = await geocodePlaceId(place.place_id, controller.signal);
          onChange(result.address);
          onSelect({ lat: result.lat, lng: result.lng, address: result.address });
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.error("Erro ao resolver endereço por place_id", error);
            toast.error("Não foi possível localizar o endereço selecionado");
          }
        } finally {
          setIsResolving(false);
        }
      });

      autocompleteRef.current = autocomplete;
    } catch (error) {
      console.error("Erro ao inicializar Autocomplete do Google", error);
      toast.error("Não foi possível carregar a busca do Google Maps");
    }
  }, [cleanupAutocomplete, currentBounds, onChange, onSelect]);

  useEffect(() => {
    attachAutocomplete();

    return () => {
      cleanupAutocomplete();
      addressControllerRef.current?.abort();
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
    };
  }, [attachAutocomplete, cleanupAutocomplete]);

  useEffect(() => {
    if (!autocompleteRef.current || !bounds || !window.google?.maps) return;
    const google = window.google;
    const sw = new google.maps.LatLng(bounds.south, bounds.west);
    const ne = new google.maps.LatLng(bounds.north, bounds.east);
    autocompleteRef.current.setBounds(new google.maps.LatLngBounds(sw, ne));
  }, [bounds]);

  useEffect(() => {
    if (!pendingTextLookup) return;

    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    const controller = new AbortController();
    addressControllerRef.current?.abort();
    addressControllerRef.current = controller;

    debounceTimer.current = window.setTimeout(async () => {
      setIsResolving(true);
      try {
        const result = await geocodeAddress(pendingTextLookup, controller.signal);
        if (result) {
          onChange(result.address);
          onSelect({ lat: result.lat, lng: result.lng, address: result.address });
        } else {
          toast.error("Endereço não encontrado");
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Erro ao geocodificar endereço digitado", error);
          toast.error("Não foi possível localizar o endereço");
        }
      } finally {
        setIsResolving(false);
        setPendingTextLookup(null);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
      }
      controller.abort();
    };
  }, [pendingTextLookup, onChange, onSelect]);

  const handleManualSubmit = useCallback(() => {
    if (!value.trim()) {
      toast.warning("Digite um endereço para buscar");
      return;
    }
    setPendingTextLookup(value.trim());
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleManualSubmit();
          }
        }}
        className="pr-12 border-sky-200 focus:border-sky-500 focus:ring-sky-500"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-2">
        {isResolving ? (
          <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-sky-600" />
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-sky-600 hover:text-sky-700"
          onClick={(event) => {
            event.preventDefault();
            handleManualSubmit();
          }}
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default LocationSearch;
