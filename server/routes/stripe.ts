import { Request, Response } from "express";
import Stripe from "stripe";
import type { Tenant } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import {
  createAuditLog,
  findBillingCustomerByStripeIdentifiers,
  saveBillingCustomerRecord,
  updateTenantPlanValue,
} from "../db";

if (!ENV.stripeSecretKey) {
  throw new Error("[Stripe] STRIPE_SECRET_KEY must be configured before initializing the client");
}

const STABLE_STRIPE_API_VERSION = "2023-10-16";

const stripe = new Stripe(ENV.stripeSecretKey, {
  // The Stripe type definitions may lag behind the stable API release cycle,
  // so we coerce the version string after verifying it is a supported date.
  apiVersion: STABLE_STRIPE_API_VERSION as unknown as Stripe.LatestApiVersion,
});

const VALID_PLANS: Tenant["plan"][] = ["start", "essencial", "pro"];
const VALID_PLAN_SET = new Set(VALID_PLANS);

type Metadata = Stripe.Metadata | null | undefined;

type SubscriptionPersistContext = {
  tenantIdFromMetadata?: number | null;
  fallbackPlan?: Tenant["plan"] | null;
  overridePlan?: Tenant["plan"] | null;
  overrideStatus?: string | null;
};

export async function handleStripeWebhook(req: Request, res: Response) {
  if (!ENV.stripeWebhookSecret) {
    console.error("[Stripe] STRIPE_WEBHOOK_SECRET is not configured");
    return res.status(500).json({ error: "stripe configuration missing" });
  }

  const signature = req.headers["stripe-signature"] as string | undefined;
  if (!signature) {
    return res.status(400).json({ error: "missing stripe-signature header" });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? "");
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, ENV.stripeWebhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn(`[Stripe] Invalid webhook signature: ${message}`);
    return res.status(400).json({ error: "invalid stripe signature" });
  }

  try {
    await processWebhookEvent(event);
    return res.status(200).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`[Stripe] Failed to process event ${event.type}: ${message}`);
    return res.status(500).json({ error: "failed to process stripe event" });
  }
}

