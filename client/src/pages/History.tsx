import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  // Buscar histórico de consultas
  const { data: history, isLoading } = trpc.space.history.useQuery(
    { tenantId: selectedTenant!, limit: 50, offset: 0 },
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/app")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Histórico de Consultas</h1>
              <p className="text-sm text-muted-foreground">
                Visualize todas as consultas rápidas realizadas
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="container py-8">
        {!history || history.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma consulta realizada ainda</p>
              <p className="text-sm text-muted-foreground mb-4">
                Faça sua primeira consulta rápida no mapa
              </p>
              <Button onClick={() => setLocation("/app")}>
                Ir para o Mapa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => (
              <Card key={item.query.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Consulta #{item.query.id}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.query.createdAt).toLocaleString("pt-BR")}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {item.query.radiusM}m
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono">
                        {parseFloat(item.query.lat).toFixed(5)},{" "}
                        {parseFloat(item.query.lng).toFixed(5)}
                      </span>
                    </div>

                    {item.user && (
                      <div className="text-sm text-muted-foreground">
                        Realizada por: <strong>{item.user.name}</strong>
                      </div>
                    )}

                    {/* Camadas habilitadas */}
                    <div className="flex gap-2 mt-3">
                      {item.query.layersEnabledJson.demografia && (
                        <Badge variant="outline">Demografia</Badge>
                      )}
                      {item.query.layersEnabledJson.renda && (
                        <Badge variant="outline">Renda</Badge>
                      )}
                      {item.query.layersEnabledJson.fluxo && (
                        <Badge variant="outline">Fluxo</Badge>
                      )}
                      {item.query.layersEnabledJson.concorrencia && (
                        <Badge variant="outline">Concorrência</Badge>
                      )}
                    </div>

                    {/* Resumo dos resultados (se disponível) */}
                    {item.query.resultSummaryJson && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium mb-2">Resumo dos Dados:</p>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(item.query.resultSummaryJson, null, 2)}
                        </pre>
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

