import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

interface NotificationPayload {
  type: "study_created" | "study_status_changed" | "study_updated";
  data: any;
  timestamp: Date;
}

interface ClientConnection {
  ws: WebSocket;
  userId: number;
  isAdmin: boolean;
}

class NotificationManager {
  private wss: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/api/ws" });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on("connection", (ws: WebSocket, req) => {
      console.log("[WebSocket] Nova conexão recebida");

      let userId: number | null = null;
      let isAdmin = false;
      let clientId: string = "";

      // Enviar mensagem pedindo autenticação
      ws.send(
        JSON.stringify({
          type: "auth_required",
          message: "Por favor, envie dados de autenticação",
          timestamp: new Date(),
        })
      );

      // Lidar com mensagens do cliente
      ws.on("message", (data: string) => {
        try {
          const message = JSON.parse(data);
          
          // Primeira mensagem deve ser autenticação
          if (message.type === "auth" && !userId) {
            userId = message.userId;
            isAdmin = message.isAdmin || false;
            const newClientId = `${userId}-${Date.now()}`;
            clientId = newClientId;
            
            const clientConnection: ClientConnection = {
              ws,
              userId: userId as number,
              isAdmin,
            };
            
            this.clients.set(clientId, clientConnection);
            console.log(`[WebSocket] Cliente autenticado: ${clientId} (Admin: ${isAdmin})`);
            
            // Confirmar autenticação
            ws.send(
              JSON.stringify({
                type: "auth_success",
                message: "Autenticado com sucesso",
                timestamp: new Date(),
              })
            );
            return;
          }
          
          if (!userId) {
            console.log("[WebSocket] Mensagem rejeitada: cliente não autenticado");
            return;
          }
          
          console.log(`[WebSocket] Mensagem recebida de ${clientId}:`, message);

          // Responder com pong se receber ping
          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong", timestamp: new Date() }));
          }
        } catch (error) {
          console.error("[WebSocket] Erro ao processar mensagem:", error);
        }
      });

      // Lidar com desconexão
      ws.on("close", () => {
        if (clientId) {
          this.clients.delete(clientId);
          console.log(`[WebSocket] Cliente desconectado: ${clientId}`);
        }
      });

      // Lidar com erros
      ws.on("error", (error) => {
        console.error(`[WebSocket] Erro no cliente ${clientId || 'desconhecido'}:`, error);
      });
      
      // Timeout de autenticação (5 segundos)
      const authTimeout = setTimeout(() => {
        if (!userId) {
          console.log("[WebSocket] Conexão fechada: timeout de autenticação");
          ws.close(1008, "Authentication timeout");
        }
      }, 5000);
      
      // Guardar timeout para limpeza
      (ws as any).authTimeout = authTimeout;
    });
  }

  /**
   * Enviar notificação para um usuário específico
   */
  public notifyUser(userId: number, payload: NotificationPayload) {
    const message = JSON.stringify(payload);

    this.clients.forEach((client) => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });

    console.log(`[WebSocket] Notificação enviada para usuário ${userId}`);
  }

  /**
   * Enviar notificação para todos os admins
   */
  public notifyAdmins(payload: NotificationPayload) {
    const message = JSON.stringify(payload);

    this.clients.forEach((client) => {
      if (client.isAdmin && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });

    console.log("[WebSocket] Notificação enviada para todos os admins");
  }

  /**
   * Enviar notificação para todos os clientes conectados
   */
  public broadcastNotification(payload: NotificationPayload) {
    const message = JSON.stringify(payload);

    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });

    console.log("[WebSocket] Notificação enviada para todos os clientes");
  }

  /**
   * Obter número de clientes conectados
   */
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Obter número de admins conectados
   */
  public getConnectedAdminsCount(): number {
    let count = 0;
    this.clients.forEach((client) => {
      if (client.isAdmin) count++;
    });
    return count;
  }
}

let notificationManager: NotificationManager | null = null;

export function initializeWebSocket(server: Server): NotificationManager {
  if (!notificationManager) {
    notificationManager = new NotificationManager(server);
  }
  return notificationManager;
}

export function getNotificationManager(): NotificationManager | null {
  return notificationManager;
}

export type { NotificationPayload };

