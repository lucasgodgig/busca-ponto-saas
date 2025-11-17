import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function InviteCodeValidation() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  
  const validateCodeMutation = trpc.auth.validateInviteCode.useMutation();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error("Por favor, digite o código de convite");
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateCodeMutation.mutateAsync({ code: code.trim() });
      
      if (result.valid) {
        // Armazenar o código validado na sessão
        sessionStorage.setItem("inviteCodeValidated", "true");
        sessionStorage.setItem("inviteCode", code.trim());
        toast.success("Código validado com sucesso!");
        
        // Redirecionar para home
        setLocation("/");
      } else {
        toast.error("Código de convite inválido ou expirado");
      }
    } catch (error) {
      toast.error("Erro ao validar código");
      console.error(error);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Sistema Busca Ponto</CardTitle>
          <CardDescription className="text-slate-400">
            Digite o código de convite para continuar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleValidate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Código de Convite</label>
              <Input
                type="text"
                placeholder="Digite o código"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isValidating}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={isValidating || !code.trim()}
              className="w-full h-10 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                "Validar Código"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-xs text-slate-400 text-center">
              Este código é necessário para acessar a plataforma. Entre em contato com o administrador se não tiver um código.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

