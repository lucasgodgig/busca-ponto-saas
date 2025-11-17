import { useEffect } from "react";
import { useLocation } from "wouter";

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export const shortcuts: ShortcutConfig[] = [
  {
    key: "k",
    ctrlKey: true,
    description: "Busca rápida",
    action: () => {}, // Será sobrescrito
  },
  {
    key: "n",
    description: "Novo estudo",
    action: () => {}, // Será sobrescrito
  },
  {
    key: "h",
    description: "Ir para home",
    action: () => {}, // Será sobrescrito
  },
  {
    key: "m",
    description: "Abrir mapa interativo",
    action: () => {}, // Será sobrescrito
  },
  {
    key: "?",
    shiftKey: true,
    description: "Mostrar atalhos",
    action: () => {}, // Será sobrescrito
  },
];

export function useKeyboardShortcuts(customShortcuts?: ShortcutConfig[]) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const allShortcuts = customShortcuts || [
      {
        key: "k",
        ctrlKey: true,
        description: "Busca rápida",
        action: () => {
          // TODO: Implementar busca rápida
          console.log("Busca rápida");
        },
      },
      {
        key: "n",
        description: "Novo estudo",
        action: () => setLocation("/estudos/novo"),
      },
      {
        key: "h",
        description: "Ir para home",
        action: () => setLocation("/app"),
      },
      {
        key: "m",
        description: "Abrir mapa interativo",
        action: () => setLocation("/mapa"),
      },
    ];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Exceto Ctrl+K que funciona em qualquer lugar
        if (!(e.ctrlKey && e.key === "k")) {
          return;
        }
      }

      for (const shortcut of allShortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;

        if (keyMatch && ctrlMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLocation, customShortcuts]);
}

