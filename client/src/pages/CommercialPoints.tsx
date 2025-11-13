import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, MapPin } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CommercialPoints() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    segment: "",
    address: "",
    lat: "",
    lng: "",
    radiusM: 1500,
    requirements: "",
  });

  const { data: requests, isLoading } = trpc.commercialPoints.listRequests.useQuery(
    { tenantId: user?.memberships?.[0]?.tenant?.id || 0 },
    { enabled: !!user?.memberships?.[0]?.tenant?.id }
  );

  const createRequestMutation = trpc.commercialPoints.createRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação criada com sucesso!");
      setFormData({
        segment: "",
        address: "",
        lat: "",
        lng: "",
        radiusM: 1500,
        requirements: "",
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar solicitação");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.memberships?.[0]?.tenant?.id) {
      toast.error("Tenant não encontrado");
      return;
    }

    createRequestMutation.mutate({
      tenantId: user.memberships[0].tenant.id,
      segment: formData.segment,
      address: formData.address,
      lat: formData.lat,
      lng: formData.lng,
      radiusM: formData.radiusM,
      requirements: formData.requirements,
    });
  };

  const tenantId = user?.memberships?.[0]?.tenant?.id;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Pontos Comerciais</h1>
              <p className="text-white/80">Solicite indicações de pontos comerciais</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-primary hover:bg-white/90"
            size="lg"
          >
            <Plus size={20} />
            Nova Solicitação
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Formulário de Solicitação */}
        {showForm && (
          <Card className="p-6 mb-8 border-2 border-primary/20 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">Solicitar Indicação de Ponto</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Segmento do Negócio *</label>
                  <Input
                    type="text"
                    placeholder="Ex: Farmácia, Restaurante, Academia"
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Endereço *</label>
                  <Input
                    type="text"
                    placeholder="Ex: Av. Paulista, 1000, São Paulo"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Latitude</label>
                  <Input
                    type="text"
                    placeholder="-23.5505"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Longitude</label>
                  <Input
                    type="text"
                    placeholder="-46.6333"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Raio (metros)</label>
                  <Input
                    type="number"
                    min="100"
                    max="5000"
                    value={formData.radiusM}
                    onChange={(e) => setFormData({ ...formData, radiusM: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Requisitos Adicionais</label>
                <Textarea
                  placeholder="Descreva características específicas que você procura no ponto comercial..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="flex-1"
                >
                  {createRequestMutation.isPending ? "Criando..." : "Criar Solicitação"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Lista de Solicitações */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Minhas Solicitações</h2>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
              {requests.map((request, index) => (
                <Card
                  key={request.id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{request.segment}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                        <MapPin size={16} />
                        {request.address}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === "aberto"
                          ? "bg-yellow-100 text-yellow-800"
                          : request.status === "encontrado"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {request.status === "aberto"
                        ? "Aberto"
                        : request.status === "encontrado"
                          ? "Encontrado"
                          : "Cancelado"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <p className="text-muted-foreground">
                      <strong>Raio:</strong> {request.radiusM}m
                    </p>
                    {request.requirements && (
                      <p className="text-muted-foreground line-clamp-2">
                        <strong>Requisitos:</strong> {request.requirements}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/commercial-points/${request.id}`)}
                  >
                    Ver Detalhes
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma solicitação ainda</p>
              <Button onClick={() => setShowForm(true)}>Criar Primeira Solicitação</Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

