import { useWebSocketNotifications } from "@/hooks/useWebSocketNotifications";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useRef } from "react";
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
import { useAuth } from "@/_core/hooks/useAuth";

function calculateExhaustionDate(used: number, totalStudies: number): string {
  if (totalStudies === 0 || used === 0) return "Sem dados";
  
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;
  
  const dailyRate = used / currentDay;
  const estimatedDaysToExhaust = Math.ceil((3 - (used % 3)) / dailyRate) || daysRemaining;
  
  const exhaustionDate = new Date();
  exhaustionDate.setDate(exhaustionDate.getDate() + estimatedDaysToExhaust);
  
  return exhaustionDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  const { data: studies } = trpc.studies.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );
  
  const { exportToPDF } = useExportDashboard();
  const utils = trpc.useUtils();

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
  
  const handleStudyNotification = (notification: any) => {
    if (notification.type === "study_created") {
      utils.studies.list.invalidate();
    } else if (notification.type === "study_status_changed") {
      utils.studies.list.invalidate();
    }
  };
  
  useWebSocketNotifications(handleStudyNotification);
  
  const { data: usageData } = trpc.admin.users.getCurrentUsage.useQuery(
    undefined,
    { enabled: !!user }
  );
  
  // Notificar quando limite eh atingido
  const hasNotifiedRef = useRef(false);
  useEffect(() => {
    if (usageData && usageData.remaining <= 0 && !hasNotifiedRef.current) {
      toast.error("Voce atingiu o limite mensal de estudos!", {
        description: "Entre em contato com o administrador para aumentar seu limite.",
        duration: 5000,
      });
      hasNotifiedRef.current = true;
    } else if (usageData && usageData.remaining > 0) {
      hasNotifiedRef.current = false;
    }
  }, [usageData?.remaining]);

  const pendingStudies = studies?.filter((s) => s.status === 'aberto' || s.status === 'em_analise').length || 0;
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
                    {studies && studies.length > 0 && (
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                        Estimativa de esgotamento: {calculateExhaustionDate(usageData.used, studies.length)}
                      </p>
                    )}
                  </div>
                )}
                <Link href="/historico-uso" className="mt-4">
                  <Button variant="outline" className="w-full">
                    Ver Histórico de Uso
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Cards */}
        <h2 className="text-xl md:text-2xl font-bold mb-4">Acesso Rápido</h2>
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          {actionCards.map((card) => {
            const isAdmin = user?.role === 'admin_bp';
            const isLimitReached = !isAdmin && usageData && usageData.remaining <= 0 && card.title === 'Solicitar Estudo';
            const cardContent = (
              <Card className={`group transition-all border-2 ${
                isLimitReached 
                  ? "cursor-not-allowed opacity-60 hover:shadow-none" 
                  : "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/50"
              }`}>
                <CardHeader className="pb-3">
                  <div className={`w-14 h-14 rounded-xl ${card.bgColor} flex items-center justify-center mb-4 transition-transform ${
                    isLimitReached ? "" : "group-hover:scale-110"
                  }`}>
                    <card.icon className={`h-7 w-7 ${card.color}`} />
                  </div>
                  <CardTitle className="text-lg mb-2">{card.title}</CardTitle>
                  <CardDescription className="text-sm">{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between transition-colors"
                    disabled={isLimitReached}
                  >
                    {isLimitReached ? "Limite Atingido" : "Acessar"}
                    <span className={`ml-2 transition-transform ${
                      isLimitReached ? "" : "group-hover:translate-x-1"
                    }`}>→</span>
                  </Button>
                </CardContent>
              </Card>
            );

            return isLimitReached ? (
              <div key={card.title} title="Você atingiu o limite mensal de estudos. Solicite um upgrade para continuar.">
                {cardContent}
              </div>
            ) : (
              <Link key={card.title} href={card.href}>
                {cardContent}
              </Link>
            );
          })}
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

