import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Home, Users, DollarSign, Zap, Calendar } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { PhotoGalleryModal } from "@/components/PhotoGallery";

export default function CommercialPointDetails() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/commercial-points/:id");
  const { user } = useAuth();
  const requestId = params?.id ? parseInt(params.id) : 0;
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);

  const { data: request, isLoading, error } = trpc.commercialPoints.getRequest.useQuery(
    { requestId },
    { enabled: !!requestId }
  );

  const { data: commercialPoints } = trpc.commercialPoints.getPoints.useQuery(
    { requestId },
    { enabled: !!requestId && request?.status === "encontrado" }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate("/pontos-comerciais")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Carregando...</h1>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <div className="h-48 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate("/pontos-comerciais")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Erro ao carregar</h1>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Solicitação não encontrada</p>
            <Button onClick={() => navigate("/pontos-comerciais")}>Voltar</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/pontos-comerciais")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">{request.segment}</h1>
              <p className="text-white/80">Detalhes da solicitação</p>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
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
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Header com botão Editar */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Solicitação #{requestId}</h1>
          {request.status === "aberto" && (
            <Button
              onClick={() => navigate(`/pontos-comerciais?highlight=${requestId}`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Editar Solicitação
            </Button>
          )}
        </div>

        {/* Informações Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Informações da Solicitação</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-1 flex-shrink-0" size={20} />
                <div>
                  <p className="text-sm text-muted-foreground">Localização</p>
                  <p className="font-medium">{request.city}</p>
                </div>
              </div>

              {request.neighborhoods && (
                <div className="flex items-start gap-3">
                  <Zap className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Bairros de Interesse</p>
                    <p className="font-medium">{request.neighborhoods}</p>
                  </div>
                </div>
              )}

              {request.socialClass && (
                <div className="flex items-start gap-3">
                  <Users className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Classe Social</p>
                    <p className="font-medium">Classe {request.socialClass}</p>
                  </div>
                </div>
              )}

              {request.propertySize && (
                <div className="flex items-start gap-3">
                  <Home className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Tamanho do Imóvel</p>
                    <p className="font-medium">{request.propertySize} m²</p>
                  </div>
                </div>
              )}

              {request.maxRent && (
                <div className="flex items-start gap-3">
                  <DollarSign className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Máximo de Aluguel</p>
                    <p className="font-medium">R$ {request.maxRent.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              )}

              {request.createdAt && (
                <div className="flex items-start gap-3">
                  <Calendar className="text-primary mt-1 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-sm text-muted-foreground">Data da Solicitação</p>
                    <p className="font-medium">
                      {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-6">Requisitos Adicionais</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{request.requirements}</p>
          </Card>
        </div>

        {/* Pontos Comerciais Encontrados */}
        {request.status === "encontrado" && commercialPoints && commercialPoints.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Pontos Comerciais Encontrados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {commercialPoints.map((point) => (
                <Card key={point.id} className="p-6 hover:shadow-lg transition-all">
                  <h3 className="font-bold text-lg mb-4">{point.address}</h3>

                  <div className="space-y-3 mb-6 text-sm">
                    {point.totalAreaM2 && (
                      <p>
                        <strong>Área Total:</strong> {point.totalAreaM2} m²
                      </p>
                    )}
                    {point.usableAreaM2 && (
                      <p>
                        <strong>Área Útil:</strong> {point.usableAreaM2} m²
                      </p>
                    )}
                    {point.rentalPrice && (
                      <p>
                        <strong>Aluguel:</strong> R$ {(point.rentalPrice / 100).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {point.salePrice && (
                      <p>
                        <strong>Preço de Venda:</strong> R$ {(point.salePrice / 100).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {point.description && (
                      <p>
                        <strong>Descrição:</strong> {point.description}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setSelectedPointId(point.id)}
                  >
                    Ver Fotos
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {request.status === "aberto" && (
          <Card className="p-12 text-center">
            <Zap size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Sua solicitação está sendo processada. Em breve, pontos comerciais serão encontrados.
            </p>
          </Card>
        )}

        {request.status === "cancelado" && (
          <Card className="p-12 text-center">
            <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Esta solicitação foi cancelada.</p>
          </Card>
        )}

        {/* Photo Gallery Modal */}
        {selectedPointId && commercialPoints && (
          <PhotoGalleryModal
            photos={commercialPoints.find((p) => p.id === selectedPointId)?.photos || []}
            isOpen={!!selectedPointId}
            onClose={() => setSelectedPointId(null)}
          />
        )}
      </div>
    </div>
  );
}
