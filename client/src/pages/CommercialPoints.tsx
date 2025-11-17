import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, MapPin, Search, X } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CommercialPoints() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "aberto" | "encontrado" | "cancelado">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7days" | "30days">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  
  const [formData, setFormData] = useState({
    segment: "",
    city: "",
    neighborhoods: "",
    socialClass: "",
    propertySize: "",
    maxRent: "",
    requirements: "",
  });

  const { data: requests, isLoading } = trpc.commercialPoints.listRequests.useQuery(
    { tenantId: user?.memberships?.[0]?.tenant?.id || 0 },
    { enabled: !!user?.memberships?.[0]?.tenant?.id }
  );

  // Load filters from localStorage
  useEffect(() => {
    const savedFilters = localStorage.getItem("commercialPointsFilters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        setSearchTerm(filters.searchTerm || "");
        setStatusFilter(filters.statusFilter || "all");
        setDateFilter(filters.dateFilter || "all");
        setCityFilter(filters.cityFilter || "");
        setSegmentFilter(filters.segmentFilter || "");
      } catch (e) {
        console.error("Failed to load filters from localStorage");
      }
    }
  }, []);

  // Save filters to localStorage
  useEffect(() => {
    const filters = {
      searchTerm,
      statusFilter,
      dateFilter,
      cityFilter,
      segmentFilter,
    };
    localStorage.setItem("commercialPointsFilters", JSON.stringify(filters));
  }, [searchTerm, statusFilter, dateFilter, cityFilter, segmentFilter]);

  const createRequestMutation = trpc.commercialPoints.createRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitação criada com sucesso!");
      setFormData({
        segment: "",
        city: "",
        neighborhoods: "",
        socialClass: "",
        propertySize: "",
        maxRent: "",
        requirements: "",
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar solicitação");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.memberships?.[0]?.tenant?.id) {
      toast.error("Tenant não encontrado");
      return;
    }

    if (!formData.requirements.trim()) {
      toast.error("Requisitos adicionais são obrigatórios");
      return;
    }

    createRequestMutation.mutate({
      tenantId: user.memberships[0].tenant.id,
      segment: formData.segment,
      city: formData.city,
      neighborhoods: formData.neighborhoods || undefined,
      socialClass: formData.socialClass || undefined,
      propertySize: formData.propertySize ? parseInt(formData.propertySize) : undefined,
      maxRent: formData.maxRent ? parseInt(formData.maxRent) : undefined,
      requirements: formData.requirements,
    });
  };

  // Filter logic
  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    return requests.filter((request) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        request.segment.toLowerCase().includes(searchLower) ||
        request.city.toLowerCase().includes(searchLower) ||
        (request.requirements && request.requirements.toLowerCase().includes(searchLower));

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "all" && request.status !== statusFilter) return false;

      // City filter
      if (cityFilter && !request.city.toLowerCase().includes(cityFilter.toLowerCase())) {
        return false;
      }

      // Segment filter
      if (segmentFilter && !request.segment.toLowerCase().includes(segmentFilter.toLowerCase())) {
        return false;
      }

      // Date filter
      if (dateFilter !== "all") {
        const createdDate = new Date(request.createdAt);
        const now = new Date();
        const daysAgo = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dateFilter === "7days" && daysAgo > 7) return false;
        if (dateFilter === "30days" && daysAgo > 30) return false;
      }

      return true;
    });
  }, [requests, searchTerm, statusFilter, dateFilter, cityFilter, segmentFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateFilter("all");
    setCityFilter("");
    setSegmentFilter("");
  };

  const hasActiveFilters =
    searchTerm || statusFilter !== "all" || dateFilter !== "all" || cityFilter || segmentFilter;

  const tenantId = user?.memberships?.[0]?.tenant?.id;

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Solicitar Ponto Comercial</h1>
              <p className="text-white/80">Encontre o ponto comercial ideal para seu negócio</p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-white text-primary hover:bg-white/90"
            size="lg"
          >
            <Plus size={20} />
            Nova Solicitação
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Formulário de Solicitação */}
        {showForm && (
          <Card className="p-6 mb-8 border-2 border-primary/20 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">Solicitar Indicação de Ponto</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Segmento do Negócio *</label>
                  <Input
                    type="text"
                    placeholder="Ex: Farmácia, Restaurante, Academia"
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cidade de Interesse *</label>
                  <Input
                    type="text"
                    placeholder="Ex: São Paulo, Rio de Janeiro"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Bairros de Interesse</label>
                  <Input
                    type="text"
                    placeholder="Ex: Pinheiros, Vila Mariana, Consolação"
                    value={formData.neighborhoods}
                    onChange={(e) => setFormData({ ...formData, neighborhoods: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Classe Social Atendida</label>
                  <select
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    value={formData.socialClass}
                    onChange={(e) => setFormData({ ...formData, socialClass: e.target.value })}
                  >
                    <option value="">Selecione uma opção</option>
                    <option value="A">Classe A</option>
                    <option value="B">Classe B</option>
                    <option value="C">Classe C</option>
                    <option value="D">Classe D</option>
                    <option value="E">Classe E</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Tamanho do Imóvel (m²)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 100, 250, 500"
                    value={formData.propertySize}
                    onChange={(e) => setFormData({ ...formData, propertySize: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Valor Máximo de Aluguel (R$)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ex: 5000, 10000"
                    value={formData.maxRent}
                    onChange={(e) => setFormData({ ...formData, maxRent: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Requisitos Adicionais *</label>
                <Textarea
                  placeholder="Descreva características específicas que você procura no ponto comercial (estacionamento, visibilidade, proximidade a transportes, etc)..."
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                  required
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="flex-1"
                >
                  {createRequestMutation.isPending ? "Criando..." : "Criar Solicitação"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Filtros e Busca */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Minhas Solicitações</h2>
          
          {/* Barra de Busca */}
          <div className="mb-4 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
              <Input
                type="text"
                placeholder="Buscar por segmento, cidade ou requisitos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">Todos</option>
                <option value="aberto">Aberto</option>
                <option value="encontrado">Encontrado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="all">Todos</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cidade</label>
              <Input
                type="text"
                placeholder="Filtrar por cidade"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Segmento</label>
              <Input
                type="text"
                placeholder="Filtrar por segmento"
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full"
                  size="sm"
                >
                  <X size={16} className="mr-2" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          </div>

          {/* Resultado da busca */}
          {hasActiveFilters && (
            <p className="text-sm text-muted-foreground mb-4">
              Mostrando {filteredRequests.length} de {requests?.length || 0} solicitações
            </p>
          )}
        </div>

        {/* Lista de Solicitações */}
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredRequests && filteredRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-stagger">
              {filteredRequests.map((request, index) => (
                <Card
                  key={request.id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-primary"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => navigate(`/commercial-points/${request.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{request.segment}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                        <MapPin size={16} />
                        {request.city || "Localização não definida"}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        request.status === "aberto"
                          ? "bg-yellow-100 text-yellow-800"
                          : request.status === "encontrado"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {request.status === "aberto"
                        ? "Aberto"
                        : request.status === "encontrado"
                          ? "Encontrado"
                          : "Cancelado"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <p className="text-muted-foreground">
                      <strong>Criado:</strong>{" "}
                      {new Date(request.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    {request.requirements && (
                      <p className="text-muted-foreground line-clamp-2">
                        <strong>Requisitos:</strong> {request.requirements}
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/commercial-points/${request.id}`);
                    }}
                  >
                    Ver Detalhes
                  </Button>
                </Card>
              ))}
            </div>
          ) : requests && requests.length === 0 ? (
            <Card className="p-12 text-center">
              <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma solicitação ainda</p>
              <Button onClick={() => setShowForm(true)}>Criar Primeira Solicitação</Button>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma solicitação encontrada com esses filtros</p>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpar Filtros
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
