import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const usageRouter = router({
  // Obter histórico de uso mensal dos últimos 12 meses
  getMonthlyHistory: protectedProcedure
    .query(async ({ ctx }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
      }

      const { generatedStudies, tenants } = await import("../../drizzle/schema");
      const { eq, and, count, sql } = await import("drizzle-orm");

      // Obter tenant do usuario
      const memberships = await db.getUserMemberships(ctx.user.id);
      if (!memberships.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Usuario nao pertence a nenhum tenant" });
      }

      const tenantId = memberships[0].membership.tenantId;
      const tenant = await dbInstance
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant nao encontrado" });
      }

      // Gerar dados dos últimos 12 meses
      const monthlyData = [];
      const now = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthlyStudies = await dbInstance
          .select({ count: count() })
          .from(generatedStudies)
          .where(
            and(
              eq(generatedStudies.tenantId, tenantId),
              sql`DATE(${generatedStudies.createdAt}) >= DATE(${monthStart}) AND DATE(${generatedStudies.createdAt}) <= DATE(${monthEnd})`
            )
          );

        const used = monthlyStudies[0]?.count || 0;
        const limit = tenant[0].limitsJson?.simultaneousStudies || ctx.user.monthlyStudyLimit || 10;

        monthlyData.push({
          month: `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
          used,
          limit,
          remaining: Math.max(0, limit - used),
          percentage: Math.round((used / limit) * 100),
        });
      }

      return {
        monthlyData,
        limit: tenant[0].limitsJson?.simultaneousStudies || ctx.user.monthlyStudyLimit || 10,
      };
    }),
});

