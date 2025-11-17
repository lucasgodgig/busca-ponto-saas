/**
 * Tenant Validation - Middleware para validar acesso ao tenant
 * Garante que usuários só acessem dados de tenants aos quais pertencem
 */

import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * Valida se um usuário tem acesso a um tenant específico
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @returns true se o usuário tem acesso, false caso contrário
 */
export async function validateUserTenantAccess(
  userId: number,
  tenantId: number
): Promise<boolean> {
  try {
    const membership = await db.getUserMembershipInTenant(userId, tenantId);
    return !!membership;
  } catch (error) {
    console.error("[TenantValidation] Error validating tenant access:", error);
    return false;
  }
}

/**
 * Middleware que valida acesso ao tenant e lança erro se não autorizado
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @throws TRPCError se o usuário não tem acesso
 */
export async function requireTenantAccess(
  userId: number,
  tenantId: number
): Promise<void> {
  const hasAccess = await validateUserTenantAccess(userId, tenantId);
  
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar este tenant",
    });
  }
}

/**
 * Valida se um usuário é admin do tenant
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @returns true se o usuário é admin, false caso contrário
 */
export async function validateTenantAdmin(
  userId: number,
  tenantId: number
): Promise<boolean> {
  try {
    const membership = await db.getUserMembershipInTenant(userId, tenantId);
    return membership?.role === "tenant_admin";
  } catch (error) {
    console.error("[TenantValidation] Error validating tenant admin:", error);
    return false;
  }
}

/**
 * Middleware que valida se usuário é admin do tenant
 * @param userId - ID do usuário
 * @param tenantId - ID do tenant
 * @throws TRPCError se o usuário não é admin
 */
export async function requireTenantAdmin(
  userId: number,
  tenantId: number
): Promise<void> {
  const isAdmin = await validateTenantAdmin(userId, tenantId);
  
  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você precisa ser administrador do tenant para realizar esta ação",
    });
  }
}

/**
 * Valida se um recurso pertence a um tenant específico
 * Útil para validar acesso a estudos, consultas, etc
 * @param resourceTenantId - ID do tenant do recurso
 * @param userTenantId - ID do tenant do usuário
 * @throws TRPCError se os tenants não correspondem
 */
export function validateResourceTenantMatch(
  resourceTenantId: number,
  userTenantId: number
): void {
  if (resourceTenantId !== userTenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Este recurso não pertence ao seu tenant",
    });
  }
}

