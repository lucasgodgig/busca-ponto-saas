import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, TrendingUp, Users, Building2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function Analytics() {
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>();

  // Verificar se é admin BP
  if (user?.role !== "admin_bp") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas admins BP podem visualizar analytics.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { data: kpis, isLoading: kpisLoading } = trpc.analytics.getAnalyticsKPIs.useQuery();
  const { data: consumptionStats } = trpc.analytics.getTenantConsumptionStats.useQuery();
  const { data: usageTrends } = trpc.analytics.getTenantUsageTrends.useQuery({
    tenantId: selectedTenantId,
    days: 30,
  });
  const { data: revenueProjection } = trpc.analytics.getRevenueProjection.useQuery({
    months: 3,
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics - Busca Ponto</h1>
          <p className="text-muted-foreground">
            Visualize métricas de consumo, tendências e previsões de receita
          </p>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Tenants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.totalTenants}</div>
                <div className="flex items-center mt-2 text-xs text-green-600">
                  <Building2 className="h-4 w-4 mr-1" />
                  Franquias ativas
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.totalUsers}</div>
                <div className="flex items-center mt-2 text-xs text-blue-600">
                  <Users className="h-4 w-4 mr-1" />
                  Usuários cadastrados
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Estudos este Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{kpis.monthlyStudies}</div>
                <div className="flex items-center mt-2 text-xs text-purple-600">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Solicitações processadas
                </div>
              </CardContent>
            </Card>

            <Card className={kpis.tenantsNearLimit > 0 ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30" : ""}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tenants Próximos do Limite
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">{kpis.tenantsNearLimit}</div>
                <div className="flex items-center mt-2 text-xs text-yellow-600">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Oportunidade de upgrade
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Consumo por Tenant */}
        {consumptionStats && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Consumo por Tenant</CardTitle>
              <CardDescription>
                Visualize o uso de estudos de cada franquia neste mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                      <th className="text-left py-3 px-4 font-semibold">Plano</th>
                      <th className="text-center py-3 px-4 font-semibold">Estudos Usados</th>
                      <th className="text-center py-3 px-4 font-semibold">Limite</th>
                      <th className="text-center py-3 px-4 font-semibold">% Utilizado</th>
                      <th className="text-center py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionStats.map((stat) => (
                      <tr
                        key={stat.tenantId}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTenantId(stat.tenantId)}
                      >
                        <td className="py-3 px-4">{stat.tenantName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                            {stat.plan}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 font-semibold">{stat.studiesUsed}</td>
                        <td className="text-center py-3 px-4">{stat.studiesLimit}</td>
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-secondary rounded-full h-2 mr-2">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  stat.percentageUsed >= 90
                                    ? "bg-red-500"
                                    : stat.percentageUsed >= 70
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{ width: `${Math.min(stat.percentageUsed, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold">{stat.percentageUsed}%</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          {stat.percentageUsed >= 90 && (
                            <span className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                              Crítico
                            </span>
                          )}
                          {stat.percentageUsed >= 70 && stat.percentageUsed < 90 && (
                            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 rounded text-xs font-medium">
                              Aviso
                            </span>
                          )}
                          {stat.percentageUsed < 70 && (
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gráficos */}
        <div className="grid gap-8 md:gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
          {/* Tendências de Uso */}
          {usageTrends && usageTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tendências de Uso (Últimos 30 Dias)</CardTitle>
                <CardDescription>
                  {selectedTenantId ? "Tenant selecionado" : "Todos os tenants"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={usageTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      name="Estudos Criados"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Previsão de Receita */}
          {revenueProjection && (
            <Card>
              <CardHeader>
                <CardTitle>Previsão de Receita (3 Meses)</CardTitle>
                <CardDescription>
                  Baseado em taxa de upgrade de 5% ao mês
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-muted-foreground">Receita Atual</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {revenueProjection.currentRevenue.toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {revenueProjection.projections.map((proj, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Mês {proj.month}</p>
                          <p className="text-xs text-muted-foreground">
                            ~{proj.estimatedUpgrades} upgrades estimados
                          </p>
                        </div>
                        <p className="text-lg font-bold text-green-600">
                          R$ {proj.projectedRevenue.toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Distribuição por Plano */}
        {consumptionStats && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Tenants por Plano</CardTitle>
              <CardDescription>
                Quantidade de franquias em cada plano
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        consumptionStats.reduce((acc, stat) => {
                          acc[stat.plan] = (acc[stat.plan] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([name, value]) => ({ name, value }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  {Object.entries(
                    consumptionStats.reduce((acc, stat) => {
                      acc[stat.plan] = (acc[stat.plan] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([plan, count], idx) => (
                    <div key={plan} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm font-medium capitalize">
                        {plan}: {count} tenant{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

