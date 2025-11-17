import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "../_core/env";

// Inicializar cliente Stripe
const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-10-29.clover",
});

/**
 * Webhook handler para eventos do Stripe
 * Processa eventos de pagamento de forma assíncrona
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
    console.log(`[Stripe Webhook] Evento validado: ${event.type}`);
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
  processWebhookEvent(event).catch((err) => {
    console.error(`[Stripe Webhook] Erro ao processar evento: ${err.message}`);
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
 * Processa eventos do Stripe de forma assíncrona
 * Não bloqueia a resposta HTTP
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  try {
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

    console.log(`[Stripe Webhook] Evento processado com sucesso: ${event.type}`);
  } catch (err) {
    const error = err as Error;
    console.error(`[Stripe Webhook] Erro ao processar evento ${event.type}: ${error.message}`);
    throw err;
  }
}

/**
 * Handlers para diferentes tipos de eventos
 * Adicionar lógica de negócio aqui
 */

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Pagamento bem-sucedido: ${paymentIntent.id}`);
  // TODO: Atualizar status do pedido no banco de dados
  // TODO: Enviar email de confirmação
  // TODO: Ativar acesso ao plano
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe] Pagamento falhou: ${paymentIntent.id}`);
  // TODO: Notificar usuário sobre falha
  // TODO: Registrar tentativa de pagamento falha
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[Stripe] Reembolso processado: ${charge.id}`);
  // TODO: Revogar acesso ao plano
  // TODO: Registrar reembolso no banco de dados
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Assinatura criada: ${subscription.id}`);
  // TODO: Ativar assinatura no banco de dados
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Assinatura atualizada: ${subscription.id}`);
  // TODO: Atualizar detalhes da assinatura no banco de dados
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[Stripe] Assinatura cancelada: ${subscription.id}`);
  // TODO: Desativar assinatura no banco de dados
}
