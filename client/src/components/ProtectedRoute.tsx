import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Componente que protege rotas privadas
 * Redireciona usuários não autenticados para a landing page
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Aguarda carregamento da autenticação
    if (loading) return;

    // Se não está logado, redireciona para landing page
    if (!user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não está logado, não renderiza nada (vai redirecionar)
  if (!user) {
    return null;
  }

  // Usuário autenticado, renderiza conteúdo
  return <>{children}</>;
}

