import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Search,
  FileText,
  Map,
  Clock,
  Plus,
  Settings,
  Home,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  
  const { data: studies } = trpc.studies.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId && open }
  );

  // Fechar ao pressionar ESC
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  // Filtrar estudos pela busca
  const filteredStudies = studies?.filter((study) => {
    const searchLower = search.toLowerCase();
    const titleMatch = study.title?.toLowerCase().includes(searchLower);
    const addressMatch = study.address?.toLowerCase().includes(searchLower);
    return titleMatch || addressMatch;
  }).slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg border-0 shadow-none">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar estudos, ações..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            {/* Ações Rápidas */}
            <Command.Group heading="Ações Rápidas" className="mb-2">
              <Command.Item
                onSelect={() => handleSelect(() => setLocation("/app"))}
                className="flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Home className="h-4 w-4" />
                <span>Ir para Home</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => setLocation("/estudos/novo"))}
                className="flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Estudo</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => setLocation("/mapa"))}
                className="flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Map className="h-4 w-4" />
                <span>Mapa Interativo</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => setLocation("/historico"))}
                className="flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Clock className="h-4 w-4" />
                <span>Histórico</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelect(() => setLocation("/configuracoes"))}
                className="flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
              >
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </Command.Item>
            </Command.Group>

            {/* Estudos */}
            {filteredStudies && filteredStudies.length > 0 && (
              <Command.Group heading="Estudos" className="mb-2">
                {filteredStudies.map((study) => (
                  <Command.Item
                    key={study.id}
                    onSelect={() => handleSelect(() => setLocation(`/estudos/${study.id}`))}
                    className="flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer hover:bg-accent"
                  >
                    <FileText className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{study.title}</div>
                      {study.address && (
                        <div className="text-xs text-muted-foreground">{study.address}</div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {study.status === "aberto" && "Aberto"}
                      {study.status === "em_analise" && "Em Análise"}
                      {study.status === "concluido" && "Concluído"}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

