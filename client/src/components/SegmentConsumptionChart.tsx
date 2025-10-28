import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SegmentConsumptionChartProps {
  segment: string;
  totalConsumption: number;
  segmentConsumption: number;
  segmentLabel: string;
}

export default function SegmentConsumptionChart({
  segment,
  totalConsumption,
  segmentConsumption,
  segmentLabel,
}: SegmentConsumptionChartProps) {
  // Preparar dados para o gráfico com duas barras lado a lado
  const data = [
    {
      name: "Potencial",
      "Potencial Total": totalConsumption,
      [segmentLabel]: segmentConsumption,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Potencial de Consumo por Segmento</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              label={{
                value: "R$ (milhões)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              formatter={(value) => {
                const millions = (value as number) / 1000000;
                return `R$ ${millions.toFixed(1)}M`;
              }}
            />
            <Legend />
            <Bar dataKey="Potencial Total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            <Bar dataKey={segmentLabel} fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Potencial Total</p>
            <p className="text-lg font-bold text-blue-600">
              R$ {(totalConsumption / 1000000).toFixed(1)}M
            </p>
          </div>
          <div>
            <p className="text-gray-600">{segmentLabel}</p>
            <p className="text-lg font-bold text-green-600">
              R$ {(segmentConsumption / 1000000).toFixed(1)}M
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

