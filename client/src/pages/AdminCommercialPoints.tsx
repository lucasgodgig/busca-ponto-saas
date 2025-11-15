import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocketNotifications } from "@/hooks/useWebSocketNotifications";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RefreshCw, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  aberto: {
    label: "Aberto",
    variant: "secondary" as const,
  },
  em_busca: {
    label: "Em Busca",
    variant: "default" as const,
  },
  encontrado: {
    label: "Encontrado",
    variant: "default" as const,
  },
  cancelado: {
    label: "Cancelado",
    variant: "destructive" as const,
  },
};

export default function AdminCommercialPoints() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Carregar filtros do localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem("commercialPointsFilters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setStatusFilter(filters.status || "all");
        setCityFilter(filters.city || "all");
        setSegmentFilter(filters.segment || "all");
        setSearchText(filters.search || "");
        setDateFilter(filters.date || "all");
      } catch (e) {
        console.error("Erro ao carregar filtros", e);
      }
    }
  }, []);

  // Salvar filtros no localStorage
  useEffect(() => {
    const filters = {
      status: statusFilter,
      city: cityFilter,
      segment: segmentFilter,
      search: searchText,
      date: dateFilter,
    };
    localStorage.setItem("commercialPointsFilters", JSON.stringify(filters));
  }, [statusFilter, cityFilter, segmentFilter, searchText, dateFilter]);

  // Queries
  const { data: allRequests, isLoading, refetch } = trpc.commercialPoints.listAllRequests.useQuery(
    statusFilter === "all" ? {} : { status: statusFilter }
  );

  // Filtrar dados localmente
  const requests = useMemo(() => {
    if (!allRequests) return [];

    return allRequests.filter((request: any) => {
      // Filtro de status
      if (statusFilter !== "all" && request.status !== statusFilter) return false;

      // Filtro de cidade
      if (cityFilter !== "all" && !request.city.toLowerCase().includes(cityFilter.toLowerCase())) return false;

      // Filtro de segmento
      if (segmentFilter !== "all" && !request.segment.toLowerCase().includes(segmentFilter.toLowerCase())) return false;

      // Filtro de texto (busca em requisitos e título)
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesRequirements = request.requirements?.toLowerCase().includes(searchLower);
        const matchesSegment = request.segment?.toLowerCase().includes(searchLower);
        const matchesCity = request.city?.toLowerCase().includes(searchLower);
        if (!matchesRequirements && !matchesSegment && !matchesCity) return false;
      }

      // Filtro de data
      if (dateFilter !== "all") {
        const createdDate = new Date(request.createdAt);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case "today":
            if (daysDiff > 0) return false;
            break;
          case "week":
            if (daysDiff > 7) return false;
            break;
          case "month":
            if (daysDiff > 30) return false;
            break;
          case "3months":
            if (daysDiff > 90) return false;
            break;
        }
      }

      return true;
    });
  }, [allRequests, statusFilter, cityFilter, segmentFilter, searchText, dateFilter]);

  // Obter cidades e segmentos únicos
  const uniqueCities = useMemo(() => {
    if (!allRequests) return [];
    const cities = new Set(allRequests.map((r: any) => r.city));
    return Array.from(cities).sort();
  }, [allRequests]);

  const uniqueSegments = useMemo(() => {
    if (!allRequests) return [];
    const segments = new Set(allRequests.map((r: any) => r.segment));
    return Array.from(segments).sort();
  }, [allRequests]);

  // Limpar filtros
  const clearFilters = () => {
    setStatusFilter("all");
    setCityFilter("all");
    setSegmentFilter("all");
    setSearchText("");
    setDateFilter("all");
    localStorage.removeItem("commercialPointsFilters");
  };

  const hasActiveFilters = statusFilter !== "all" || cityFilter !== "all" || segmentFilter !== "all" || searchText || dateFilter !== "all";

  // WebSocket notifications
  const { isConnected } = useWebSocketNotifications({
    onNewRequest: () => {
      // Refetch quando nova solicitacao chegar
      refetch();
    },
    onStatusUpdate: () => {
      // Refetch quando status mudar
      refetch();
    },
    onNewPoint: () => {
      // Refetch quando novo ponto for indicado
      refetch();
    },
  });

  // Verificar permissao e redirecionar se necessario
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Solicitacoes de Pontos Comerciais</h1>
            <p className="text-muted-foreground">Gerencie as solicitacoes de pontos comerciais dos usuarios</p>
            {isConnected && (
              <p className="text-xs text-green-600 mt-1">● Notificacoes em tempo real ativas</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Filtros Avançados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Filtros Avançados</CardTitle>
              <CardDescription>Filtre as solicitações por múltiplos critérios</CardDescription>
            </div>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Busca por texto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Buscar por requisitos, segmento..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filtro por status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="em_busca">Em Busca</SelectItem>
                    <SelectItem value="encontrado">Encontrado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por cidade */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cidades</SelectItem>
                    {uniqueCities.map((city: string) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por segmento */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Segmento</label>
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os segmentos</SelectItem>
                    {uniqueSegments.map((segment: string) => (
                      <SelectItem key={segment} value={segment}>
                        {segment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por data */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Criação</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as datas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Últimos 7 dias</SelectItem>
                    <SelectItem value="month">Últimos 30 dias</SelectItem>
                    <SelectItem value="3months">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Solicitações */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Solicitações</CardTitle>
              <CardDescription>
                {requests?.length || 0} solicitação(ões) encontrada(s)
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : requests && requests.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Requisitos</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Criada em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.segment}</TableCell>
                        <TableCell>{request.city}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {request.requirements}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={statusConfig[request.status as keyof typeof statusConfig]?.variant || "secondary"}>
                            {statusConfig[request.status as keyof typeof statusConfig]?.label || request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(request.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLocation(`/admin-bp/pontos-comerciais/${request.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma solicitação encontrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
