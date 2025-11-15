import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, CheckCircle, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function AdminCommercialPoints() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    neighborhood: "",
    latitude: "",
    longitude: "",
    photos: [] as string[],
    amenities: [] as string[],
    description: "",
  });

  const { data: requests, isLoading, refetch } = trpc.commercialPoints.listRequests.useQuery(
    { tenantId: user?.memberships?.[0]?.tenant?.id || 0 },
    { enabled: !!user?.memberships?.[0]?.tenant?.id }
  );

  const updateStatusMutation = trpc.commercialPoints.updateRequestStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const handleOpenDialog = (request: any) => {
    setSelectedRequest(request);
    setFormData({
      address: "",
      neighborhood: "",
      latitude: "",
      longitude: "",
      photos: [],
      amenities: [],
      description: "",
    });
    setShowDialog(true);
  };

  const handleSavePoint = () => {
    if (!formData.address.trim()) {
      toast.error("Endereço é obrigatório");
      return;
    }

    // Aqui você implementaria a lógica para salvar o ponto comercial
    toast.success("Ponto comercial adicionado com sucesso!");
    setShowDialog(false);
    setSelectedRequest(null);
  };

  const handleStatusChange = (requestId: number, newStatus: string) => {
    updateStatusMutation.mutate({
      requestId,
      status: newStatus,
    });
  };

  const filteredRequests = requests?.filter((req) => {
    const matchesSearch =
      req.segment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    aberto: "bg-yellow-100 text-yellow-800",
    em_analise: "bg-blue-100 text-blue-800",
    concluido: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
  };

  const statusLabel = {
    aberto: "Aberto",
    em_analise: "Em Análise",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  if (!user?.memberships?.[0]?.tenant?.id) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Acesso não autorizado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gerenciar Solicitações de Pontos</h1>
        <p className="text-gray-600 mt-2">Analise e adicione pontos comerciais às solicitações</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por segmento ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Solicitações */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações Pendentes</CardTitle>
          <CardDescription>
            {filteredRequests?.length || 0} solicitação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Bairros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.segment}</TableCell>
                      <TableCell>{request.city}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {Array.isArray(request.neighborhoods)
                          ? request.neighborhoods.join(", ")
                          : request.neighborhoods || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={statusColors[request.status as keyof typeof statusColors] || statusColors.aberto}
                        >
                          {statusLabel[request.status as keyof typeof statusLabel] || request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(request)}
                            className="flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar Ponto
                          </Button>
                          <Select
                            value={request.status}
                            onValueChange={(newStatus) =>
                              handleStatusChange(request.id, newStatus)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aberto">Aberto</SelectItem>
                              <SelectItem value="em_analise">Em Análise</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhuma solicitação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar ponto comercial */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Ponto Comercial</DialogTitle>
            <DialogDescription>
              Preencha os dados do ponto comercial para a solicitação de {selectedRequest?.segment}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Endereço */}
            <div>
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                placeholder="Ex: Rua Principal, 123"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {/* Bairro */}
            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                placeholder="Ex: Centro"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>

            {/* Coordenadas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  placeholder="Ex: -23.5505"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  placeholder="Ex: -46.6333"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <Label htmlFor="description">Descrição do Ponto</Label>
              <Textarea
                id="description"
                placeholder="Descreva as características do ponto comercial..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            {/* Comodidades */}
            <div>
              <Label>Comodidades (separadas por vírgula)</Label>
              <Textarea
                placeholder="Ex: Estacionamento, Ar condicionado, Elevador"
                value={formData.amenities.join(", ")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amenities: e.target.value.split(",").map((a) => a.trim()),
                  })
                }
                rows={3}
              />
            </div>

            {/* Fotos */}
            <div>
              <Label>URLs das Fotos (uma por linha)</Label>
              <Textarea
                placeholder="https://exemplo.com/foto1.jpg&#10;https://exemplo.com/foto2.jpg"
                value={formData.photos.join("\n")}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    photos: e.target.value.split("\n").filter((p) => p.trim()),
                  })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePoint} className="bg-blue-600 hover:bg-blue-700">
              Salvar Ponto Comercial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
