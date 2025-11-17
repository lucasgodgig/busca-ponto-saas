import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

const COLORS = {
  form: "#3b82f6", // blue
  oauth: "#10b981", // green
  admin: "#f59e0b", // amber
};

export default function RegistrationAnalytics() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [days, setDays] = useState(30);

  // Verificar se é admin
  useEffect(() => {
    if (user && user.role !== "admin_bp") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const statsQuery = trpc.registrationAnalytics.getStats.useQuery();
  const usersListQuery = trpc.registrationAnalytics.getUsersList.useQuery({
    limit: 50,
    offset: 0,
  });
  const trendQuery = trpc.registrationAnalytics.getConversionTrend.useQuery({
    days,
  });

  if (!user || user.role !== "admin_bp") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Acesso negado. Apenas admins podem acessar esta página.</p>
      </div>
    );
  }

  const stats = statsQuery.data;
  const usersList = usersListQuery.data;
  const trend = trendQuery.data;

  // Preparar dados para gráfico de pizza
  const pieData = stats?.byMethod.map(item => ({
    name: item.method === "form" ? "Formulário" : item.method === "oauth" ? "OAuth Direto" : "Admin",
    value: item.count,
    percentage: item.percentage,
  })) || [];

  // Preparar dados para gráfico de linha
  const trendData: Record<string, any> = {};
  trend?.forEach(item => {
    const date = item.date;
    if (!trendData[date]) {
      trendData[date] = { date };
    }
    trendData[date][item.method] = item.count;
  });
  const chartData = Object.values(trendData);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análise de Registros</h1>
            <p className="text-gray-600 mt-2">Visualize como os usuários estão se registrando na plataforma</p>
          </div>
          <TrendingUp className="w-8 h-8 text-blue-600" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Total de Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                </CardContent>
              </Card>

              {stats.byMethod.map(item => (
                <Card key={item.method}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {item.method === "form" ? "Via Formulário" : item.method === "oauth" ? "Via OAuth" : "Via Admin"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold" style={{ color: COLORS[item.method as keyof typeof COLORS] }}>
                      {item.count}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{item.percentage}% do total</p>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="col-span-3 flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        {/* Charts */}
        <Tabs defaultValue="distribution" className="w-full">
          <TabsList>
            <TabsTrigger value="distribution">Distribuição</TabsTrigger>
            <TabsTrigger value="trend">Tendência</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          {/* Distribution Chart */}
          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Registros</CardTitle>
                <CardDescription>Proporção de usuários por método de registro</CardDescription>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[entry.name.toLowerCase().includes("formulário") ? "form" : entry.name.toLowerCase().includes("direto") ? "oauth" : "admin"]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trend Chart */}
          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Registros</CardTitle>
                <CardDescription>Registros por dia nos últimos {days} dias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  {[7, 30, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        days === d
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      {d} dias
                    </button>
                  ))}
                </div>

                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="form" fill={COLORS.form} name="Formulário" />
                      <Bar dataKey="oauth" fill={COLORS.oauth} name="OAuth" />
                      <Bar dataKey="admin" fill={COLORS.admin} name="Admin" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users List */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>Últimos usuários registrados</CardDescription>
              </CardHeader>
              <CardContent>
                {usersList ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Método</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Data de Registro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map(user => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{user.name || "-"}</td>
                            <td className="py-3 px-4 text-gray-600">{user.email || "-"}</td>
                            <td className="py-3 px-4">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: COLORS[user.registrationMethod as keyof typeof COLORS] }}
                              >
                                {user.registrationMethod === "form" ? "Formulário" : user.registrationMethod === "oauth" ? "OAuth" : "Admin"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">
                              {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
