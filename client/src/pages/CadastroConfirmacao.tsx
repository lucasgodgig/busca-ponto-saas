import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Mail, ArrowRight, Clock } from "lucide-react";
import { getLoginUrl } from "@/const";

export default function CadastroConfirmacao() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Obter email do localStorage
    const savedEmail = localStorage.getItem("cadastroEmail");
    if (!savedEmail) {
      // Se não tiver email, redirecionar para cadastro
      setLocation("/cadastro");
      return;
    }
    setEmail(savedEmail);

    // Countdown para redirecionamento automático
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = getLoginUrl();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  const handleLoginNow = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Ícone de sucesso */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-green-200 rounded-full blur-xl opacity-50 animate-pulse" />
            <CheckCircle2 className="w-24 h-24 text-green-600 relative" />
          </div>
        </div>

        {/* Card principal */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl">Cadastro Realizado!</CardTitle>
            <CardDescription className="text-base">
              Bem-vindo ao Sistema Busca Ponto
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Mensagem de confirmação */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                Um e-mail de confirmação foi enviado para:
              </p>
              <p className="font-semibold text-gray-900 mt-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-600" />
                {email}
              </p>
            </div>

            {/* Próximos passos */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Próximos passos:</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-xs">
                    1
                  </span>
                  <span>Clique no botão abaixo para fazer login</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-xs">
                    2
                  </span>
                  <span>Autentique-se com sua conta Manus</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold text-xs">
                    3
                  </span>
                  <span>Comece a usar a plataforma imediatamente</span>
                </li>
              </ol>
            </div>

            {/* Botão de login */}
            <Button
              onClick={handleLoginNow}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              Fazer Login Agora
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <Clock className="w-4 h-4" />
              <span>Redirecionando em {countdown}s...</span>
            </div>

            {/* Suporte */}
            <p className="text-xs text-gray-500 text-center">
              Não recebeu o e-mail? Verifique sua pasta de spam ou{" "}
              <a href="mailto:contato@buscapontooficial.com.br" className="text-blue-600 hover:underline">
                entre em contato conosco
              </a>
            </p>
          </CardContent>
        </Card>

        {/* Benefícios */}
        <div className="mt-8 space-y-3">
          <p className="text-sm text-gray-600 text-center font-semibold">
            Você terá acesso a:
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="text-2xl">🗺️</div>
            <div className="text-2xl">📊</div>
            <div className="text-2xl">📈</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-600">
            <div>Mapa Interativo</div>
            <div>Análises Precisas</div>
            <div>Relatórios</div>
          </div>
        </div>
      </div>
    </div>
  );
}
