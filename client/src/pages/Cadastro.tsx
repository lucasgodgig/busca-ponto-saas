import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

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

    if (!formData.nome || !formData.email || !formData.telefone || !formData.empresa || !formData.cargo) {
      toast.error("Todos os campos são obrigatórios");
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

      // Salvar email em localStorage para página de confirmação
      localStorage.setItem("cadastroEmail", formData.email);

      toast.success("Cadastro realizado! Redirecionando...");

      // Redirecionar para página de confirmação
      setTimeout(() => {
        setLocation("/cadastro-confirmacao");
      }, 500);
    } catch (error) {
      toast.error("Erro ao realizar cadastro");
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-lg text-[#001F5C] hover:opacity-80 transition-opacity">
              <MapPin className="w-6 h-6" />
              Busca Ponto
            </a>
          </Link>
          <Link href="/">
            <a className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
              ← Voltar
            </a>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <MapPin className="w-8 h-8 text-[#001F5C]" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Comece seu teste
            </h1>
            <p className="text-gray-600">
              Preencha os dados abaixo e tenha acesso imediato à plataforma
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">
                  Nome completo *
                </label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-11 border-gray-300 focus:border-[#001F5C] focus:ring-[#001F5C]"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">
                  E-mail profissional *
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-11 border-gray-300 focus:border-[#001F5C] focus:ring-[#001F5C]"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">
                  Telefone *
                </label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-11 border-gray-300 focus:border-[#001F5C] focus:ring-[#001F5C]"
                />
              </div>

              {/* Empresa */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">
                  Empresa *
                </label>
                <Input
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={formData.empresa}
                  onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-11 border-gray-300 focus:border-[#001F5C] focus:ring-[#001F5C]"
                />
              </div>

              {/* Cargo */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-900">
                  Cargo *
                </label>
                <Input
                  type="text"
                  placeholder="Seu cargo na empresa"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  disabled={isSubmitting}
                  required
                  className="h-11 border-gray-300 focus:border-[#001F5C] focus:ring-[#001F5C]"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !formData.nome || !formData.email || !formData.telefone || !formData.empresa || !formData.cargo}
                className="w-full h-11 bg-yellow-400 hover:bg-yellow-500 text-[#001F5C] font-bold text-base rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Começar teste gratuito
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center mt-4">
                Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
              </p>
            </form>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-[#001F5C]">Teste gratuito:</span> 14 dias de acesso completo. Sem cartão de crédito.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
