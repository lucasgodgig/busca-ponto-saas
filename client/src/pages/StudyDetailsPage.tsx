import React from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MapPin, Clock, User } from "lucide-react";
import StudyComments from "@/components/StudyComments";
import { useLocation } from "wouter";

const statusLabels = {
  aberto: "Aberto",
  em_analise: "Em Análise",
  devolvido: "Devolvido",
  concluido: "Concluído",
};

const statusColors = {
  aberto: "bg-blue-100 text-blue-800",
  em_analise: "bg-yellow-100 text-yellow-800",
  devolvido: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

const priorityColors = {
  baixa: "bg-gray-100 text-gray-800",
  media: "bg-orange-100 text-orange-800",
  alta: "bg-red-100 text-red-800",
};

export default function StudyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = React.useState<number | null>(null);

  // Selecionar tenant automaticamente
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  // Buscar estudo específico
  const { data: study, isLoading } = trpc.studies.get.useQuery(
    { tenantId: selectedTenant!, studyId: parseInt(id || "0") },
    { enabled: !!selectedTenant && !!id }
  );

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!study) {
    return (
      <div className="min-h-screen p-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => setLocation("/estudos")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-gray-500">Estudo não encontrado</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/estudos")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl">{study.title}</CardTitle>
                <CardDescription>{study.segment}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={statusColors[study.status as keyof typeof statusColors] || ""}>
                  {statusLabels[study.status as keyof typeof statusLabels]}
                </Badge>
                <Badge className={priorityColors[study.priority as keyof typeof priorityColors] || ""}>
                  {priorityLabels[study.priority as keyof typeof priorityLabels]}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Localização</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-gray-400" />
                  <div>
                    <p className="font-medium">{study.address}</p>
                    <p className="text-sm text-gray-500">{study.lat}, {study.lng}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Raio de Análise</p>
                <p className="font-medium">{(study.radiusM / 1000).toFixed(1)} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Criado em</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="font-medium">{new Date(study.createdAt).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Prazo</p>
                <p className="font-medium">
                  {study.dueAt ? new Date(study.dueAt).toLocaleDateString("pt-BR") : "Sem prazo"}
                </p>
              </div>
            </div>

            {/* Objetivos */}
            {study.objectives && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Objetivos</p>
                <p className="bg-gray-50 p-3 rounded">{study.objectives}</p>
              </div>
            )}

            {/* Relatório Final */}
            {study.finalReportJson && study.finalReportJson.items && study.finalReportJson.items.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Relatório Final</p>
                <div className="space-y-3">
                  {study.finalReportJson.items.map((item: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status de Processamento */}
            {study.status === "aberto" && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">Este estudo está aberto e aguardando análise.</p>
              </div>
            )}

            {study.status === "em_analise" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">Este estudo está sendo analisado pela equipe Sistema Busca Ponto.</p>
              </div>
            )}

            {study.status === "devolvido" && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <p className="text-sm text-purple-800">Este estudo foi devolvido para revisão.</p>
              </div>
            )}

            {study.status === "concluido" && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-sm text-green-800">Este estudo foi concluído com sucesso!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comentários */}
        <StudyComments studyId={parseInt(id || "0")} />
      </div>
    </div>
  );
}



