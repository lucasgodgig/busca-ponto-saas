import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function EditCommercialPointRequest() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/commercial-points/:id/edit");
  const { user } = useAuth();
  const requestId = params?.id ? parseInt(params.id) : 0;

  const { data: request, isLoading, error } = trpc.commercialPoints.getRequest.useQuery(
    { requestId },
    { enabled: !!requestId }
  );

  const [formData, setFormData] = useState({
    segment: "",
    city: "",
    neighborhoods: "",
    requirements: "",
    budget: "",
    notes: "",
  });

  // Preencher form quando dados carregarem
  const [isInitialized, setIsInitialized] = useState(false);
  if (request && !isInitialized) {
    setFormData({
      segment: request.segment || "",
      city: request.city || "",
      neighborhoods: request.neighborhoodsJson?.join(", ") || "",
      requirements: request.requirementsJson?.join(", ") || "",
      budget: request.budgetJson?.max?.toString() || "",
      notes: request.notes || "",
    });
    setIsInitialized(true);
  }

  const updateMutation = trpc.commercialPoints.updateRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação atualizada com sucesso!");
      navigate(`/commercial-points/${requestId}`);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!request) return;

    // Validar status
    if (request.status !== "aberto") {
      toast.error("Apenas solicitações em status 'aberto' podem ser editadas");
      return;
    }

    updateMutation.mutate({
      requestId,
      segment: formData.segment,
      city: formData.city,
      neighborhoods: formData.neighborhoods.split(",").map((n) => n.trim()),
      requirements: formData.requirements.split(",").map((r) => r.trim()),
      budget: formData.budget ? parseInt(formData.budget) : undefined,
      notes: formData.notes,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate("/pontos-comerciais")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold">Carregando...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate("/pontos-comerciais")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold">Erro ao carregar</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">Solicitação não encontrada</p>
          </Card>
        </div>
      </div>
    );
  }

  // Verificar se pode editar
  const canEdit = request.status === "aberto";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(`/commercial-points/${requestId}`)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold">Editar Solicitação</h1>
            <p className="text-white/80">ID: {requestId}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Status Alert */}
        {!canEdit && (
          <Card className="p-4 border-yellow-200 bg-yellow-50">
            <div className="flex gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900">Não é possível editar</p>
                <p className="text-sm text-yellow-800">
                  Esta solicitação está em status "{request.status}" e não pode ser editada.
                  Apenas solicitações em status "aberto" podem ser modificadas.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Segment */}
            <div>
              <label className="block text-sm font-medium mb-2">Segmento</label>
              <input
                type="text"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Ex: Alimentação, Varejo, Serviços"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium mb-2">Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Ex: São Paulo"
              />
            </div>

            {/* Neighborhoods */}
            <div>
              <label className="block text-sm font-medium mb-2">Bairros (separados por vírgula)</label>
              <textarea
                value={formData.neighborhoods}
                onChange={(e) => setFormData({ ...formData, neighborhoods: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Ex: Centro, Vila Mariana, Pinheiros"
              />
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium mb-2">Requisitos (separados por vírgula)</label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={3}
                placeholder="Ex: Estacionamento, Elevador, Área mínima 100m²"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium mb-2">Orçamento Máximo (R$)</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Ex: 5000"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Observações</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed"
                rows={4}
                placeholder="Informações adicionais sobre a solicitação"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/commercial-points/${requestId}`)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!canEdit || updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
