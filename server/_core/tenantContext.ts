import { TRPCError } from "@trpc/server";
import { TrpcContext } from "./context";
import { getUserMembershipInTenant, getTenantById } from "../db";

export type TenantContext = TrpcContext & {
  tenantId: number;
  membershipRole: "tenant_admin" | "member";
};

/**
 * Middleware para validar acesso ao tenant
 * Verifica se o usuário tem membership no tenant especificado
 */
export async function validateTenantAccess(
  ctx: TrpcContext & { user: NonNullable<TrpcContext["user"]> },
  tenantId: number
): Promise<TenantContext> {
  // Admin BP tem acesso a todos os tenants
  if (ctx.user.role === "admin_bp") {
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tenant não encontrado",
      });
    }

    return {
      ...ctx,
      tenantId,
      membershipRole: "tenant_admin", // Admin BP tem permissões de admin
    };
  }

  // Verificar membership do usuário no tenant
  const membership = await getUserMembershipInTenant(ctx.user.id, tenantId);

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem acesso a este tenant",
    });
  }

  return {
    ...ctx,
    tenantId,
    membershipRole: membership.role,
  };
}

/**
 * Verifica se o usuário tem permissão de admin no tenant
 */
export function requireTenantAdmin(tenantCtx: TenantContext) {
  if (tenantCtx.membershipRole !== "tenant_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores do tenant podem realizar esta ação",
    });
  }
}

