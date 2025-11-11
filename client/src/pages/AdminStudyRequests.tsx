import { useState, useRef } from "react";
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
import { FileText, Upload, Loader2, Download, Eye, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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

const statusConfig = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    variant: "secondary" as const,
  },
  em_analise: {
    label: "Em Análise",
    icon: AlertCircle,
    variant: "default" as const,
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle2,
    variant: "default" as const,
  },
  cancelado: {
    label: "Cancelado",
    icon: AlertCircle,
    variant: "destructive" as const,
  },
};

export default function AdminStudyRequests() {
  const { user, loading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: requests, isLoading, refetch } = trpc.studyRequests.listAll.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter as any }
  );

  // Mutations
  const updateMutation = trpc.studyRequests.update.useMutation({
    onSuccess: () => {
      toast.success("Solicitação atualizada com sucesso");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar", { description: error.message });
    },
  });

  const uploadPdfMutation = trpc.studyRequests.uploadPdf.useMutation({
    onSuccess: () => {
      toast.success("PDF enviado com sucesso!");
      setUploadModalOpen(false);
      setSelectedRequest(null);
      setPdfFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao enviar PDF", { description: error.message });
    },
  });

  const handleStatusChange = (requestId: number, newStatus: string) => {
    updateMutation.mutate({
      id: requestId,
      status: newStatus as any,
    });
  };

  const handlePriorityChange = (requestId: number, newPriority: string) => {
    updateMutation.mutate({
      id: requestId,
      priority: newPriority as any,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Apenas arquivos PDF são permitidos");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        // 50MB
        toast.error("Arquivo muito grande (máximo 50MB)");
        return;
      }
      setPdfFile(file);
    }
  };

  const handleUploadPdf = async () => {
    if (!pdfFile || !selectedRequest) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(",")[1]; // Remove "data:application/pdf;base64,"

      uploadPdfMutation.mutate({
        requestId: selectedRequest.request.id,
        pdfBase64: base64Data,
        filename: pdfFile.name,
      });
    };
    reader.readAsDataURL(pdfFile);
  };

  const openDetailsModal = (request: any) => {
    setSelectedRequest(request);
    setAdminNotes(request.request.adminNotes || "");
    setDetailsModalOpen(true);
  };

  const openUploadModal = (request: any) => {
    setSelectedRequest(request);
    setPdfFile(null);
    setUploadModalOpen(true);
  };

  const saveAdminNotes = () => {
    if (!selectedRequest) return;
    updateMutation.mutate({
      id: selectedRequest.request.id,
      adminNotes,
    });
    setDetailsModalOpen(false);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user.role !== "admin_bp" && user.role !== "analyst_bp") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Acesso negado. Apenas administradores BP podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Solicitações de Estudos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie solicitações de estudos dos clientes
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-muted-foreground">
                {statusFilter === "all"
                  ? "Não há solicitações de estudos no momento."
                  : `Não há solicitações com status "${statusConfig[statusFilter as keyof typeof statusConfig]?.label}".`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((item) => {
                    const status = statusConfig[item.request.status];
                    const StatusIcon = status.icon;

                    return (
                      <TableRow key={item.request.id}>
                        <TableCell className="font-mono text-sm">#{item.request.id}</TableCell>
                        <TableCell className="font-medium">{item.request.title}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.creator?.name || "N/A"}</div>
                            <div className="text-sm text-muted-foreground">{item.creator?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.tenant?.name || "N/A"}</TableCell>
                        <TableCell>
                          <Select
                            value={item.request.status}
                            onValueChange={(value) => handleStatusChange(item.request.id, value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <Badge variant={status.variant} className="flex items-center gap-1.5">
                                <StatusIcon className="w-3.5 h-3.5" />
                                {status.label}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_analise">Em Análise</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.request.priority}
                            onValueChange={(value) => handlePriorityChange(item.request.id, value)}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baixa">Baixa</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.request.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetailsModal(item)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {item.request.pdfUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a href={item.request.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openUploadModal(item)}
                              >
                                <Upload className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação #{selectedRequest?.request.id}</DialogTitle>
            <DialogDescription>Informações completas da solicitação</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold">Título</Label>
                <p className="text-sm">{selectedRequest.request.title}</p>
              </div>
              {selectedRequest.request.segment && (
                <div>
                  <Label className="font-semibold">Segmento</Label>
                  <p className="text-sm">{selectedRequest.request.segment}</p>
                </div>
              )}
              <div>
                <Label className="font-semibold">Endereço</Label>
                <p className="text-sm">{selectedRequest.request.address}</p>
              </div>
              {selectedRequest.request.radiusM && (
                <div>
                  <Label className="font-semibold">Raio de Análise</Label>
                  <p className="text-sm">{(selectedRequest.request.radiusM / 1000).toFixed(1)}km</p>
                </div>
              )}
              {selectedRequest.request.description && (
                <div>
                  <Label className="font-semibold">Descrição</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.request.description}</p>
                </div>
              )}
              {selectedRequest.request.objectives && (
                <div>
                  <Label className="font-semibold">Objetivos</Label>
                  <p className="text-sm whitespace-pre-wrap">{selectedRequest.request.objectives}</p>
                </div>
              )}
              <div>
                <Label className="font-semibold">Notas Internas (Admin)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione notas internas sobre esta solicitação..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={saveAdminNotes}>Salvar Notas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload PDF Modal */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload do Estudo Finalizado</DialogTitle>
            <DialogDescription>
              Envie o PDF do estudo pronto para o cliente #{selectedRequest?.request.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo PDF</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
              {pdfFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Arquivo selecionado: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUploadPdf}
              disabled={!pdfFile || uploadPdfMutation.isPending}
            >
              {uploadPdfMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

