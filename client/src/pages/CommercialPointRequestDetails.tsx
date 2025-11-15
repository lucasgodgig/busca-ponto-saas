import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, DollarSign, Home, Users, AlertCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusConfig = {
  aberto: {
    label: "Aberto",
    variant: "secondary" as const,
  },
  em_busca: {
    label: "Em Busca",
    variant: "default" as const,
  },
  encontrado: {
    label: "Encontrado",
    variant: "default" as const,
  },
  cancelado: {
    label: "Cancelado",
    variant: "destructive" as const,
  },
};

export default function CommercialPointRequestDetails() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const requestId = parseInt(params.id || "0");

  // Query para buscar detalhes da solicitação
  const { data: request, isLoading: requestLoading } = trpc.commercialPoints.getRequest.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  // Query para buscar pontos comerciais associados
  const { data: points, isLoading: pointsLoading } = trpc.commercialPoints.getPoints.useQuery(
    { requestId },
    { enabled: requestId > 0 }
  );

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  if (loading || requestLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setLocation("/admin-bp/pontos-comerciais")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="mt-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Solicitação não encontrada</p>
          </div>
        </div>
      </div>
    );
  }

  const neighborhoods = Array.isArray(request.neighborhoods)
    ? request.neighborhoods
    : request.neighborhoods
    ? request.neighborhoods.split(",").map((n: string) => n.trim())
    : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header com botão voltar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setLocation("/admin-bp/pontos-comerciais")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Badge variant={statusConfig[request.status as keyof typeof statusConfig]?.variant || "secondary"}>
            {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
          </Badge>
        </div>

        {/* Informações Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Solicitação</CardTitle>
            <CardDescription>
              Criada {formatDistanceToNow(new Date(request.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grid de informações principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Segmento */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Segmento</label>
                <p className="text-lg font-semibold">{request.segment}</p>
              </div>

              {/* Cidade */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Cidade
                </label>
                <p className="text-lg font-semibold">{request.city}</p>
              </div>

              {/* Classe Social */}
              {request.socialClass && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Classe Social
                  </label>
                  <p className="text-lg font-semibold">Classe {request.socialClass}</p>
                </div>
              )}

              {/* Tamanho do Imóvel */}
              {request.propertySize && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Tamanho do Imóvel
                  </label>
                  <p className="text-lg font-semibold">{request.propertySize} m²</p>
                </div>
              )}

              {/* Valor Máximo de Aluguel */}
              {request.maxRent && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Valor Máximo de Aluguel
                  </label>
                  <p className="text-lg font-semibold">
                    R$ {(request.maxRent / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Bairros */}
            {neighborhoods.length > 0 && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">Bairros de Interesse</label>
                <div className="flex flex-wrap gap-2">
                  {neighborhoods.map((neighborhood: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {neighborhood}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Requisitos */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Requisitos Adicionais</label>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{request.requirements}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pontos Comerciais Indicados */}
        <Card>
          <CardHeader>
            <CardTitle>Pontos Comerciais Indicados</CardTitle>
            <CardDescription>
              {points?.length || 0} ponto(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pointsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : points && points.length > 0 ? (
              <div className="space-y-4">
                {points.map((point: any) => (
                  <div key={point.id} className="border rounded-lg p-4 space-y-3">
                    {/* Endereço */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">{point.address}</p>
                        <p className="text-sm text-muted-foreground">
                          Lat: {point.lat}, Lng: {point.lng}
                        </p>
                      </div>
                    </div>

                    {/* Informações do Imóvel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted p-3 rounded">
                      {point.propertyType && (
                        <div>
                          <p className="text-sm text-muted-foreground">Tipo de Imóvel</p>
                          <p className="font-semibold">{point.propertyType}</p>
                        </div>
                      )}
                      {point.totalAreaM2 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Área Total</p>
                          <p className="font-semibold">{point.totalAreaM2} m²</p>
                        </div>
                      )}
                      {point.usableAreaM2 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Área Útil</p>
                          <p className="font-semibold">{point.usableAreaM2} m²</p>
                        </div>
                      )}
                      {point.rentalPrice && (
                        <div>
                          <p className="text-sm text-muted-foreground">Valor de Aluguel</p>
                          <p className="font-semibold">
                            R$ {(point.rentalPrice / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {point.salePrice && (
                        <div>
                          <p className="text-sm text-muted-foreground">Valor de Venda</p>
                          <p className="font-semibold">
                            R$ {(point.salePrice / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Informações de Contato */}
                    {(point.ownerName || point.brokerName) && (
                      <div className="border-t pt-3 space-y-2">
                        {point.ownerName && (
                          <div>
                            <p className="text-sm text-muted-foreground">Proprietário</p>
                            <p className="font-semibold">{point.ownerName}</p>
                            {point.ownerPhone && (
                              <p className="text-sm text-muted-foreground">{point.ownerPhone}</p>
                            )}
                          </div>
                        )}
                        {point.brokerName && (
                          <div>
                            <p className="text-sm text-muted-foreground">Corretor</p>
                            <p className="font-semibold">{point.brokerName}</p>
                            {point.brokerPhone && (
                              <p className="text-sm text-muted-foreground">{point.brokerPhone}</p>
                            )}
                            {point.brokerEmail && (
                              <p className="text-sm text-muted-foreground">{point.brokerEmail}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Descrição */}
                    {point.description && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-muted-foreground">Descrição</p>
                        <p className="text-sm">{point.description}</p>
                      </div>
                    )}

                    {/* Amenidades */}
                    {point.amenitiesJson && point.amenitiesJson.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-muted-foreground mb-2">Amenidades</p>
                        <div className="flex flex-wrap gap-2">
                          {point.amenitiesJson.map((amenity: string, index: number) => (
                            <Badge key={index} variant="outline">
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fotos */}
                    {point.photos && point.photos.length > 0 && (
                      <div className="border-t pt-3">
                        <p className="text-sm text-muted-foreground mb-2">Fotos</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {point.photos.map((photo: any) => (
                            <div key={photo.id} className="relative group">
                              <img
                                src={photo.url}
                                alt={photo.caption || "Foto do ponto comercial"}
                                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition"
                              />
                              {photo.caption && (
                                <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ponto comercial indicado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
