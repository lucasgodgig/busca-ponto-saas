import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StudiesChart() {
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  const { data: studies } = trpc.studies.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  // Gerar dados dos últimos 30 dias
  const getLast30DaysData = () => {
    const data = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = startOfDay(subDays(now, i));
      const dateStr = format(date, "dd/MM");

      // Contar estudos criados até essa data
      const count = studies?.filter(study => {
        const studyDate = startOfDay(new Date(study.createdAt));
        return studyDate <= date;
      }).length || 0;

      data.push({
        date: dateStr,
        total: count,
      });
    }

    return data;
  };

  const chartData = getLast30DaysData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Estudos</CardTitle>
        <CardDescription>Total acumulado nos últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
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
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

