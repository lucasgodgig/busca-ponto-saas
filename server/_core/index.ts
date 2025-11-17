import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleSpaceQuery, handleSpaceDebug, handleSpacePolygonQuery } from "../routes/space";
import { initializeWebSocket } from "./websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Inicializar WebSocket para notificações em tempo real
  initializeWebSocket(server);
  console.log("[WebSocket] Servidor WebSocket inicializado");
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Config endpoint para frontend
  app.get("/api/config", (_req, res) => {
    // FALLBACK DE EMERGÊNCIA: API key hardcoded para garantir funcionamento em produção
    const EMERGENCY_API_KEY = 'AIzaSyCMRKty6h9qmy9M_IArn1T6Cye26epmujE';
    
    const viteKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    const placesKey = process.env.GOOGLE_PLACES_API_KEY;
    const finalKey = viteKey || placesKey || EMERGENCY_API_KEY;
    
    console.log("[API Config] VITE_GOOGLE_MAPS_API_KEY:", viteKey ? "SET (length: " + viteKey.length + ")" : "NOT SET");
    console.log("[API Config] GOOGLE_PLACES_API_KEY:", placesKey ? "SET (length: " + placesKey.length + ")" : "NOT SET");
    console.log("[API Config] Using EMERGENCY fallback:", !viteKey && !placesKey);
    console.log("[API Config] Final key:", finalKey ? "SET (length: " + finalKey.length + ")" : "EMPTY");
    
    res.json({
      googleMapsApiKey: finalKey,
    });
  });
  
  // Space API routes
  app.get("/api/space", handleSpaceQuery);
  app.get("/api/space/debug", handleSpaceDebug);
  app.post("/api/space/polygon", handleSpacePolygonQuery);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`WebSocket disponível em ws://localhost:${port}/api/ws`);
  });
}

startServer().catch(console.error);
