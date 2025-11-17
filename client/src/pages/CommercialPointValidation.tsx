import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, MapPin, DollarSign, Home, User, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function CommercialPointValidation() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [rejectCommentModalOpen, setRejectCommentModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [currentTenantId, setCurrentTenantId] = useState<number | null>(null);

  // Verificar permissão
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
  }, [loading, user, setLocation]);

  // Obter tenant ID do usuário
  useEffect(() => {
    if (user?.memberships && user.memberships.length > 0) {
      setCurrentTenantId(user.memberships[0].tenant.id);
    }
  }, [user]);

  // Queries
  const { data: validationRequests, isLoading, refetch } = trpc.commercialPoints.getValidationRequests.useQuery(
    currentTenantId ? { tenantId: currentTenantId } : { tenantId: 0 },
    { enabled: currentTenantId !== null }
  );

  // Mutations
  const approveMutation = trpc.commercialPoints.approvePoint.useMutation({
    onSuccess: () => {
      toast.success("Ponto comercial aprovado com sucesso!");
      setDetailsModalOpen(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar", { description: error?.message });
    },
  });

  const rejectMutation = trpc.commercialPoints.rejectPoint.useMutation({
    onSuccess: () => {
      toast.success("Ponto comercial rejeitado. Voltará para análise.");
      setRejectCommentModalOpen(false);
      setRejectComment("");
      setDetailsModalOpen(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao rejeitar", { description: error?.message });
    },
  });

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return null;
  }

  const openDetailsModal = (request: any) => {
    setSelectedRequest(request);
    setDetailsModalOpen(true);
  };

  const handleApprove = () => {
    if (!selectedRequest || currentTenantId === null) return;

    approveMutation.mutate({
      requestId: selectedRequest.id,
      tenantId: currentTenantId,
    });
  };

  const handleRejectClick = () => {
    setRejectCommentModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedRequest || currentTenantId === null) return;

    rejectMutation.mutate({
      requestId: selectedRequest.id,
      tenantId: currentTenantId,
      comment: rejectComment,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Validação de Pontos Comerciais</h1>
            <p className="text-muted-foreground">
              Revise e aprove os pontos comerciais preparados pela equipe
            </p>
          </div>
        </div>

        {/* Lista de Solicitações em Validação */}
        <Card>
          <CardHeader>
            <CardTitle>Pontos em Validação</CardTitle>
            <CardDescription>
              {validationRequests?.length || 0} ponto(s) aguardando sua validação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : validationRequests && validationRequests.length > 0 ? (
              <div className="space-y-4">
                {validationRequests.map((request: any) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{request.segment}</h3>
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Validação
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {request.city}
                          {request.neighborhoods && request.neighborhoods.length > 0 && (
                            <span> • {request.neighborhoods.join(", ")}</span>
                          )}
                        </p>

                        {/* Informações do Ponto */}
                        {request.points && request.points.length > 0 && (
                          <div className="bg-muted/50 rounded p-3 mb-3 space-y-2 text-sm">
                            {request.points.map((point: any, idx: number) => (
                              <div key={idx}>
                                <p className="font-medium">{point.address}</p>
                                {point.propertyType && (
                                  <p className="text-xs text-muted-foreground">
                                    <Home className="w-3 h-3 inline mr-1" />
                                    {point.propertyType}
                                  </p>
                                )}
                                {point.totalAreaM2 && (
                                  <p className="text-xs text-muted-foreground">
                                    Área: {point.totalAreaM2} m²
                                  </p>
                                )}
                                {point.rentalPrice && (
                                  <p className="text-xs text-muted-foreground">
                                    <DollarSign className="w-3 h-3 inline mr-1" />
                                    Aluguel: R$ {(point.rentalPrice / 100).toFixed(2)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => openDetailsModal(request)}
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ponto em validação no momento
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Validar Ponto Comercial</DialogTitle>
            <DialogDescription>
              Revise os detalhes do ponto e aprove ou rejeite
            </DialogDescription>
          </DialogHeader>

          {selectedRequest?.points && selectedRequest.points.length > 0 && (
            <div className="space-y-6">
              {selectedRequest.points.map((point: any, idx: number) => (
                <div key={idx} className="space-y-4">
                  {/* Fotos */}
                  {point.photos && point.photos.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Fotos</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {point.photos.map((photo: any, photoIdx: number) => (
                          <div key={photoIdx}>
                            <img
                              src={photo.url}
                              alt={photo.caption || `Foto ${photoIdx + 1}`}
                              className="w-full h-32 object-cover rounded border"
                            />
                            {photo.caption && (
                              <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Informações do Ponto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Endereço</Label>
                      <p className="text-sm text-muted-foreground">{point.address}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Tipo de Imóvel</Label>
                      <p className="text-sm text-muted-foreground">{point.propertyType || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Área Total</Label>
                      <p className="text-sm text-muted-foreground">
                        {point.totalAreaM2 ? `${point.totalAreaM2} m²` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Área Útil</Label>
                      <p className="text-sm text-muted-foreground">
                        {point.usableAreaM2 ? `${point.usableAreaM2} m²` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Valor de Aluguel</Label>
                      <p className="text-sm text-muted-foreground">
                        {point.rentalPrice ? `R$ ${(point.rentalPrice / 100).toFixed(2)}` : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Valor de Venda</Label>
                      <p className="text-sm text-muted-foreground">
                        {point.salePrice ? `R$ ${(point.salePrice / 100).toFixed(2)}` : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Contatos */}
                  <div className="grid grid-cols-2 gap-4">
                    {point.ownerName && (
                      <div>
                        <Label className="text-sm font-medium">Proprietário</Label>
                        <p className="text-sm text-muted-foreground">{point.ownerName}</p>
                        {point.ownerPhone && (
                          <p className="text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 inline mr-1" />
                            {point.ownerPhone}
                          </p>
                        )}
                      </div>
                    )}
                    {point.brokerName && (
                      <div>
                        <Label className="text-sm font-medium">Corretor</Label>
                        <p className="text-sm text-muted-foreground">{point.brokerName}</p>
                        {point.brokerPhone && (
                          <p className="text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 inline mr-1" />
                            {point.brokerPhone}
                          </p>
                        )}
                        {point.brokerEmail && (
                          <p className="text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 inline mr-1" />
                            {point.brokerEmail}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  {point.description && (
                    <div>
                      <Label className="text-sm font-medium">Descrição</Label>
                      <p className="text-sm text-muted-foreground">{point.description}</p>
                    </div>
                  )}

                  {/* Admin Notes */}
                  {point.adminNotes && (
                    <div className="bg-blue-50 dark:bg-blue-950 rounded p-3">
                      <Label className="text-sm font-medium">Observações do Admin</Label>
                      <p className="text-sm text-muted-foreground">{point.adminNotes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectClick}
              disabled={rejectMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Comment Modal */}
      <Dialog open={rejectCommentModalOpen} onOpenChange={setRejectCommentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Ponto Comercial</DialogTitle>
            <DialogDescription>
              Adicione um comentário explicando o motivo da rejeição
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="Ex: Localização não atende aos requisitos, área muito pequena, etc."
              className="min-h-24"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectCommentModalOpen(false);
                setRejectComment("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
