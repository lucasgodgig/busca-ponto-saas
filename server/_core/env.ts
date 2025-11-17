const trim = (value?: string | null) => value?.trim() ?? "";

const resolveGoogleMapsApiKey = () => {
  const directKey = trim(process.env.GOOGLE_MAPS_API_KEY);
  if (directKey) return directKey;

  const placesKey = trim(process.env.GOOGLE_PLACES_API_KEY);
  if (placesKey) return placesKey;

  return trim(process.env.VITE_GOOGLE_MAPS_API_KEY);
};

export const ENV = {
  appId: trim(process.env.VITE_APP_ID),
  cookieSecret: trim(process.env.JWT_SECRET),
  databaseUrl: trim(process.env.DATABASE_URL),
  oAuthServerUrl: trim(process.env.OAUTH_SERVER_URL),
  ownerOpenId: trim(process.env.OWNER_OPEN_ID),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: trim(process.env.BUILT_IN_FORGE_API_URL),
  forgeApiKey: trim(process.env.BUILT_IN_FORGE_API_KEY),
  spaceApiBaseUrl: trim(process.env.SPACE_API_BASE_URL),
  spaceApiKey: trim(process.env.SPACE_API_KEY),
  spaceDefaultRadius: parseInt(process.env.SPACE_DEFAULT_RADIUS ?? "1500"),
  spaceMaxRadius: parseInt(process.env.SPACE_MAX_RADIUS ?? "5000"),
  googleMapsApiKey: resolveGoogleMapsApiKey(),
  googlePlacesApiKey: trim(process.env.GOOGLE_PLACES_API_KEY),
  stripeSecretKey: trim(process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: trim(process.env.STRIPE_WEBHOOK_SECRET),
  resendApiKey: trim(process.env.RESEND_API_KEY),
};

export function assertCriticalEnv() {
  const missing: string[] = [];

  if (!ENV.appId) {
    missing.push("VITE_APP_ID");
  }

  if (!ENV.cookieSecret) {
    missing.push("JWT_SECRET");
  }

  if (!ENV.oAuthServerUrl) {
    missing.push("OAUTH_SERVER_URL");
  }

  if (!ENV.googleMapsApiKey) {
    missing.push("GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY / VITE_GOOGLE_MAPS_API_KEY)");
  }

  if (!ENV.spaceApiBaseUrl) {
    missing.push("SPACE_API_BASE_URL");
  }

  if (!ENV.spaceApiKey) {
    missing.push("SPACE_API_KEY");
  }

  if (!ENV.stripeSecretKey) {
    missing.push("STRIPE_SECRET_KEY");
  }

  if (!ENV.stripeWebhookSecret) {
    missing.push("STRIPE_WEBHOOK_SECRET");
  }

  if (missing.length) {
    throw new Error(
      `[ENV] Missing required environment variables: ${missing.join(", ")}`
    );
  }
}
