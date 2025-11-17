import { WebSocketServer, WebSocket } from "ws";
import { Server, type IncomingMessage } from "http";
import type { Request } from "express";
import { sdk } from "./sdk";

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
      this.handleConnection(ws, req).catch((error) => {
        console.error("[WebSocket] Erro na conexão:", error);
        try {
          ws.close(1011, "Internal error");
        } catch (closeError) {
          console.error("[WebSocket] Falha ao fechar conexão com erro:", closeError);
        }
      });
    });
  }

  private async authenticateClient(req: IncomingMessage) {
    const fakeRequest = { headers: req.headers } as Request;
    return sdk.authenticateRequest(fakeRequest);
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    console.log("[WebSocket] Nova conexão recebida");

    let clientId = "";
    let registered = false;
    const authTimeoutMs = 5000;
    const user = await this.authenticateClient(req).catch((error) => {
      console.warn("[WebSocket] Autenticação falhou durante handshake:", error);
      ws.close(1008, "Authentication failed");
      return null;
    });

    if (!user) {
      return;
    }

    const authenticatedUserId = user.id;
    const authenticatedIsAdmin = user.role === "admin_bp";

    ws.send(
      JSON.stringify({
        type: "auth_required",
        message: "Por favor, confirme a autenticação",
        timestamp: new Date(),
      })
    );

    const registerClient = () => {
      if (registered) {
        return;
      }

      clientId = `${authenticatedUserId}-${Date.now()}`;
      const clientConnection: ClientConnection = {
        ws,
        userId: authenticatedUserId,
        isAdmin: authenticatedIsAdmin,
      };

      this.clients.set(clientId, clientConnection);
      registered = true;
      console.log(
        `[WebSocket] Cliente autenticado: ${clientId} (Admin: ${authenticatedIsAdmin})`
      );

      ws.send(
        JSON.stringify({
          type: "auth_success",
          message: "Autenticado com sucesso",
          timestamp: new Date(),
        })
      );
    };

    const authTimeout = setTimeout(() => {
      if (!registered) {
        console.log("[WebSocket] Conexão fechada: timeout de autenticação");
        ws.close(1008, "Authentication timeout");
      }
    }, authTimeoutMs);

    ws.on("message", (data: string) => {
      try {
        const message = JSON.parse(data);

        if (message.type === "auth" && !registered) {
          // Ignora dados enviados pelo cliente e usa o usuário autenticado no servidor
          registerClient();
          clearTimeout(authTimeout);
          return;
        }

        if (!registered) {
          console.log("[WebSocket] Mensagem rejeitada: cliente não autenticado");
          return;
        }

        console.log(`[WebSocket] Mensagem recebida de ${clientId}:`, message);

        if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date() }));
        }
      } catch (error) {
        console.error("[WebSocket] Erro ao processar mensagem:", error);
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
      if (clientId) {
        this.clients.delete(clientId);
        console.log(`[WebSocket] Cliente desconectado: ${clientId}`);
      }
    });

    ws.on("error", (error) => {
      console.error(`[WebSocket] Erro no cliente ${clientId || "desconhecido"}:`, error);
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

