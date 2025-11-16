import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Map, FileText, FolderOpen, BarChart3, CheckCircle2 } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  details?: string[];
}

interface OnboardingStepExtended extends OnboardingStep {
  details?: string[];
}

const steps: OnboardingStepExtended[] = [
  {
    title: "Bem-vindo ao Sistema Busca Ponto!",
    description: "Vamos fazer um tour rápido pelas principais funcionalidades da plataforma.",
    icon: CheckCircle2,
    color: "text-green-600",
    details: [
      "Análise de dados demográficos em tempo real",
      "Mapa interativo com múltiplas camadas",
      "Relatórios profissionais exportáveis",
    ],
  },
  {
    title: "Análise Rápida",
    description: "Use o Mapa Interativo para fazer análises de localização em tempo real. Selecione um endereço, defina o raio e escolha o segmento.",
    icon: Map,
    color: "text-blue-600",
    details: [
      "Busque por endereço ou coordenadas",
      "Ajuste o raio de busca (até 5km)",
      "Veja dados demográficos instantaneamente",
    ],
  },
  {
    title: "Solicitar Estudo",
    description: "Precisa de uma análise mais detalhada? Solicite um estudo de mercado completo e nossa equipe preparará um relatório personalizado.",
    icon: FileText,
    color: "text-green-600",
    details: [
      "Estudos detalhados com análise de mercado",
      "Relatórios personalizados por segmento",
      "Entrega em até 48 horas",
    ],
  },
  {
    title: "Acompanhar Estudos",
    description: "Acompanhe o status dos seus estudos em tempo real. Receba notificações quando estiverem prontos.",
    icon: FolderOpen,
    color: "text-purple-600",
    details: [
      "Status em tempo real de cada estudo",
      "Notificações automáticas de conclusão",
      "Histórico completo de solicitações",
    ],
  },
  {
    title: "Histórico e Relatórios",
    description: "Acesse todo o histórico de análises e estudos realizados. Baixe relatórios em PDF a qualquer momento.",
    icon: BarChart3,
    color: "text-orange-600",
    details: [
      "Acesso a todos os relatórios anteriores",
      "Exportar em PDF ou Excel",
      "Comparar análises ao longo do tempo",
    ],
  },
];

export default function Onboarding() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Verificar se é o primeiro acesso
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setOpen(false);
  };

  const step = steps[currentStep];
  const Icon = step.icon;
  
  // Mapa de cores para backgrounds
  const colorBgMap: Record<string, string> = {
    'text-green-600': 'bg-green-50 dark:bg-green-950/30',
    'text-blue-600': 'bg-blue-50 dark:bg-blue-950/30',
    'text-purple-600': 'bg-purple-50 dark:bg-purple-950/30',
    'text-orange-600': 'bg-orange-50 dark:bg-orange-950/30',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`w-20 h-20 rounded-full ${colorBgMap[step.color]} flex items-center justify-center animate-pulse`}>
              <Icon className={`h-10 w-10 ${step.color}`} />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold">{step.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-3">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {/* Detalhes do passo */}
        {step.details && (
          <div className="space-y-2 py-4 px-2">
            {step.details.map((detail, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full ${colorBgMap[step.color]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <span className="text-xs font-bold text-gray-700">✓</span>
                </div>
                <span className="text-sm text-gray-700 pt-0.5">{detail}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-primary"
                  : index < currentStep
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="text-center text-xs text-gray-500">
          Passo {currentStep + 1} de {steps.length}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between pt-2">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handlePrevious}>
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleClose}>
              Pular
            </Button>
            <Button onClick={handleNext} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              {currentStep === steps.length - 1 ? "Começar" : "Próximo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

