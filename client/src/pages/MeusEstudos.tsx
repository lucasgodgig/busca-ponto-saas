import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState } from "react";
import { Loader2, FileText, Download, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  pendente: {
    label: "Pendente",
    icon: Clock,
    variant: "secondary" as const,
    description: "Aguardando análise da equipe",
  },
  em_analise: {
    label: "Em Análise",
    icon: AlertCircle,
    variant: "default" as const,
    description: "Nossa equipe está trabalhando no seu estudo",
  },
  concluido: {
    label: "Concluído",
    icon: CheckCircle2,
    variant: "default" as const,
    description: "Estudo pronto para download",
  },
  cancelado: {
    label: "Cancelado",
    icon: AlertCircle,
    variant: "destructive" as const,
    description: "Solicitação cancelada",
  },
};

export default function MeusEstudos() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const tenantId = user?.memberships?.[0]?.tenant?.id;

  const handleDownloadPdf = async (pdfUrl: string, title: string) => {
    try {
      setDownloadingId(Math.random() as any);
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("Falha ao baixar arquivo");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: requests, isLoading } = trpc.studyRequests.myRequests.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Meus Estudos</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe suas solicitações de estudos de mercado
            </p>
          </div>
          <Button onClick={() => setLocation("/solicitar-estudo")}>
            <Plus className="w-4 h-4 mr-2" />
            Solicitar Novo Estudo
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !requests || requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum estudo solicitado</h3>
              <p className="text-muted-foreground text-center mb-6">
                Você ainda não solicitou nenhum estudo de mercado.
                <br />
                Clique no botão acima para fazer sua primeira solicitação.
              </p>
              <Button onClick={() => setLocation("/solicitar-estudo")}>
                <Plus className="w-4 h-4 mr-2" />
                Solicitar Estudo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;

              return (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-primary" />
                          {request.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {request.address}
                          {request.radiusM && ` • Raio: ${(request.radiusM / 1000).toFixed(1)}km`}
                        </CardDescription>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1.5">
                        <StatusIcon className="w-3.5 h-3.5" />
                        {status.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.segment && (
                      <div>
                        <span className="text-sm font-medium">Segmento:</span>{" "}
                        <span className="text-sm text-muted-foreground">{request.segment}</span>
                      </div>
                    )}

                    {request.description && (
                      <div>
                        <span className="text-sm font-medium">Descrição:</span>
                        <p className="text-sm text-muted-foreground mt-1">{request.description}</p>
                      </div>
                    )}

                    {request.objectives && (
                      <div>
                        <span className="text-sm font-medium">Objetivos:</span>
                        <p className="text-sm text-muted-foreground mt-1">{request.objectives}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        Solicitado{" "}
                        {formatDistanceToNow(new Date(request.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>

                      {request.status === "concluido" && request.pdfUrl ? (
                        <Button
                          onClick={() => handleDownloadPdf(request.pdfUrl!, request.title)}
                          disabled={downloadingId !== null}
                        >
                          {downloadingId !== null ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Baixando...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Baixar Estudo (PDF)
                            </>
                          )}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          {status.description}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

