import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Na Fila",
  processing: "Processando",
  done: "Concluído",
  error: "Erro",
};

export default function GeneratedStudiesListPage() {
  const [, setLocation] = useLocation();
  const { data: studies, isLoading } = trpc.generatedStudies.list.useQuery();

  if (isLoading) {
    return <div className="p-4">Carregando estudos...</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Estudos Automáticos</h1>
          <p className="text-gray-600">Gerencie seus estudos de mercado</p>
        </div>
        <Button asChild>
          <a href="/generate-study">+ Novo Estudo</a>
        </Button>
      </div>

      {!studies || studies.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-500 mb-4">Nenhum estudo criado ainda</p>
            <Button asChild>
              <a href="/generate-study">Criar Primeiro Estudo</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {studies.map((study: any) => (
            <Card key={study.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{study.title}</CardTitle>
                    <CardDescription>{study.segment}</CardDescription>
                  </div>
                  <Badge className={STATUS_COLORS[study.status] || ""}>
                    {STATUS_LABELS[study.status] || study.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Localização</p>
                    <p className="font-medium">{study.lat}, {study.lng}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Raio</p>
                    <p className="font-medium">{(study.radiusM / 1000).toFixed(1)} km</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Criado</p>
                    <p className="font-medium">
                      {formatDistanceToNow(new Date(study.createdAt), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/generated-studies/${study.id}`}>Ver Detalhes</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

