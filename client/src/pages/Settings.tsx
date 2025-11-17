import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings as SettingsIcon, Building2, Palette, User, Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";
import NotificationSettings from "@/components/NotificationSettings";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);

  // Selecionar tenant automaticamente
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  // Buscar dados do tenant
  const { data: tenant, isLoading: tenantLoading } = trpc.tenants.list.useQuery();
  const currentTenant = tenant?.find(t => t.id === selectedTenant);

  // Estados do formulário - Empresa
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [colorPrimary, setColorPrimary] = useState("");

  // Estados do formulário - Perfil do Usuário
  const [userEmail, setUserEmail] = useState(user?.email || "");
  const [userName, setUserName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preencher formulário quando tenant carregar
  if (currentTenant && !name) {
    setName(currentTenant.name);
    setLogoUrl(currentTenant.logoUrl || "");
    setColorPrimary(currentTenant.colorPrimary || "#0F172A");
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

  // Mutations para perfil do usuário
  const updateProfileMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar perfil");
    },
  });

  const changePasswordMutation = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar senha");
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

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    updateProfileMutation.mutate({
      userId: user.id,
      name: userName || undefined,
      email: userEmail || undefined,
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Preencha os campos de senha");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    if (!user?.id) return;

    changePasswordMutation.mutate({
      userId: user.id,
      currentPassword,
      newPassword,
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
              Criar Empresa
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
          {/* Informações da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>
                Configure o nome e a identidade visual da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Minha Empresa"
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

          {/* Perfil do Usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Meu Perfil
              </CardTitle>
              <CardDescription>
                Altere seus dados pessoais e senha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Seção de Dados Pessoais */}
                <div>
                  <h3 className="text-sm font-semibold mb-4">Dados Pessoais</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="userName">Nome Completo</Label>
                      <Input
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userEmail" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção de Alteração de Senha */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Alterar Senha
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Digite sua senha atual"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite sua nova senha"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme sua nova senha"
                      />
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleUpdateProfile}
                    className="flex-1"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      "Salvar Alterações do Perfil"
                    )}
                  </Button>
                  <Button 
                    onClick={handleChangePassword}
                    variant="outline" 
                    className="flex-1"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      setUserName(user?.name || "");
                      setUserEmail(user?.email || "");
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <NotificationSettings />

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
                <span className="font-medium capitalize">{currentTenant?.plan}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consultas mensais:</span>
                <span className="font-medium">{currentTenant?.limitsJson?.quickQueriesPerMonth}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estudos simultâneos:</span>
                <span className="font-medium">{currentTenant?.limitsJson?.simultaneousStudies}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tamanho máximo de anexos:</span>
                <span className="font-medium">{currentTenant?.limitsJson?.maxAttachmentSizeMB}MB</span>
              </div>
            </CardContent>
          </Card>

          {/* Informações Técnicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Técnicas</CardTitle>
              <CardDescription>
                Dados técnicos da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{currentTenant?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug:</span>
                <span className="font-mono">{currentTenant?.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span>{currentTenant?.createdAt ? new Date(currentTenant.createdAt).toLocaleDateString('pt-BR') : '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

