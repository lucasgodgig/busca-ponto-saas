import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, User, Mail, Phone, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

export default function Cadastro() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    empresa: "",
    cargo: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLeadMutation = trpc.leads.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email) {
      toast.error("Nome e e-mail são obrigatórios");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Por favor, insira um e-mail válido");
      return;
    }

    setIsSubmitting(true);
    try {
      await createLeadMutation.mutateAsync(formData);

      // Salvar email em cookie para vincular depois do login
      document.cookie = `leadEmail=${encodeURIComponent(formData.email)}; path=/; max-age=3600`;

      toast.success("Cadastro realizado! Redirecionando para login...");

      // Redirecionar para OAuth
      setTimeout(() => {
        window.location.href = getLoginUrl();
      }, 1000);
    } catch (error) {
      toast.error("Erro ao realizar cadastro");
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Comece seu teste gratuito por 3 dias
          </h1>
          <p className="text-lg text-gray-600">
            Preencha os dados abaixo e tenha acesso imediato à plataforma com todos os recursos
          </p>
        </div>

        {/* Card do formulário */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Dados de Cadastro</CardTitle>
            <CardDescription>
              Todos os campos são importantes para personalizar sua experiência
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome completo *
                </label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-12"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail profissional *
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-12"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone
                </label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  disabled={isSubmitting}
                  className="h-12"
                />
              </div>

              {/* Empresa */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Empresa
                </label>
                <Input
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  disabled={isSubmitting}
                  className="h-12"
                />
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Cargo
                </label>
                <Input
                  type="text"
                  placeholder="Seu cargo na empresa"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  disabled={isSubmitting}
                  className="h-12"
                />
              </div>

              {/* Botão de envio */}
              <Button
                type="submit"
                disabled={isSubmitting || !formData.nome || !formData.email}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-lg rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Começar teste gratuito (3 dias) →"
                )}
              </Button>

              {/* Aviso */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Benefícios */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-semibold text-gray-900">3 Dias Grátis</p>
            <p className="text-sm text-gray-600">Acesso completo à plataforma</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">📊</div>
            <p className="font-semibold text-gray-900">Análises Precisas</p>
            <p className="text-sm text-gray-600">Dados demográficos reais</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🚀</div>
            <p className="font-semibold text-gray-900">Rápido e Fácil</p>
            <p className="text-sm text-gray-600">Comece em minutos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

