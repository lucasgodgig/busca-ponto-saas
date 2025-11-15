import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, DollarSign, Maximize2 } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function CommercialPointsList() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const tenantId = user?.memberships?.[0]?.tenant?.id;

  // Buscar todas as solicitações do tenant
  const { data: requests, isLoading } = trpc.commercialPoints.listRequests.useQuery(
    { tenantId: tenantId || 0 },
    { enabled: !!tenantId }
  );

  // Buscar pontos comerciais para cada solicitação
  const pointsQueries = (requests || []).map((req) =>
    trpc.commercialPoints.getPoints.useQuery(
      { requestId: req.id },
      { enabled: !!req.id }
    )
  );

  // Combinar todos os pontos
  const allPoints = pointsQueries
    .map((query) => query.data || [])
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filtrar pontos
  const filteredPoints = allPoints.filter((point) =>
    point.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "-";
    return `R$ ${(price / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  if (!tenantId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">Acesso não autorizado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold">Pontos Comerciais Encontrados</h1>
              <p className="text-white/80">Visualize todos os pontos comerciais criados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Filtro */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Input
                  placeholder="Buscar por endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-4"
                />
              </div>
              <div className="text-sm text-gray-600 flex items-center">
                {filteredPoints.length} ponto(s) encontrado(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Pontos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pontos Comerciais</CardTitle>
            <CardDescription>
              Todos os pontos comerciais cadastrados para suas solicitações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isLoading && filteredPoints.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Tipo de Imóvel</TableHead>
                      <TableHead>Área (m²)</TableHead>
                      <TableHead>Aluguel</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPoints.map((point) => (
                      <TableRow key={point.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-primary" />
                            <div>
                              <p className="font-medium">{point.address}</p>
                              <p className="text-xs text-gray-500">
                                {point.lat}, {point.lng}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{point.propertyType || "-"}</TableCell>
                        <TableCell>
                          {point.usableAreaM2 ? (
                            <div className="flex items-center gap-1">
                              <Maximize2 size={14} />
                              {point.usableAreaM2}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} />
                            {formatPrice(point.rentalPrice)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} />
                            {formatPrice(point.salePrice)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {point.brokerName && (
                              <p className="font-medium">{point.brokerName}</p>
                            )}
                            {point.brokerPhone && (
                              <p className="text-gray-600">{point.brokerPhone}</p>
                            )}
                            {point.ownerName && (
                              <p className="text-gray-600 text-xs">Proprietário: {point.ownerName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/commercial-points/${point.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Carregando pontos comerciais...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Nenhum ponto comercial encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Pontos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{allPoints.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Com Aluguel</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {allPoints.filter((p) => p.rentalPrice).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Com Venda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {allPoints.filter((p) => p.salePrice).length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
