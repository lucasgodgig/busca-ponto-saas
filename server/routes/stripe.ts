import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { processedWebhooks, billingCustomers, tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Inicializar cliente Stripe
const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-10-29.clover",
});

/**
 * Webhook handler para eventos do Stripe
 * Processa eventos de pagamento de forma assíncrona com idempotência
 * Sempre retorna 200 OK com JSON válido
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  // Obter assinatura do header
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) {
    console.error("[Stripe Webhook] Assinatura não fornecida");
    return res.status(200).json({
      verified: false,
      error: "Assinatura não fornecida",
    });
  }

  let event: Stripe.Event;

  try {
    // Construir e validar evento usando a assinatura
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body (deve ser Buffer, não string)
      sig,
      ENV.stripeWebhookSecret
    );
    console.log(`[Stripe Webhook] Evento validado: ${event.type} (ID: ${event.id})`);
  } catch (err) {
    const error = err as Error;
    console.error(`[Stripe Webhook] Erro ao validar assinatura: ${error.message}`);
    // Retornar 200 mesmo em caso de erro de validação
    return res.status(200).json({
      verified: false,
      error: `Erro ao validar assinatura: ${error.message}`,
    });
  }

  // Processar evento de forma assíncrona (não bloqueia resposta)
  // Mas agora com idempotência e tratamento de erro
  processWebhookEvent(event).catch((err) => {
    console.error(`[Stripe Webhook] Erro ao processar evento ${event.id}: ${err.message}`);
  });

  // Retornar 200 OK com JSON válido IMEDIATAMENTE
  // Não esperar o processamento terminar
  return res.status(200).json({
    verified: true,
    eventId: event.id,
    eventType: event.type,
  });
}

/**
 * Processa eventos do Stripe de forma assíncrona com idempotência
 * Verifica se evento já foi processado antes de executar handlers
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database não disponível");
    throw new Error("Database not available");
  }

  try {
    // 1. Verificar se evento já foi processado (idempotência)
    const existingEvent = await db
      .select()
      .from(processedWebhooks)
      .where(eq(processedWebhooks.eventId, event.id))
      .limit(1);

    if (existingEvent.length > 0) {
      console.log(`[Stripe Webhook] Evento ${event.id} já foi processado. Ignorando.`);
      return;
    }

    // 2. Processar evento
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[Stripe Webhook] Evento não processado: ${event.type}`);
    }

    // 3. Registrar evento como processado (TRANSACAO)
    // Se falhar aqui, evento será reprocessado na próxima tentativa
    await db.transaction(async (tx) => {
      await tx.insert(processedWebhooks).values({
        eventId: event.id,
        eventType: event.type,
      });
    });

    console.log(`[Stripe Webhook] Evento ${event.id} processado e registrado com sucesso`);
  } catch (err) {
    const error = err as Error;
    console.error(`[Stripe Webhook] Erro ao processar evento ${event.type} (${event.id}): ${error.message}`);
    throw err;
  }
}

/**
 * Handlers para diferentes tipos de eventos
 * Implementar lógica de negócio aqui
 */

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`[Stripe] Pagamento bem-sucedido: ${paymentIntent.id}`);

  try {
    // Buscar customer ID do metadata ou do objeto
    const customerId = paymentIntent.customer as string;
    if (!customerId) {
      console.warn(`[Stripe] Pagamento ${paymentIntent.id} sem customer ID`);
      return;
    }

    // Buscar billing customer no banco
    const billingCustomer = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, customerId))
      .limit(1);

    if (billingCustomer.length === 0) {
      console.warn(`[Stripe] Billing customer não encontrado para ${customerId}`);
      return;
    }

    const tenantId = billingCustomer[0].tenantId;

    // TODO: Atualizar status do pedido no banco de dados
    console.log(`[Stripe] Pagamento confirmado para tenant ${tenantId}`);

    // TODO: Enviar email de confirmação
    // TODO: Ativar acesso ao plano
  } catch (error) {
    console.error(`[Stripe] Erro ao processar pagamento bem-sucedido: ${error}`);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Pagamento falhou: ${paymentIntent.id}`);

  try {
    const customerId = paymentIntent.customer as string;
    if (!customerId) {
      console.warn(`[Stripe] Pagamento falho ${paymentIntent.id} sem customer ID`);
      return;
    }

    // TODO: Notificar usuário sobre falha
    // TODO: Registrar tentativa de pagamento falha
    console.log(`[Stripe] Falha registrada para customer ${customerId}`);
  } catch (error) {
    console.error(`[Stripe] Erro ao processar pagamento falho: ${error}`);
    throw error;
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`[Stripe] Reembolso processado: ${charge.id}`);

  try {
    const customerId = charge.customer as string;
    if (!customerId) {
      console.warn(`[Stripe] Reembolso ${charge.id} sem customer ID`);
      return;
    }

    // Buscar billing customer
    const billingCustomer = await db
      .select()
      .from(billingCustomers)
      .where(eq(billingCustomers.stripeCustomerId, customerId))
      .limit(1);

    if (billingCustomer.length === 0) {
      console.warn(`[Stripe] Billing customer não encontrado para reembolso ${charge.id}`);
      return;
    }

    const tenantId = billingCustomer[0].tenantId;

    // TODO: Revogar acesso ao plano
    // TODO: Registrar reembolso no banco de dados
    console.log(`[Stripe] Reembolso registrado para tenant ${tenantId}`);
  } catch (error) {
    console.error(`[Stripe] Erro ao processar reembolso: ${error}`);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`[Stripe] Assinatura criada: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    if (!customerId) {
      console.warn(`[Stripe] Assinatura ${subscription.id} sem customer ID`);
      return;
    }

    // TRANSACAO: Atualizar billing customer com subscription ID
    await db.transaction(async (tx) => {
      const result = await tx
        .update(billingCustomers)
        .set({
          stripeSubscriptionId: subscription.id,
          updatedAt: new Date(),
        })
        .where(eq(billingCustomers.stripeCustomerId, customerId));

      if ((result as any).rowsAffected === 0) {
        console.warn(`[Stripe] Billing customer não encontrado para assinatura ${subscription.id}`);
      }
    });

    console.log(`[Stripe] Assinatura ${subscription.id} registrada no banco`);
  } catch (error) {
    console.error(`[Stripe] Erro ao processar criação de assinatura: ${error}`);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`[Stripe] Assinatura atualizada: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    if (!customerId) {
      console.warn(`[Stripe] Assinatura ${subscription.id} sem customer ID`);
      return;
    }

    // TRANSACAO: Atualizar detalhes da assinatura
    await db.transaction(async (tx) => {
      const result = await tx
        .update(billingCustomers)
        .set({
          stripeSubscriptionId: subscription.id,
          updatedAt: new Date(),
        })
        .where(eq(billingCustomers.stripeCustomerId, customerId));

      if ((result as any).rowsAffected === 0) {
        console.warn(`[Stripe] Billing customer não encontrado para atualização ${subscription.id}`);
      }
    });

    console.log(`[Stripe] Assinatura ${subscription.id} atualizada no banco`);
  } catch (error) {
    console.error(`[Stripe] Erro ao processar atualização de assinatura: ${error}`);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  console.log(`[Stripe] Assinatura cancelada: ${subscription.id}`);

  try {
    const customerId = subscription.customer as string;
    if (!customerId) {
      console.warn(`[Stripe] Assinatura cancelada ${subscription.id} sem customer ID`);
      return;
    }

    // TRANSACAO: Remover subscription ID
    await db.transaction(async (tx) => {
      const result = await tx
        .update(billingCustomers)
        .set({
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(billingCustomers.stripeCustomerId, customerId));

      if ((result as any).rowsAffected === 0) {
        console.warn(`[Stripe] Billing customer não encontrado para cancelamento ${subscription.id}`);
      }
    });

    console.log(`[Stripe] Assinatura ${subscription.id} cancelada no banco`);
  } catch (error) {
    console.error(`[Stripe] Erro ao processar cancelamento de assinatura: ${error}`);
    throw error;
  }
}
