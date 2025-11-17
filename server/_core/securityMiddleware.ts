/**
 * Security Middleware - Aplicar rate limiting e validações de segurança
 * Este arquivo centraliza todas as validações de segurança do projeto
 */

import { TRPCError } from "@trpc/server";
import { spaceApiLimiter, generalLimiter, authLimiter } from "./rateLimiter";
import * as db from "../db";

/**
 * Validar rate limit para Space API
 */
export async function validateSpaceApiRateLimit(userId?: number, ip?: string): Promise<void> {
  const key = userId ? `user-${userId}` : `ip-${ip || 'unknown'}`;
  const check = spaceApiLimiter.check(key);
  
  if (!check.allowed) {
    const resetIn = Math.ceil((check.resetTime - Date.now()) / 1000);
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Limite de requisições atingido. Tente novamente em ${resetIn} segundos.`,
    });
  }
}

/**
 * Validar rate limit para endpoints gerais
 */
export async function validateGeneralRateLimit(userId: number): Promise<void> {
  const key = `user-${userId}`;
  const check = generalLimiter.check(key);
  
  if (!check.allowed) {
    const resetIn = Math.ceil((check.resetTime - Date.now()) / 1000);
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Limite de requisições atingido. Tente novamente em ${resetIn} segundos.`,
    });
  }
}

/**
 * Validar rate limit para autenticação
 */
export async function validateAuthRateLimit(email: string): Promise<void> {
  const key = `auth-${email}`;
  const check = authLimiter.check(key);
  
  if (!check.allowed) {
    const resetIn = Math.ceil((check.resetTime - Date.now()) / 1000);
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Muitas tentativas de login. Tente novamente em ${resetIn} segundos.`,
    });
  }
}

/**
 * Validar acesso do usuário ao tenant
 */
export async function validateUserTenantAccess(userId: number, tenantId: number): Promise<void> {
  try {
    const membership = await db.getUserMembershipInTenant(userId, tenantId);
    
    if (!membership) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para acessar este tenant',
      });
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    
    console.error("[SecurityMiddleware] Error validating tenant access:", error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro ao validar acesso ao tenant',
    });
  }
}

/**
 * Validar se usuário é admin do tenant
 */
export async function validateTenantAdmin(userId: number, tenantId: number): Promise<void> {
  try {
    const membership = await db.getUserMembershipInTenant(userId, tenantId);
    
    if (!membership || membership.role !== 'tenant_admin') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Você precisa ser administrador do tenant para realizar esta ação',
      });
    }
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    
    console.error("[SecurityMiddleware] Error validating tenant admin:", error);
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro ao validar permissões de admin',
    });
  }
}

/**
 * Validar que um recurso pertence ao tenant do usuário
 */
export function validateResourceTenantMatch(resourceTenantId: number, userTenantId: number): void {
  if (resourceTenantId !== userTenantId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Este recurso não pertence ao seu tenant',
    });
  }
}

/**
 * Sanitizar entrada de texto para prevenir XSS
 */
export function sanitizeTextInput(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove < e >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Validar email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Log de auditoria para ações críticas
 */
export async function logSecurityEvent(
  event: string,
  userId?: number,
  tenantId?: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    await db.createAuditLog({
      tenantId,
      actorId: userId,
      action: event,
      metaJson: details,
    });
  } catch (error) {
    console.error("[SecurityMiddleware] Error logging security event:", error);
  }
}

