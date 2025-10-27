import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    logoUrl: "",
    colorPrimary: "#0F172A",
  });

  const createTenantMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      toast.success("Franqueadora criada com sucesso!");
      setLocation("/app");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar franqueadora");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Digite o nome da franqueadora");
      return;
    }

    if (!formData.slug.trim()) {
      toast.error("Digite o slug da franqueadora");
      return;
    }

    // Validar slug (apenas letras minúsculas, números e hífens)
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error("Slug deve conter apenas letras minúsculas, números e hífens");
      return;
    }

    await createTenantMutation.mutateAsync({
      name: formData.name,
      slug: formData.slug,
      logoUrl: formData.logoUrl || undefined,
      colorPrimary: formData.colorPrimary,
    });
  };

  // Auto-gerar slug baseado no nome
  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
        .replace(/\s+/g, "-") // Substitui espaços por hífens
        .replace(/-+/g, "-") // Remove hífens duplicados
        .trim(),
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você precisa estar logado</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Franqueadora</CardTitle>
          <CardDescription>
            Configure sua franqueadora para começar a usar o Busca Ponto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Franqueadora *</Label>
              <Input
                id="name"
                placeholder="Ex: Minha Franquia"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={createTenantMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (identificador único) *</Label>
              <Input
                id="slug"
                placeholder="Ex: minha-franquia"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                disabled={createTenantMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logoUrl">URL do Logo (opcional)</Label>
              <Input
                id="logoUrl"
                type="url"
                placeholder="https://exemplo.com/logo.png"
                value={formData.logoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, logoUrl: e.target.value })
                }
                disabled={createTenantMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorPrimary">Cor Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="colorPrimary"
                  type="color"
                  value={formData.colorPrimary}
                  onChange={(e) =>
                    setFormData({ ...formData, colorPrimary: e.target.value })
                  }
                  disabled={createTenantMutation.isPending}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={formData.colorPrimary}
                  onChange={(e) =>
                    setFormData({ ...formData, colorPrimary: e.target.value })
                  }
                  disabled={createTenantMutation.isPending}
                  placeholder="#0F172A"
                />
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={createTenantMutation.isPending}
              >
                {createTenantMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Franqueadora"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setLocation("/")}
                disabled={createTenantMutation.isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

