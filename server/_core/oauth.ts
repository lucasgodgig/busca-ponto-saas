import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
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
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      console.log("[OAuth] Token exchange successful");
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      console.log("[OAuth] User info retrieved", { openId: userInfo.openId });

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const user = await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Vincular lead se houver email no sessionStorage (vindo do formulário de cadastro)
      // Nota: sessionStorage é client-side, então vamos usar cookie temporário
      const leadEmail = req.cookies.leadEmail;
      if (leadEmail && user.email) {
        try {
          const dbInstance = await db.getDb();
          if (dbInstance) {
            const { leads } = await import("../../drizzle/schema");
            const { eq, isNull } = await import("drizzle-orm");
            
            // Atualizar lead com userId
            await dbInstance
              .update(leads)
              .set({ userId: user.id })
              .where(
                eq(leads.email, leadEmail)
              );
            
            console.log(`[OAuth] Lead vinculado: ${leadEmail} -> userId ${user.id}`);
          }
        } catch (error) {
          console.error("[OAuth] Erro ao vincular lead:", error);
        }
        
        // Limpar cookie
        res.clearCookie("leadEmail");
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isDev = !ENV.isProduction;
      res.status(500).json({ 
        error: "OAuth callback failed",
        message: isDev ? errorMessage : undefined,
        details: isDev ? String(error) : undefined
      });
    }
  });
}
