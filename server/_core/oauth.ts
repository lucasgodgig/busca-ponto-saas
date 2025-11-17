import {
  COOKIE_NAME,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_MAX_AGE_MS,
} from "@shared/const";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";
import { getSessionCookieOptions, isSecureRequest } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

type OAuthStatePayload = {
  redirectUri: string;
  nonce: string;
  issuedAt: number;
};

const getCookieValue = (req: Request, key: string): string | undefined => {
  if (req.cookies && typeof req.cookies[key] === "string") {
    return req.cookies[key] as string;
  }

  const header = req.headers.cookie;
  if (!header) return undefined;

  return parseCookieHeader(header)[key];
};

const decodeState = (rawState: string): OAuthStatePayload | null => {
  try {
    const decoded = Buffer.from(rawState, "base64").toString("utf-8");
    const payload = JSON.parse(decoded) as Partial<OAuthStatePayload>;

    if (
      typeof payload.redirectUri !== "string" ||
      typeof payload.nonce !== "string" ||
      typeof payload.issuedAt !== "number"
    ) {
      return null;
    }

    return payload as OAuthStatePayload;
  } catch (error) {
    console.error("[OAuth] Invalid state payload", error);
    return null;
  }
};

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

    const decodedState = decodeState(state);
    const expectedNonce = getCookieValue(req, OAUTH_STATE_COOKIE_NAME);
    const now = Date.now();

    // validação de state para mitigar CSRF
    if (!decodedState || !expectedNonce) {
      console.error("[OAuth] Invalid or missing OAuth state");
      res.status(400).json({ error: "Invalid OAuth state" });
      return;
    }

    const isExpired = now - decodedState.issuedAt > OAUTH_STATE_MAX_AGE_MS;
    if (isExpired || decodedState.nonce !== expectedNonce) {
      console.error("[OAuth] State validation failed", { isExpired });
      res.status(400).json({ error: "State validation failed" });
      return;
    }

    res.cookie(OAUTH_STATE_COOKIE_NAME, "", {
      path: "/",
      sameSite: "lax",
      secure: isSecureRequest(req),
      maxAge: 0,
    });

    try {
      console.log("[OAuth] [Token exchange] Starting at", new Date().toISOString());
      const startTokenExchange = Date.now();
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const tokenExchangeTime = Date.now() - startTokenExchange;
      console.log(`[OAuth] [Token exchange] Completed in ${tokenExchangeTime}ms`);

      console.log("[OAuth] [Get user info] Starting at", new Date().toISOString());
      const startGetUserInfo = Date.now();
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const getUserInfoTime = Date.now() - startGetUserInfo;
      console.log(`[OAuth] [Get user info] Completed in ${getUserInfoTime}ms`, { openId: userInfo.openId });

      if (!userInfo.openId) {
        console.error("[OAuth] Missing openId in user info");
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      console.log("[OAuth] [UpsertUser] Starting at", new Date().toISOString());
      const startUpsert = Date.now();
      
      // Verificar se o usuario veio do formulario de cadastro
      const registrationMethod = req.cookies?.registrationMethod || 'oauth';
      
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });
      
      // Limpar cookie de metodo de registro
      res.clearCookie('registrationMethod');
      const upsertTime = Date.now() - startUpsert;
      console.log(`[OAuth] [UpsertUser] Completed in ${upsertTime}ms for openId: ${userInfo.openId}`);

      // Vincular lead se houver email no sessionStorage (vindo do formulário de cadastro)
      // Nota: sessionStorage é client-side, então vamos usar cookie temporário
      const leadEmail = req.cookies?.leadEmail;
      if (leadEmail && leadEmail.trim()) {
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

      console.log("[OAuth] [Create session token] Starting at", new Date().toISOString());
      const startSessionToken = Date.now();
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const sessionTokenTime = Date.now() - startSessionToken;
      console.log(`[OAuth] [Create session token] Completed in ${sessionTokenTime}ms`);

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log("[OAuth] All operations completed successfully. Redirecting to home...");
      console.log("[OAuth] Timing summary:", {
        tokenExchange: `${tokenExchangeTime}ms`,
        getUserInfo: `${getUserInfoTime}ms`,
        upsertUser: `${upsertTime}ms`,
        createSessionToken: `${sessionTokenTime}ms`,
        total: `${Date.now() - startTokenExchange}ms`
      });
      
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

