import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Map, FileText, FolderOpen, BarChart3, CheckCircle2 } from "lucide-react";

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    title: "Bem-vindo ao Sistema Busca Ponto!",
    description: "Vamos fazer um tour rápido pelas principais funcionalidades da plataforma.",
    icon: CheckCircle2,
    color: "text-green-600",
  },
  {
    title: "Análise Rápida",
    description: "Use o Mapa Interativo para fazer análises de localização em tempo real. Selecione um endereço, defina o raio e escolha o segmento.",
    icon: Map,
    color: "text-blue-600",
  },
  {
    title: "Solicitar Estudo",
    description: "Precisa de uma análise mais detalhada? Solicite um estudo de mercado completo e nossa equipe preparará um relatório personalizado.",
    icon: FileText,
    color: "text-green-600",
  },
  {
    title: "Acompanhar Estudos",
    description: "Acompanhe o status dos seus estudos em tempo real. Receba notificações quando estiverem prontos.",
    icon: FolderOpen,
    color: "text-purple-600",
  },
  {
    title: "Histórico e Relatórios",
    description: "Acesse todo o histórico de análises e estudos realizados. Baixe relatórios em PDF a qualquer momento.",
    icon: BarChart3,
    color: "text-orange-600",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-full bg-${step.color.split('-')[1]}-50 dark:bg-${step.color.split('-')[1]}-950/30 flex items-center justify-center`}>
              <Icon className={`h-8 w-8 ${step.color}`} />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{step.title}</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter className="flex justify-between sm:justify-between">
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
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? "Começar" : "Próximo"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

