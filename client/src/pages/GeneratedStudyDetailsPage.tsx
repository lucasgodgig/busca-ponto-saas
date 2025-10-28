import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Download, ArrowLeft } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  queued: "Na Fila",
  processing: "Processando",
  done: "Concluído",
  error: "Erro",
};

export default function GeneratedStudyDetailsPage() {
  const { studyId } = useParams<{ studyId: string }>();
  const { data: study, isLoading } = trpc.generatedStudies.get.useQuery(
    { studyId: parseInt(studyId || "0") },
    { enabled: !!studyId }
  );

  if (isLoading) {
    return <div className="p-4">Carregando estudo...</div>;
  }

  if (!study) {
    return <div className="p-4">Estudo não encontrado</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Button variant="ghost" className="mb-4" asChild>
        <a href="/generated-studies">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </a>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{study.title}</CardTitle>
              <CardDescription>{study.segment}</CardDescription>
            </div>
            <Badge>{STATUS_LABELS[study.status] || study.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Localização</p>
              <p className="font-medium">{study.lat}, {study.lng}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Raio de Análise</p>
              <p className="font-medium">{(study.radiusM / 1000).toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{STATUS_LABELS[study.status]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Criado em</p>
              <p className="font-medium">{new Date(study.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {/* Notas */}
          {study.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Notas</p>
              <p className="bg-gray-50 p-3 rounded">{study.notes}</p>
            </div>
          )}

          {/* Resultados */}
          {study.status === "done" && (
            <div className="space-y-3">
              <h3 className="font-semibold">Resultados</h3>
              <div className="flex gap-2">
                {study.pdfUrl && (
                  <Button asChild variant="outline">
                    <a href={study.pdfUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar PDF
                    </a>
                  </Button>
                )}
                {study.resultJsonUrl && (
                  <Button asChild variant="outline">
                    <a href={study.resultJsonUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar JSON
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Mensagem de Erro */}
          {study.status === "error" && study.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">{study.errorMessage}</p>
            </div>
          )}

          {/* Status de Processamento */}
          {study.status === "processing" && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-800">
                Este estudo está sendo processado. Você receberá uma notificação quando estiver pronto.
              </p>
            </div>
          )}

          {study.status === "queued" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-sm text-yellow-800">
                Este estudo está na fila de processamento. Será processado em breve.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

