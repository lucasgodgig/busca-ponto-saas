import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Plus, FileText } from "lucide-react";
import { useLocation } from "wouter";

const statusLabels = {
  aberto: "Aberto",
  em_analise: "Em Análise",
  devolvido: "Devolvido",
  concluido: "Concluído",
};

const statusColors = {
  aberto: "bg-blue-500",
  em_analise: "bg-yellow-500",
  devolvido: "bg-purple-500",
  concluido: "bg-green-500",
};

const priorityLabels = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export default function Studies() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  // Buscar estudos do tenant
  const { data: studies, isLoading } = trpc.studies.list.useQuery(
    { tenantId: selectedTenant! },
    { enabled: !!selectedTenant }
  );

  // Selecionar tenant automaticamente
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/app")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Estudos de Mercado</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas solicitações de estudos
                </p>
              </div>
            </div>
            <Button onClick={() => setLocation("/studies/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Estudo
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="container py-8">
        {!studies || studies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum estudo solicitado ainda</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro estudo de mercado
              </p>
              <Button onClick={() => setLocation("/studies/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Estudo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {studies.map((item) => (
              <Card
                key={item.study.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/studies/${item.study.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[item.study.status]}>
                          {statusLabels[item.study.status]}
                        </Badge>
                        <Badge variant="outline">
                          {priorityLabels[item.study.priority]}
                        </Badge>
                        <Badge variant="secondary">{item.study.segment}</Badge>
                      </div>
                      <CardTitle className="text-lg">{item.study.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.study.address}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {item.creator && (
                      <div className="text-muted-foreground">
                        Solicitado por: <strong>{item.creator.name}</strong>
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      Criado em:{" "}
                      <strong>
                        {new Date(item.study.createdAt).toLocaleDateString("pt-BR")}
                      </strong>
                    </div>
                    {item.study.dueAt && (
                      <div className="text-muted-foreground">
                        Prazo:{" "}
                        <strong>
                          {new Date(item.study.dueAt).toLocaleDateString("pt-BR")}
                        </strong>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

