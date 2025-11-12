import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

interface StudyNotification {
  type: "study_created" | "study_status_changed" | "study_updated";
  data: {
    studyId: number;
    title: string;
    segment?: string;
    address?: string;
    oldStatus?: string;
    newStatus?: string;
    tenantId?: number;
    createdBy?: string;
    changedBy?: string;
  };
  timestamp: Date;
}

type NotificationCallback = (notification: StudyNotification) => void;

export function useWebSocketNotifications(
  onNotification?: NotificationCallback
) {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const connect = useCallback(() => {
    if (!user) return;
    
    // Desabilitar WebSocket em producao
    if (typeof window !== "undefined" && 
        (window.location.hostname.includes(".manusvm.computer") ||
         window.location.hostname.includes(".manus.computer") ||
         window.location.hostname.includes(".manus-asia.computer") ||
         window.location.hostname.includes(".manuscomputer.ai"))) {
      console.log("[WebSocket] Desabilitar em producao");
      return;
    }

    try {
      // Determinar protocolo correto (ws ou wss)
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      console.log("[WebSocket] Conectando a:", wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WebSocket] Conectado com sucesso");
        reconnectAttemptsRef.current = 0;

        // Enviar ping periodicamente para manter conexão viva
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);

        // Guardar intervalo para limpeza
        (ws as any).pingInterval = pingInterval;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("[WebSocket] Mensagem recebida:", message);

          if (message.type === "auth_required") {
            console.log("[WebSocket] Servidor pedindo autenticação");
            const authMessage = {
              type: "auth",
              userId: user.id,
              isAdmin: user.role === "admin_bp",
            };
            ws.send(JSON.stringify(authMessage));
            return;
          }

          if (message.type === "auth_success") {
            console.log("[WebSocket] Autenticação bem-sucedida");
            return;
          }

          if (message.type === "pong") {
            return;
          }

          // Processar notificações de estudos
          if (
            message.type === "study_created" ||
            message.type === "study_status_changed"
          ) {
            const notification: StudyNotification = message;

            // Mostrar toast baseado no tipo
            if (message.type === "study_created") {
              toast.info(
                `Novo estudo criado: "${message.data.title}" por ${message.data.createdBy}`
              );
            } else if (message.type === "study_status_changed") {
              toast.info(
                `Estudo "${message.data.title}" mudou para ${message.data.newStatus}`
              );
            }

            // Chamar callback se fornecido
            if (onNotification) {
              onNotification(notification);
            }
          }
        } catch (error) {
          console.error("[WebSocket] Erro ao processar mensagem:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Erro:", error);
      };

      ws.onclose = () => {
        console.log("[WebSocket] Desconectado");

        // Limpar intervalo de ping
        const pingInterval = (ws as any).pingInterval;
        if (pingInterval) {
          clearInterval(pingInterval);
        }

        // Tentar reconectar
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(
            `[WebSocket] Tentando reconectar em ${RECONNECT_DELAY}ms (tentativa ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          console.error(
            "[WebSocket] Máximo de tentativas de reconexão atingido"
          );
          toast.error("Conexão com servidor de notificações perdida");
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Erro ao conectar:", error);
    }
  }, [user, onNotification]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
    reconnect: connect,
  };
}

