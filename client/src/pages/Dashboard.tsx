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
import { useExportDashboard } from "@/hooks/useExportDashboard";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  const { data: studies } = trpc.studies.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );
  
  // Buscar uso mensal e limite
  const { data: usageData } = trpc.admin.users.getCurrentUsage.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  const { exportToPDF } = useExportDashboard();

  const handleExport = async () => {
    toast.loading("Gerando PDF...");
    const success = await exportToPDF();
    toast.dismiss();
    if (success) {
      toast.success("Dashboard exportado com sucesso!");
    } else {
      toast.error("Erro ao exportar dashboard");
    }
  };

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
      <div id="dashboard-content" className="container py-4 md:py-8 px-4">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Bem-vindo, {user?.name?.split(" ")[0] || "Usuário"}!
            </h1>
            <p className="text-muted-foreground">
              Gerencie seus estudos de mercado e análises de localização
            </p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
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

        {/* Indicador de Estudos Restantes */}
        {usageData && (
          <Card className="mb-6 md:mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Estudos Disponíveis Este Mês</CardTitle>
              <CardDescription>
                Você pode criar até {usageData.limit} estudos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Utilizados</span>
                  <span className="text-2xl font-bold">
                    {usageData.used} / {usageData.limit}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      usageData.used / usageData.limit >= 0.9
                        ? "bg-red-500"
                        : usageData.used / usageData.limit >= 0.7
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((usageData.used / usageData.limit) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Restantes</span>
                  <span className={
                    usageData.remaining <= 0
                      ? "text-red-600 font-semibold"
                      : usageData.remaining <= 3
                      ? "text-yellow-600 font-semibold"
                      : "text-green-600 font-semibold"
                  }>
                    {usageData.remaining} estudos
                  </span>
                </div>
                {usageData.remaining <= 0 && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ⚠️ Você atingiu o limite mensal de estudos. Entre em contato com o administrador para aumentar seu limite.
                    </p>
                  </div>
                )}
                {usageData.remaining > 0 && usageData.remaining <= 3 && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Você está próximo do limite mensal. Restam apenas {usageData.remaining} estudos.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

