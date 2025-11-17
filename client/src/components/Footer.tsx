import { getVersionString } from "@shared/version";

/**
 * Componente de rodapé profissional para todas as páginas
 * Exibe informações da empresa, versão com hash do commit e contato
 */
export default function Footer() {
  const versionString = getVersionString();
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {/* Informações da Empresa */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="font-medium text-foreground">
              Desenvolvido por <span className="font-semibold">Busca Ponto Consultoria LTDA</span>
            </p>
            <p className="text-xs">
              CNPJ 60.940.401/0001-53
            </p>
          </div>

          {/* Contato */}
          <div className="flex items-center gap-2">
            <a 
              href="mailto:contato@buscapontooficial.com.br"
              className="hover:text-primary transition-colors hover:underline"
            >
              contato@buscapontooficial.com.br
            </a>
          </div>

          {/* Versão com Hash do Commit */}
          <div className="text-xs font-mono">
            <span className="font-medium">{versionString}</span>
            <p className="text-xs opacity-75 mt-1">Sistema de rastreamento automático</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
          <p>© {currentYear} Busca Ponto Consultoria LTDA. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

