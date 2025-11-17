import { useLocation } from "wouter";

export default function EditCommercialPointRequest() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/pontos-comerciais")}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            ← Voltar
          </button>
          <h1 className="text-3xl font-bold">Editar Solicitação</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Esta página será implementada em breve.</p>
      </div>
    </div>
  );
}
