import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function UsageHistory() {
  const { user } = useAuth();
  const { data: usageHistory, isLoading } = trpc.usage.getMonthlyHistory.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!usageHistory) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8 px-4">
          <p className="text-muted-foreground">Erro ao carregar histórico de uso</p>
        </div>
      </div>
    );
  }

  const monthlyData = usageHistory.monthlyData;
  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];

  // Calcular tendência
  const trend = previousMonth && currentMonth 
    ? currentMonth.used - previousMonth.used 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/app">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Histórico de Uso</h1>
            <p className="text-muted-foreground">Acompanhe seu consumo de estudos ao longo dos meses</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Mês Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentMonth.used} / {currentMonth.limit}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentMonth.remaining} estudos restantes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tendência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                trend > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {trend > 0 ? '+' : ''}{trend}
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                vs mês anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Limite Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageHistory.limit}</div>
              <p className="text-xs text-muted-foreground mt-1">
                estudos por mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bar Chart - Consumo Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Consumo Mensal</CardTitle>
              <CardDescription>Estudos utilizados por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="used" 
                    fill="hsl(var(--primary))" 
                    name="Utilizados"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="remaining" 
                    fill="hsl(var(--muted))" 
                    name="Restantes"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Line Chart - Percentual de Uso */}
          <Card>
            <CardHeader>
              <CardTitle>Percentual de Uso</CardTitle>
              <CardDescription>Taxa de utilização do limite mensal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 100]}
                    label={{ value: '%', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value) => `${value}%`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Taxa de Uso"
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Detalhamento Mensal</CardTitle>
            <CardDescription>Visualize o consumo de cada mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-muted">
                    <th className="text-left py-3 px-4 font-semibold">Mês</th>
                    <th className="text-center py-3 px-4 font-semibold">Utilizados</th>
                    <th className="text-center py-3 px-4 font-semibold">Limite</th>
                    <th className="text-center py-3 px-4 font-semibold">Restantes</th>
                    <th className="text-center py-3 px-4 font-semibold">Taxa de Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((month, idx) => (
                    <tr key={`${month.month}-${idx}`} className="border-b border-muted hover:bg-muted/50">
                      <td className="py-3 px-4">{month.month}</td>
                      <td className="text-center py-3 px-4 font-semibold">{month.used}</td>
                      <td className="text-center py-3 px-4">{month.limit}</td>
                      <td className={`text-center py-3 px-4 font-semibold ${
                        month.remaining <= 0 
                          ? 'text-red-600 dark:text-red-400'
                          : month.remaining <= 3
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {month.remaining}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                month.percentage >= 90
                                  ? 'bg-red-500'
                                  : month.percentage >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(month.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right">{month.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

