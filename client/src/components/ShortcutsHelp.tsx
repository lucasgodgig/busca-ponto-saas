import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ["Ctrl", "K"], description: "Busca rápida" },
  { keys: ["N"], description: "Novo estudo" },
  { keys: ["H"], description: "Ir para home" },
  { keys: ["M"], description: "Abrir mapa interativo" },
  { keys: ["?"], description: "Mostrar este menu" },
];

export default function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <DialogTitle>Atalhos de Teclado</DialogTitle>
          </div>
          <DialogDescription>
            Use esses atalhos para navegar mais rapidamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <kbd
                    key={keyIndex}
                    className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2">
          Pressione <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border border-border rounded">ESC</kbd> para fechar
        </div>
      </DialogContent>
    </Dialog>
  );
}

