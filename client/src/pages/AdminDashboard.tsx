import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Loader2, Shield, TrendingUp, Users, FileText, Search, Building2 } from "lucide-react";
import { useLocation } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-yellow-500",
  em_analise: "bg-blue-500",
  devolvido: "bg-orange-500",
  concluido: "bg-green-500",
  cancelado: "bg-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_analise: "Em Análise",
  devolvido: "Devolvido",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Verificar se é admin BP
  if (!authLoading && (!user || user.role !== "admin_bp")) {
    setLocation("/app");
    return null;
  }

  // Buscar dados
  const { data: studies, isLoading: studiesLoading } = trpc.admin.getAllStudies.useQuery();
  const { data: metrics, isLoading: metricsLoading } = trpc.admin.getMetrics.useQuery();

  // Filtrar estudos
  const filteredStudies = studies?.filter((study) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      study.title?.toLowerCase().includes(searchLower) ||
      study.address?.toLowerCase().includes(searchLower) ||
      study.tenant?.name?.toLowerCase().includes(searchLower)
    );
  });

  if (authLoading || studiesLoading || metricsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Preparar dados para gráficos
  const statusChartData = metrics?.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
  })) || [];

  const tenantChartData = metrics?.byTenant.map((t) => ({
    name: t.tenantName || `Tenant ${t.tenantId}`,
    value: t.count,
  })) || [];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Dashboard Admin BP</h1>
              <p className="text-muted-foreground">Visão geral de todos os estudos</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setLocation("/app")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Estudos</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Todos os tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants Ativos</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.byTenant.length || 0}</div>
            <p className="text-xs text-muted-foreground">Com estudos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.byStatus.find((s) => s.status === "em_analise")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Aguardando conclusão</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Status */}
        <Card>
          <CardHeader>
            <CardTitle>Estudos por Status</CardTitle>
            <CardDescription>Distribuição de estudos por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`status-cell-${index}-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Tenants */}
        <Card>
          <CardHeader>
            <CardTitle>Estudos por Tenant</CardTitle>
            <CardDescription>Volume de estudos por empresa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tenantChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Estudos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Estudos */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Estudos</CardTitle>
          <CardDescription>Lista completa de estudos de todos os tenants</CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, endereço ou tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudies && filteredStudies.length > 0 ? (
                  filteredStudies.map((study) => (
                    <TableRow key={study.id}>
                      <TableCell className="font-mono text-sm">{study.id}</TableCell>
                      <TableCell className="font-medium">{study.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {study.tenant?.name || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{study.segment}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[study.status]}>
                          {STATUS_LABELS[study.status] || study.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(study.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/estudos/${study.id}`)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchTerm ? "Nenhum estudo encontrado" : "Nenhum estudo cadastrado"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

