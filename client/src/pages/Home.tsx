import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Map, TrendingUp, BarChart3 } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Redirecionar para dashboard se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/app");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            {APP_LOGO && (
              <img src={APP_LOGO} alt={APP_TITLE} className="h-8" />
            )}
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
          <div>
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {user?.name}
                </span>
                <Button variant="outline" onClick={() => logout()}>
                  Sair
                </Button>
              </div>
            ) : (
              <Button asChild>
                <a href={getLoginUrl()}>Entrar</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container py-20">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-5xl font-bold tracking-tight">
              Análise Geoespacial para Franqueadoras
            </h2>
            <p className="text-xl text-muted-foreground">
              Tome decisões estratégicas com dados precisos de mercado.
              Consultas rápidas, estudos completos e insights em tempo real.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              {isAuthenticated ? (
                <Button size="lg" onClick={() => setLocation("/app")}>
                  Acessar Dashboard
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <a href={getLoginUrl()}>Começar Agora</a>
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-muted/30 py-20">
          <div className="container">
            <h3 className="text-3xl font-bold text-center mb-12">
              Recursos Principais
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-background p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Map className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">
                  Mapa Interativo
                </h4>
                <p className="text-muted-foreground">
                  Visualize dados demográficos, renda, fluxo e concorrência em
                  tempo real com nosso mapa sempre aberto.
                </p>
              </div>

              <div className="bg-background p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">
                  Consultas Rápidas
                </h4>
                <p className="text-muted-foreground">
                  Obtenha insights instantâneos sobre qualquer localização com
                  nossa integração à API Space.
                </p>
              </div>

              <div className="bg-background p-6 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-xl font-semibold mb-2">
                  Estudos Completos
                </h4>
                <p className="text-muted-foreground">
                  Solicite estudos de mercado detalhados com análise
                  profissional e relatórios personalizados.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container py-20">
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-primary text-primary-foreground p-12 rounded-3xl">
            <h3 className="text-3xl font-bold">
              Pronto para começar?
            </h3>
            <p className="text-lg opacity-90">
              Junte-se às franqueadoras que já usam o Busca Ponto para tomar
              decisões baseadas em dados.
            </p>
            {!isAuthenticated && (
              <Button size="lg" variant="secondary" asChild>
                <a href={getLoginUrl()}>Criar Conta Grátis</a>
              </Button>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2025 Busca Ponto. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

