import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    console.log("[OAuth] Callback received", { code: code ? "present" : "missing", state: state ? "present" : "missing" });

    if (!code || !state) {
      console.error("[OAuth] Missing code or state", { code, state });
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log("[OAuth] Exchanging code for token...");
      const tokenResponse = await withTimeout(
        sdk.exchangeCodeForToken(code, state),
        15000,
        "Token exchange"
      );
      console.log("[OAuth] Token exchange successful");

      console.log("[OAuth] Getting user info...");
      const userInfo = await withTimeout(
        sdk.getUserInfo(tokenResponse.accessToken),
        15000,
        "Get user info"
      );
      console.log("[OAuth] User info retrieved", { openId: userInfo.openId });

      if (!userInfo.openId) {
        console.error("[OAuth] Missing openId in user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      console.log("[OAuth] Starting upsertUser for:", userInfo.openId);
      await withTimeout(
        db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        }),
        15000,
        "UpsertUser"
      );
      console.log("[OAuth] upsertUser completed for:", userInfo.openId);

      // Vincular lead se houver email no sessionStorage (vindo do formulário de cadastro)
      // Nota: sessionStorage é client-side, então vamos usar cookie temporário
      const leadEmail = req.cookies.leadEmail;
      if (leadEmail) {
        try {
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { leads } = await import("../../drizzle/schema");
            const { eq } = await import("drizzle-orm");
            
            // Atualizar lead com userId
            const userRecord = await db.getUserByOpenId(userInfo.openId);
            if (userRecord) {
              await dbInstance
                .update(leads)
                .set({ userId: userRecord.id })
                .where(eq(leads.email, leadEmail));
              
              console.log(`[OAuth] Lead vinculado: ${leadEmail} -> userId ${userRecord.id}`);
            }
          }
        } catch (error) {
          console.error("[OAuth] Erro ao vincular lead:", error);
        }
        
        // Limpar cookie
        res.clearCookie("leadEmail");
      }

      console.log("[OAuth] Creating session token...");
      const sessionToken = await withTimeout(
        sdk.createSessionToken(userInfo.openId, {
          name: userInfo.name || "",
          expiresInMs: ONE_YEAR_MS,
        }),
        15000,
        "Create session token"
      );
      console.log("[OAuth] Session token created");

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log("[OAuth] Redirecting to home...");
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isDev = !ENV.isProduction;
      
      // Sempre retornar JSON válido
      return res.status(500).json({ 
        error: "OAuth callback failed",
        message: isDev ? errorMessage : "Authentication failed. Please try again.",
        ...(isDev && { details: String(error) })
      });
    }
  });
}

