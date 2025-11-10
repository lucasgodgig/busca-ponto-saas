import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Map, 
  FileText, 
  FolderOpen, 
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import Onboarding from "@/components/Onboarding";
import StudiesChart from "@/components/StudiesChart";

export default function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  const { data: studies } = trpc.studies.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  const pendingStudies = studies?.filter(s => s.status === 'aberto' || s.status === 'em_analise').length || 0;
  const completedStudies = studies?.filter(s => s.status === 'concluido').length || 0;

  const actionCards = [
    {
      title: "Análise Rápida",
      description: "Acesse o mapa interativo para análises em tempo real",
      icon: Map,
      href: "/mapa",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Solicitar Estudo",
      description: "Solicite um estudo de mercado completo",
      icon: FileText,
      href: "/estudos/novo",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Meus Estudos",
      description: "Acompanhe seus estudos em andamento",
      icon: FolderOpen,
      href: "/estudos",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      title: "Relatórios",
      description: "Acesse seu histórico de análises",
      icon: BarChart3,
      href: "/historico",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
  ];

  const stats = [
    {
      title: "Estudos Pendentes",
      value: pendingStudies,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      title: "Estudos Concluídos",
      value: completedStudies,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Total de Estudos",
      value: studies?.length || 0,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <>
      <Onboarding />
      <div className="min-h-screen bg-background">
      <div className="container py-4 md:py-8 px-4">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Bem-vindo, {user?.name || 'Usuário'}!
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus estudos de mercado e análises de localização
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6 md:mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Cards */}
        <h2 className="text-xl md:text-2xl font-bold mb-4">Acesso Rápido</h2>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          {actionCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="group cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                    <card.icon className={`h-7 w-7 ${card.color}`} />
                  </div>
                  <CardTitle className="text-lg mb-2">{card.title}</CardTitle>
                  <CardDescription className="text-sm">{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="ghost" className="w-full justify-between group-hover:text-primary transition-colors">
                    Acessar
                    <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Chart */}
        {studies && studies.length > 0 && (
          <div className="mb-6 md:mb-8">
            <StudiesChart />
          </div>
        )}

        {/* Recent Studies */}
        {studies && studies.length > 0 && (
          <div className="mt-6 md:mt-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Estudos Recentes</h2>
            <div className="grid gap-4">
              {studies.slice(0, 3).map((study) => (
                <Link key={study.id} href={`/estudos/${study.id}`}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{study.title}</CardTitle>
                          <CardDescription>{study.address}</CardDescription>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          study.status === 'concluido' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400'
                            : study.status === 'em_analise'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400'
                        }`}>
                          {study.status === 'concluido' ? 'Concluído' : 
                           study.status === 'em_analise' ? 'Em Análise' : 'Aberto'}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

