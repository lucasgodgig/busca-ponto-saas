import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Loader2, FileText, MapPin, Target } from "lucide-react";

export default function SolicitarEstudo() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    segment: "",
    address: "",
    radiusM: 1000,
    description: "",
    objectives: "",
  });

  const createMutation = trpc.studyRequests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitação enviada com sucesso!", {
        description: "Nossa equipe irá analisar e entrar em contato em breve.",
      });
      setLocation("/meus-estudos");
    },
    onError: (error) => {
      toast.error("Erro ao enviar solicitação", {
        description: error.message,
      });
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.memberships?.[0]?.tenant?.id) {
      toast.error("Erro", { description: "Empresa não encontrada" });
      return;
    }

    setIsSubmitting(true);

    createMutation.mutate({
      tenantId: user.memberships[0].tenant.id,
      title: formData.title,
      segment: formData.segment || undefined,
      address: formData.address,
      radiusM: formData.radiusM,
      description: formData.description || undefined,
      objectives: formData.objectives || undefined,
    });
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/meus-estudos")}
            className="mb-4"
          >
            ← Voltar para Meus Estudos
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">Solicitar Estudo de Mercado</h1>
          <p className="text-muted-foreground mt-2">
            Preencha os dados abaixo e nossa equipe irá preparar um estudo completo para você.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Dados gerais sobre o estudo que você precisa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Título do Estudo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Ex: Análise para nova unidade em Joinville"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="segment">Segmento do Negócio</Label>
                <Input
                  id="segment"
                  placeholder="Ex: Academia, Pet Shop, Farmácia"
                  value={formData.segment}
                  onChange={(e) => handleChange("segment", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Localização
              </CardTitle>
              <CardDescription>
                Endereço e raio de análise desejado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">
                  Endereço <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  placeholder="Ex: Rua XV de Novembro, 1000 - Centro, Joinville - SC"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Informe o endereço completo ou ponto de referência
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Raio de Análise (metros)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="500"
                  max="5000"
                  step="100"
                  value={formData.radiusM}
                  onChange={(e) => handleChange("radiusM", parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Raio atual: {formData.radiusM}m ({(formData.radiusM / 1000).toFixed(1)}km)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Detalhes do Estudo
              </CardTitle>
              <CardDescription>
                Descreva o que você precisa analisar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição Geral</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva brevemente o contexto e o que você precisa..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives">Objetivos Específicos</Label>
                <Textarea
                  id="objectives"
                  placeholder="Liste os objetivos principais do estudo (ex: analisar concorrência, perfil demográfico, potencial de vendas...)"
                  value={formData.objectives}
                  onChange={(e) => handleChange("objectives", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/meus-estudos")}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.address}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Solicitação"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

