import { Bell } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NotificationBadge() {
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  const { data: studies } = trpc.studies.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );
  
  // Filtrar estudos com atualizações recentes (últimas 24h)
  const recentUpdates = studies?.filter(study => {
    const updatedAt = new Date(study.updatedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24 && study.status !== 'aberto';
  }) || [];

  const unreadCount = recentUpdates.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {recentUpdates.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma notificação nova
          </div>
        ) : (
          <>
            {recentUpdates.map((study) => (
              <DropdownMenuItem key={study.id} className="flex flex-col items-start p-3 cursor-pointer">
                <div className="font-medium text-sm">{study.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {study.status === 'concluido' && '✅ Estudo concluído'}
                  {study.status === 'em_analise' && '🔄 Em análise'}
                  {study.status === 'devolvido' && '⚠️ Devolvido'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(study.updatedAt), { 
                    addSuffix: true,
                    locale: ptBR 
                  })}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

