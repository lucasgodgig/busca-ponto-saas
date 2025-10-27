import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings as SettingsIcon, Building2, Palette } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  // Selecionar tenant automaticamente
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  // Buscar dados do tenant
  const { data: tenants } = trpc.tenants.list.useQuery(undefined, { enabled: !!selectedTenant });
  const tenant = tenants?.find(t => t.id === selectedTenant);
  const tenantLoading = false;

  // Estados do formulário
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [colorPrimary, setColorPrimary] = useState("");

  // Preencher formulário quando tenant carregar
  if (tenant && !name) {
    setName(tenant.name);
    setLogoUrl(tenant.logoUrl || "");
    setColorPrimary(tenant.colorPrimary || "#0F172A");
  }

  // Mutation para atualizar tenant
  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Configurações atualizadas com sucesso!");
      window.location.reload();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar configurações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    updateMutation.mutate({
      tenantId: selectedTenant,
      name,
      logoUrl: logoUrl || undefined,
      colorPrimary: colorPrimary || undefined,
    });
  };

  if (authLoading || tenantLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  if (!selectedTenant || !tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Nenhuma franqueadora encontrada</CardTitle>
            <CardDescription>
              Você precisa estar associado a uma franqueadora para acessar as configurações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/onboarding")} className="w-full">
              Criar Franqueadora
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Configurações</h1>
            </div>
            <Button variant="outline" onClick={() => setLocation("/app")}>
              Voltar ao Mapa
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Informações da Franqueadora */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações da Franqueadora
              </CardTitle>
              <CardDescription>
                Configure o nome e a identidade visual da sua franqueadora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Franqueadora</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Minha Franquia"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL do Logo</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <p className="text-xs text-muted-foreground">
                    Insira a URL de uma imagem hospedada online
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colorPrimary" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cor Principal
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="colorPrimary"
                      type="color"
                      value={colorPrimary}
                      onChange={(e) => setColorPrimary(e.target.value)}
                      className="w-20 h-10"
                    />
                    <Input
                      type="text"
                      value={colorPrimary}
                      onChange={(e) => setColorPrimary(e.target.value)}
                      placeholder="#0F172A"
                      pattern="^#[0-9A-Fa-f]{6}$"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cor usada nos elementos principais da interface
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Informações do Plano */}
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                Informações sobre seu plano e limites de uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-medium capitalize">{tenant.plan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consultas mensais:</span>
                <span className="font-medium">{tenant.limitsJson.quickQueriesPerMonth}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estudos simultâneos:</span>
                <span className="font-medium">{tenant.limitsJson.simultaneousStudies}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tamanho máximo de anexos:</span>
                <span className="font-medium">{tenant.limitsJson.maxAttachmentSizeMB}MB</span>
              </div>
            </CardContent>
          </Card>

          {/* Informações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Técnicas</CardTitle>
              <CardDescription>
                Dados técnicos da franqueadora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{tenant.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug:</span>
                <span className="font-mono">{tenant.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span>{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