async function processWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      return;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object as Stripe.Subscription, event.type);
      return;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      return;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      return;
    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      return;
    case "charge.refunded":
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      return;
    default:
      console.info(`[Stripe] Ignoring unsupported event: ${event.type}`);
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    await createAuditLog({
      action: "stripe:checkout.session.completed",
      targetType: "stripe_checkout_session",
      metaJson: { sessionId: session.id, mode: session.mode },
    });
    return;
  }

  const subscriptionId = extractStripeId(session.subscription);
  const customerId = extractStripeId(session.customer);

  if (!subscriptionId || !customerId) {
    console.warn(
      `[Stripe] checkout.session.completed missing subscription or customer for session ${session.id}`
    );
    return;
  }

  const tenantIdHint = resolveTenantIdFromMetadata(session.metadata, session.client_reference_id);
  const fallbackPlan = resolvePlanFromMetadata(session.metadata);

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const tenantId = await persistSubscriptionState(subscription, customerId, {
    tenantIdFromMetadata: tenantIdHint,
    fallbackPlan,
  });

  await createAuditLog({
    tenantId: tenantId ?? undefined,
    action: "stripe:checkout.session.completed",
    targetType: "stripe_checkout_session",
    metaJson: {
      sessionId: session.id,
      subscriptionId,
      status: subscription.status,
    },
  });
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription, eventType: string) {
  const customerId = extractStripeId(subscription.customer);
  if (!customerId) {
    console.warn(`[Stripe] ${eventType} missing customer reference for subscription ${subscription.id}`);
    return;
  }

  const tenantId = await persistSubscriptionState(subscription, customerId, {});
  await createAuditLog({
    tenantId: tenantId ?? undefined,
    action: `stripe:${eventType}`,
    targetType: "stripe_subscription",
    metaJson: {
      subscriptionId: subscription.id,
      status: subscription.status,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = extractStripeId(subscription.customer);
  if (!customerId) {
    console.warn(`[Stripe] customer.subscription.deleted missing customer for ${subscription.id}`);
    return;
  }

  const tenantId = await persistSubscriptionState(subscription, customerId, {
    overridePlan: "start",
    overrideStatus: "canceled",
  });

  await createAuditLog({
    tenantId: tenantId ?? undefined,
    action: "stripe:customer.subscription.deleted",
    targetType: "stripe_subscription",
    metaJson: {
      subscriptionId: subscription.id,
      status: "canceled",
    },
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  await createAuditLog({
    action: "stripe:payment_intent.succeeded",
    targetType: "stripe_payment_intent",
    metaJson: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount_received ?? paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  await createAuditLog({
    action: "stripe:payment_intent.payment_failed",
    targetType: "stripe_payment_intent",
    metaJson: {
      paymentIntentId: paymentIntent.id,
      lastPaymentError: paymentIntent.last_payment_error?.code,
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  await createAuditLog({
    action: "stripe:charge.refunded",
    targetType: "stripe_charge",
    metaJson: {
      chargeId: charge.id,
      amount: charge.amount_refunded,
      currency: charge.currency,
    },
  });
}

async function persistSubscriptionState(
  subscription: Stripe.Subscription,
  customerId: string,
  context: SubscriptionPersistContext
): Promise<number | null> {
  const tenantIdFromMetadata =
    context.tenantIdFromMetadata ?? resolveTenantIdFromMetadata(subscription.metadata);

  const existingRecord = await findBillingCustomerByStripeIdentifiers({
    tenantId: tenantIdFromMetadata ?? undefined,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });

  const tenantId = tenantIdFromMetadata ?? existingRecord?.tenantId ?? null;
  if (!tenantId) {
    console.warn(`[Stripe] Unable to resolve tenant for subscription ${subscription.id}`);
    return null;
  }

  const plan =
    context.overridePlan ??
    resolvePlanFromMetadata(subscription.metadata) ??
    resolvePlanFromSubscriptionItems(subscription) ??
    context.fallbackPlan ??
    null;

  const status = context.overrideStatus ?? subscription.status ?? null;

  await saveBillingCustomerRecord({
    tenantId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
  });

  if (plan) {
    await updateTenantPlanValue(tenantId, plan);
  }

  return tenantId;
}

function resolveTenantIdFromMetadata(metadata?: Metadata, fallback?: string | null): number | null {
  const candidateValues = [
    metadata?.tenantId,
    metadata?.tenant_id,
    metadata?.tenantID,
    metadata?.tenant,
    fallback ?? undefined,
  ];

  for (const candidate of candidateValues) {
    const parsed = parseTenantId(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function parseTenantId(value?: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePlanFromMetadata(metadata?: Metadata): Tenant["plan"] | null {
  if (!metadata) return null;
  const candidate =
    metadata.plan ?? metadata.Plan ?? metadata.tenantPlan ?? metadata.plan_slug ?? metadata.planSlug;
  return normalizePlan(candidate);
}

function resolvePlanFromSubscriptionItems(subscription: Stripe.Subscription): Tenant["plan"] | null {
  for (const item of subscription.items.data) {
    const fromMetadata = normalizePlan(item.price?.metadata?.plan);
    if (fromMetadata) return fromMetadata;

    const fromNickname = normalizePlan(item.price?.nickname ?? undefined);
    if (fromNickname) return fromNickname;
  }

  return null;
}

function normalizePlan(value?: string | null): Tenant["plan"] | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (VALID_PLAN_SET.has(normalized as Tenant["plan"])) {
    return normalized as Tenant["plan"];
  }
  return null;
}

function extractStripeId(
  value: string | { id: string } | Stripe.Subscription | Stripe.Customer | null | undefined
): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}
