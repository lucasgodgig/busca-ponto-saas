import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useLocation } from "wouter";
import { ArrowRight, MapPin, BarChart3, Zap } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Se usuário está autenticado, redirecionar para dashboard
  useEffect(() => {
    if (!loading && user) {
      navigate("/app");
    }
  }, [loading, user, navigate]);

  if (!loading && user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header com Logo */}
      <div className="border-b border-slate-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} alt={APP_TITLE} className="w-10 h-10 rounded-lg" />
            <h1 className="text-xl font-bold text-gray-900">{APP_TITLE}</h1>
          </div>
          <a
            href="https://www.buscaponto.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Saber mais
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-12 sm:py-20 flex flex-col justify-center min-h-[calc(100vh-80px)]">
        {/* Card de Login */}
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="p-8 space-y-6">
            {/* Título */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                Bem-vindo ao {APP_TITLE}
              </h2>
              <p className="text-gray-600">
                Análise geoespacial para grandes redes
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

            {/* Features */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Mapa Interativo</p>
                  <p className="text-xs text-gray-600">Visualize dados demográficos em tempo real</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Análises Precisas</p>
                  <p className="text-xs text-gray-600">Dados do Censo e inteligência de mercado</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Rápido e Fácil</p>
                  <p className="text-xs text-gray-600">Comece em minutos, sem complicações</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

            {/* Botão de Login */}
            <Button
              onClick={() => (window.location.href = getLoginUrl())}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-base rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Entrar com Manus"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2 bg-white text-gray-600">Novo por aqui?</span>
              </div>
            </div>

            {/* Botão de Cadastro */}
            <Button
              onClick={() => navigate("/cadastro")}
              variant="outline"
              className="w-full h-12 border-2 border-slate-300 text-gray-900 font-semibold text-base rounded-lg hover:bg-slate-50 transition-all"
            >
              Criar Conta Grátis
            </Button>

            {/* Footer Text */}
            <p className="text-xs text-gray-500 text-center">
              Ao continuar, você concorda com nossos{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Política de Privacidade
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Testimonial */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600 mb-4">
            Confiado por grandes redes em todo o Brasil
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <span>⭐⭐⭐⭐⭐ 4.9/5</span>
            <span className="text-gray-300">•</span>
            <span>+500 usuários ativos</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200/50 bg-white/50 backdrop-blur-sm mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-gray-600">
          <p>© 2025 {APP_TITLE}. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}
