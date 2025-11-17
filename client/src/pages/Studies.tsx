import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Plus, FileText, Search, X, Download } from "lucide-react";
import { useLocation } from "wouter";
import { useExportStudies } from "@/hooks/useExportStudies";

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
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const { exportToExcel, exportToCSV } = useExportStudies();

  // Buscar estudos do tenant
  const { data: studies, isLoading } = trpc.studies.list.useQuery(
    { tenantId: selectedTenant! },
    { enabled: !!selectedTenant }
  );

  // Selecionar tenant automaticamente
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  // Filtrar estudos
  const filteredStudies = studies?.filter((study) => {
    // Filtro de texto
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchText = 
        study.title.toLowerCase().includes(searchLower) ||
        study.address?.toLowerCase().includes(searchLower) ||
        study.segment?.toLowerCase().includes(searchLower);
      if (!matchText) return false;
    }

    // Filtro de status
    if (statusFilter !== "all" && study.status !== statusFilter) {
      return false;
    }

    // Filtro de segmento
    if (segmentFilter !== "all" && study.segment !== segmentFilter) {
      return false;
    }

    return true;
  });

  // Limpar todos os filtros
  const clearFilters = () => {
    setSearchText("");
    setStatusFilter("all");
    setSegmentFilter("all");
  };

  const hasActiveFilters = searchText || statusFilter !== "all" || segmentFilter !== "all";

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
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => exportToExcel(filteredStudies || [])}
                disabled={!filteredStudies || filteredStudies.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => exportToCSV(filteredStudies || [])}
                disabled={!filteredStudies || filteredStudies.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button onClick={() => setLocation("/studies/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Estudo
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="container py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, endereço ou segmento..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro de status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_analise">Em Análise</SelectItem>
              <SelectItem value="devolvido">Devolvido</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro de segmento */}
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os segmentos</SelectItem>
              <SelectItem value="alimentacao">Alimentação</SelectItem>
              <SelectItem value="varejo">Varejo</SelectItem>
              <SelectItem value="servicos">Serviços</SelectItem>
              <SelectItem value="saude">Saúde</SelectItem>
              <SelectItem value="educacao">Educação</SelectItem>
            </SelectContent>
          </Select>

          {/* Limpar filtros */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container pb-8">
        {!filteredStudies || filteredStudies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {hasActiveFilters ? "Nenhum estudo encontrado" : "Nenhum estudo solicitado ainda"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters ? "Tente ajustar os filtros" : "Crie seu primeiro estudo de mercado"}
              </p>
              <Button onClick={() => setLocation("/studies/new")}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Estudo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredStudies.map((item) => (
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

