export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { OAUTH_STATE_COOKIE_NAME, OAUTH_STATE_MAX_AGE_MS } from "@shared/const";

export const APP_TITLE = import.meta.env.VITE_APP_TITLE || "App";

export const APP_LOGO =
  import.meta.env.VITE_APP_LOGO ||
  "/logo-busca-ponto.png";

const isBrowser = typeof window !== "undefined";
const isDocument = typeof document !== "undefined";

const getFallbackAppOrigin = () => {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL || "";
  if (!configured) return "";
  try {
    return new URL(configured).origin;
  } catch {
    return configured;
  }
};

const getCurrentOrigin = () => {
  if (isBrowser) {
    return window.location.origin;
  }
  return getFallbackAppOrigin();
};

const createNonce = () => {
  if (typeof window === "undefined") {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  if (window.crypto?.getRandomValues) {
    const buffer = new Uint32Array(4);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer, value => value.toString(16).padStart(8, "0")).join("-");
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const persistOAuthStateNonce = (nonce: string) => {
  if (!isDocument) return;

  const maxAgeSeconds = Math.floor(OAUTH_STATE_MAX_AGE_MS / 1000);
  const isSecure = isBrowser && window.location.protocol === "https:";
  const secureFlag = isSecure ? "; Secure" : "";
  document.cookie = `${OAUTH_STATE_COOKIE_NAME}=${nonce}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secureFlag}`;
};

const encodeStatePayload = (payload: Record<string, string | number>) => {
  const raw = JSON.stringify(payload);
  if (isBrowser && typeof window.btoa === "function") {
    return window.btoa(raw);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(raw, "utf-8").toString("base64");
  }
  throw new Error("Unable to encode OAuth state without base64 support");
};

const resolveRedirectUri = (customOrigin?: string) => {
  const origin = customOrigin || getCurrentOrigin();
  if (!origin) {
    return "/api/oauth/callback";
  }
  return `${origin.replace(/\/$/, "")}/api/oauth/callback`;
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (options?: { redirectUri?: string }) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  if (!oauthPortalUrl || !appId) {
    throw new Error("Missing OAuth portal configuration");
  }
  const redirectUri = options?.redirectUri ?? resolveRedirectUri();
  const nonce = createNonce();
  persistOAuthStateNonce(nonce);

  const statePayload = {
    redirectUri,
    nonce,
    issuedAt: Date.now(),
  } satisfies Record<string, string | number>;
  const state = encodeStatePayload(statePayload);

  const url = new URL(`${oauthPortalUrl.replace(/\/$/, "")}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};