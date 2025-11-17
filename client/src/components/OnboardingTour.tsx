import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao Busca Ponto!",
    description: "Vamos te mostrar como usar a plataforma",
    icon: "👋",
    details: [
      "Explore dados demográficos precisos",
      "Analise pontos comerciais em tempo real",
      "Gere relatórios profissionais",
    ],
  },
  {
    id: "mapa",
    title: "Mapa Interativo",
    description: "Visualize pontos comerciais no mapa",
    icon: "🗺️",
    details: [
      "Busque por endereço ou coordenadas",
      "Ajuste o raio de busca",
      "Veja dados demográficos em tempo real",
    ],
  },
  {
    id: "analise",
    title: "Análises Detalhadas",
    description: "Gere análises profissionais de mercado",
    icon: "📊",
    details: [
      "Dados demográficos por faixa etária",
      "Renda média da região",
      "Informações de domicílios",
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios Exportáveis",
    description: "Exporte seus dados em PDF ou Excel",
    icon: "📈",
    details: [
      "Gere relatórios profissionais",
      "Compartilhe com clientes",
      "Mantenha histórico de análises",
    ],
  },
  {
    id: "pronto",
    title: "Você está pronto!",
    description: "Comece a explorar a plataforma",
    icon: "🚀",
    details: [
      "Clique em 'Começar' para acessar o mapa",
      "Explore a interface",
      "Leia a documentação se precisar",
    ],
  },
];

interface OnboardingTourProps {
  onComplete?: () => void;
  open?: boolean;
}

export function OnboardingTour({ onComplete, open = true }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(open);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Verificar se usuário já viu o tour
    const seen = localStorage.getItem("onboardingTourSeen");
    if (seen) {
      setHasSeenTour(true);
      setIsOpen(false);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("onboardingTourSeen", "true");
    setIsOpen(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem("onboardingTourSeen", "true");
    setIsOpen(false);
  };

  if (!isOpen || hasSeenTour) {
    return null;
  }

  const step = TOUR_STEPS[currentStep];
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="text-4xl mb-2">{step.icon}</div>
              <CardTitle className="text-2xl">{step.title}</CardTitle>
              <CardDescription className="text-base mt-1">
                {step.description}
              </CardDescription>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Detalhes do step */}
          <div className="space-y-2">
            {step.details.map((detail, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-blue-600 font-bold">✓</span>
                <span className="text-gray-700">{detail}</span>
              </div>
            ))}
          </div>

          {/* Indicador de passo */}
          <div className="text-sm text-gray-500 text-center">
            Passo {currentStep + 1} de {TOUR_STEPS.length}
          </div>

          {/* Botões de navegação */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>

            {currentStep === TOUR_STEPS.length - 1 ? (
              <Button
                onClick={handleComplete}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                Começar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                Próximo
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Link para pular */}
          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Pular tour
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

export default OnboardingTour;
