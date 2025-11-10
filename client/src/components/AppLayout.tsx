import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import ShortcutsHelp from "./ShortcutsHelp";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [, setLocation] = useLocation();

  useKeyboardShortcuts([
    {
      key: "k",
      ctrlKey: true,
      description: "Busca rápida",
      action: () => console.log("Busca rápida"),
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
    {
      key: "?",
      shiftKey: true,
      description: "Mostrar atalhos",
      action: () => setShowShortcuts(true),
    },
  ]);
  
  return (
    <>
      <ShortcutsHelp open={showShortcuts} onOpenChange={setShowShortcuts} />
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 mt-16 lg:mt-0">
          {children}
        </main>
      </div>
    </>
  );
}

