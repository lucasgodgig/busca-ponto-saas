import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle2, Clock, AlertCircle, Send, Upload, X } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const statusConfig = {
  aberto: {
    label: "Aberto",
    icon: Clock,
    variant: "secondary" as const,
  },
  em_busca: {
    label: "Em Busca",
    icon: AlertCircle,
    variant: "default" as const,
  },
  em_analise: {
    label: "Em Análise",
    icon: AlertCircle,
    variant: "default" as const,
  },
  validacao: {
    label: "Validação",
    icon: CheckCircle2,
    variant: "default" as const,
  },
  encontrado: {
    label: "Encontrado",
    icon: CheckCircle2,
    variant: "default" as const,
  },
  cancelado: {
    label: "Cancelado",
    icon: AlertCircle,
    variant: "destructive" as const,
  },
};

export default function AdminCommercialPointRequests() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [photoCaption, setPhotoCaption] = useState("");

  // Form data for point details
  const [pointData, setPointData] = useState({
    address: "",
    lat: "",
    lng: "",
    propertyType: "",
    totalAreaM2: "",
    usableAreaM2: "",
    rentalPrice: "",
    salePrice: "",
    ownerName: "",
    ownerPhone: "",
    brokerName: "",
    brokerPhone: "",
    brokerEmail: "",
    description: "",
    amenities: [] as string[],
  });

  // Queries
  const { data: requests, isLoading, refetch } = trpc.commercialPoints.getRequestsForAdmin.useQuery(
    { tenantId: undefined }
  );

  // Mutations
  const updatePointMutation = trpc.commercialPoints.updatePointData.useMutation({
    onSuccess: () => {
      toast.success("Dados do ponto atualizados com sucesso");
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar", { description: error?.message });
    },
  });

  const sendToValidationMutation = trpc.commercialPoints.sendToValidation.useMutation({
    onSuccess: () => {
      toast.success("Ponto enviado para validação com sucesso!");
      setEditModalOpen(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar para validação", { description: error?.message });
    },
  });

  const addPhotoMutation = trpc.commercialPoints.addPhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto adicionada com sucesso");
      setPhotoCaption("");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar foto", { description: error?.message });
    },
  });

  // Verificar permissão
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin_bp")) {
      setLocation("/app");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user || user.role !== "admin_bp") {
    return null;
  }

  const filteredRequests = requests?.filter((req: any) => {
    return statusFilter === "all" || req.status === statusFilter;
  });

  const openDetailsModal = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    setDetailsModalOpen(true);
  };

  const openEditModal = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    
    // Carregar dados do ponto se existir
    const point = request.points?.[0];
    if (point) {
      setPointData({
        address: point.address || "",
        lat: point.lat || "",
        lng: point.lng || "",
        propertyType: point.propertyType || "",
        totalAreaM2: point.totalAreaM2?.toString() || "",
        usableAreaM2: point.usableAreaM2?.toString() || "",
        rentalPrice: point.rentalPrice?.toString() || "",
        salePrice: point.salePrice?.toString() || "",
        ownerName: point.ownerName || "",
        ownerPhone: point.ownerPhone || "",
        brokerName: point.brokerName || "",
        brokerPhone: point.brokerPhone || "",
        brokerEmail: point.brokerEmail || "",
        description: point.description || "",
        amenities: point.amenitiesJson || [],
      });
      setUploadedPhotos(point.photos || []);
    } else {
      setPointData({
        address: "",
        lat: "",
        lng: "",
        propertyType: "",
        totalAreaM2: "",
        usableAreaM2: "",
        rentalPrice: "",
        salePrice: "",
        ownerName: "",
        ownerPhone: "",
        brokerName: "",
        brokerPhone: "",
        brokerEmail: "",
        description: "",
        amenities: [],
      });
      setUploadedPhotos([]);
    }
    
    setEditModalOpen(true);
  };

  const handleSavePointData = () => {
    if (!selectedRequest?.points?.[0]) {
      toast.error("Nenhum ponto encontrado para atualizar");
      return;
    }

    const point = selectedRequest.points[0];
    updatePointMutation.mutate({
      pointId: point.id,
      tenantId: selectedRequest.tenantId,
      address: pointData.address || undefined,
      lat: pointData.lat || undefined,
      lng: pointData.lng || undefined,
      propertyType: pointData.propertyType || undefined,
      totalAreaM2: pointData.totalAreaM2 ? parseInt(pointData.totalAreaM2) : undefined,
      usableAreaM2: pointData.usableAreaM2 ? parseInt(pointData.usableAreaM2) : undefined,
      rentalPrice: pointData.rentalPrice ? parseInt(pointData.rentalPrice) : undefined,
      salePrice: pointData.salePrice ? parseInt(pointData.salePrice) : undefined,
      ownerName: pointData.ownerName || undefined,
      ownerPhone: pointData.ownerPhone || undefined,
      brokerName: pointData.brokerName || undefined,
      brokerPhone: pointData.brokerPhone || undefined,
      brokerEmail: pointData.brokerEmail || undefined,
      description: pointData.description || undefined,
      amenitiesJson: pointData.amenities,
      adminNotes: adminNotes || undefined,
    });
  };

  const handleSendToValidation = () => {
    if (!selectedRequest) return;

    sendToValidationMutation.mutate({
      requestId: selectedRequest.id,
      tenantId: selectedRequest.tenantId,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Apenas arquivos de imagem são permitidos");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande (máximo 10MB)");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setUploadedPhotos([...uploadedPhotos, {
          url: preview,
          caption: photoCaption,
          order: uploadedPhotos.length,
        }]);
        setPhotoCaption("");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Solicitações de Pontos Comerciais</h1>
            <p className="text-muted-foreground">Gerencie as solicitações de pontos comerciais dos usuários</p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Filtre por status</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_busca">Em Busca</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="validacao">Validação</SelectItem>
                <SelectItem value="encontrado">Encontrado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Tabela de Solicitações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Solicitações</CardTitle>
              <CardDescription>
                {filteredRequests?.length || 0} solicitação(ões) encontrada(s)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request: any) => {
                    const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.aberto;
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.segment}</TableCell>
                        <TableCell>{request.city}</TableCell>
                        <TableCell>
                          <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailsModal(request)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            {request.status === "aberto" || request.status === "em_analise" ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openEditModal(request)}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma solicitação encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>
              Segmento: {selectedRequest?.segment} | Cidade: {selectedRequest?.city}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Segmento</Label>
                <p className="text-sm text-muted-foreground">{selectedRequest?.segment}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Cidade</Label>
                <p className="text-sm text-muted-foreground">{selectedRequest?.city}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Bairros</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest?.neighborhoods?.join(", ") || "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Classe Social</Label>
                <p className="text-sm text-muted-foreground">{selectedRequest?.socialClass || "N/A"}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Tamanho do Imóvel</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest?.propertySize ? `${selectedRequest.propertySize} m²` : "N/A"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Aluguel Máximo</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedRequest?.maxRent ? `R$ ${selectedRequest.maxRent}` : "N/A"}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Requisitos</Label>
              <p className="text-sm text-muted-foreground">{selectedRequest?.requirements}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ponto Comercial</DialogTitle>
            <DialogDescription>
              Adicione dados e imagens do ponto comercial
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Fotos */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Fotos do Ponto</Label>
              <div className="space-y-2">
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {uploadedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Foto ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1"
                          onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        {photo.caption && (
                          <p className="text-xs text-muted-foreground mt-1">{photo.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Input
                    placeholder="Legenda da foto (opcional)"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Adicionar Foto
                  </Button>
                </div>
              </div>
            </div>

            {/* Dados do Ponto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={pointData.address}
                  onChange={(e) => setPointData({ ...pointData, address: e.target.value })}
                  placeholder="Rua, número, complemento"
                />
              </div>
              <div>
                <Label htmlFor="propertyType">Tipo de Imóvel</Label>
                <Input
                  id="propertyType"
                  value={pointData.propertyType}
                  onChange={(e) => setPointData({ ...pointData, propertyType: e.target.value })}
                  placeholder="Loja, Sala, Galpão, etc"
                />
              </div>
              <div>
                <Label htmlFor="totalAreaM2">Área Total (m²)</Label>
                <Input
                  id="totalAreaM2"
                  type="number"
                  value={pointData.totalAreaM2}
                  onChange={(e) => setPointData({ ...pointData, totalAreaM2: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="usableAreaM2">Área Útil (m²)</Label>
                <Input
                  id="usableAreaM2"
                  type="number"
                  value={pointData.usableAreaM2}
                  onChange={(e) => setPointData({ ...pointData, usableAreaM2: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="rentalPrice">Valor de Aluguel (R$)</Label>
                <Input
                  id="rentalPrice"
                  type="number"
                  value={pointData.rentalPrice}
                  onChange={(e) => setPointData({ ...pointData, rentalPrice: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="salePrice">Valor de Venda (R$)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  value={pointData.salePrice}
                  onChange={(e) => setPointData({ ...pointData, salePrice: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="ownerName">Nome do Proprietário</Label>
                <Input
                  id="ownerName"
                  value={pointData.ownerName}
                  onChange={(e) => setPointData({ ...pointData, ownerName: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="ownerPhone">Telefone do Proprietário</Label>
                <Input
                  id="ownerPhone"
                  value={pointData.ownerPhone}
                  onChange={(e) => setPointData({ ...pointData, ownerPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <Label htmlFor="brokerName">Nome do Corretor</Label>
                <Input
                  id="brokerName"
                  value={pointData.brokerName}
                  onChange={(e) => setPointData({ ...pointData, brokerName: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="brokerPhone">Telefone do Corretor</Label>
                <Input
                  id="brokerPhone"
                  value={pointData.brokerPhone}
                  onChange={(e) => setPointData({ ...pointData, brokerPhone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="brokerEmail">Email do Corretor</Label>
                <Input
                  id="brokerEmail"
                  type="email"
                  value={pointData.brokerEmail}
                  onChange={(e) => setPointData({ ...pointData, brokerEmail: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={pointData.description}
                onChange={(e) => setPointData({ ...pointData, description: e.target.value })}
                placeholder="Descreva o ponto comercial..."
                className="min-h-24"
              />
            </div>

            <div>
              <Label htmlFor="adminNotes">Observações do Admin</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Adicione observações sobre o ponto..."
                className="min-h-24"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={handleSavePointData}
              disabled={updatePointMutation.isPending}
            >
              Salvar Dados
            </Button>
            <Button
              onClick={handleSendToValidation}
              disabled={sendToValidationMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar para Validação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
