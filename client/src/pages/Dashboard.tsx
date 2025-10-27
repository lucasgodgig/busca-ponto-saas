import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import MapShell from "@/components/MapShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, History, TrendingUp, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Buscar dados do tenant selecionado
  const { data: tenantData } = trpc.tenants.usage.useQuery(
    { tenantId: selectedTenant! },
    { enabled: !!selectedTenant }
  );

  // Buscar histórico de consultas
  const { data: history, refetch: refetchHistory } = trpc.space.history.useQuery(
    { tenantId: selectedTenant!, limit: 10, offset: 0 },
    { enabled: !!selectedTenant }
  );

  // Mutation para consulta rápida
  const quickQueryMutation = trpc.space.query.useMutation({
    onSuccess: () => {
      refetchHistory();
    },
  });

  // Selecionar tenant automaticamente se houver apenas um
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  // Handler para consulta rápida
  const handleQuickQuery = async (lat: number, lng: number, radius: number) => {
    if (!selectedTenant) {
      toast.error("Selecione um tenant");
      return;
    }

    setQueryLoading(true);
    try {
      await quickQueryMutation.mutateAsync({
        tenantId: selectedTenant,
        lat,
        lng,
        radius,
      });
    } finally {
      setQueryLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa estar logado para acessar esta página</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Fazer Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não tiver memberships, mostrar onboarding
  if (!user.memberships || user.memberships.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Bem-vindo!</CardTitle>
            <CardDescription>
              Você ainda não faz parte de nenhuma franqueadora
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/onboarding")}>
              Criar Franqueadora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Busca Ponto</h1>
            {tenantData?.tenant && (
              <Badge variant="secondary">{tenantData.tenant.name}</Badge>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Uso do plano */}
            {tenantData && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="text-muted-foreground">
                  {tenantData.usage?.quickQueriesUsed || 0} /{" "}
                  {tenantData.tenant?.limitsJson.quickQueriesPerMonth} consultas
                </span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/studies")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Estudos
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/history")}
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/settings")}
            >
              {user.name}
            </Button>
          </div>
        </div>
      </header>

      {/* Mapa */}
      {selectedTenant && (
        <MapShell
          tenantId={selectedTenant}
          onQuickQuery={handleQuickQuery}
          loading={queryLoading}
        />
      )}
    </div>
  );
}

