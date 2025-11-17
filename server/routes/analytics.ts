import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, and, count, sql, gte, lte } from "drizzle-orm";
import { generatedStudies, tenants, users } from "../../drizzle/schema";

export const analyticsRouter = router({
  // Obter estatísticas de consumo por tenant
  getTenantConsumptionStats: adminProcedure.query(async ({ ctx }) => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
    }

    // Apenas admin_bp pode acessar
    if (ctx.user.role !== "admin_bp") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP pode acessar analytics" });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Obter todos os tenants com consumo do mês atual
    const stats = await dbInstance
      .select({
        tenantId: tenants.id,
        tenantName: tenants.name,
        plan: tenants.plan,
        studiesUsed: count(generatedStudies.id),
        studiesLimit: tenants.limitsJson,
      })
      .from(tenants)
      .leftJoin(
        generatedStudies,
        and(
          eq(generatedStudies.tenantId, tenants.id),
          sql`DATE(${generatedStudies.createdAt}) >= DATE(${monthStart}) AND DATE(${generatedStudies.createdAt}) <= DATE(${monthEnd})`
        )
      )
      .groupBy(tenants.id, tenants.name, tenants.plan, tenants.limitsJson);

    return stats.map(stat => ({
      tenantId: stat.tenantId,
      tenantName: stat.tenantName,
      plan: stat.plan,
      studiesUsed: stat.studiesUsed || 0,
      studiesLimit: stat.studiesLimit?.simultaneousStudies || 0,
      percentageUsed: stat.studiesLimit?.simultaneousStudies 
        ? Math.round(((stat.studiesUsed || 0) / stat.studiesLimit.simultaneousStudies) * 100)
        : 0,
    }));
  }),

  // Obter tendências de uso nos últimos 30 dias
  getTenantUsageTrends: adminProcedure
    .input(z.object({
      tenantId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
      }

      if (ctx.user.role !== "admin_bp") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP pode acessar analytics" });
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);

      let query = dbInstance
        .select({
          date: sql`DATE(${generatedStudies.createdAt})`,
          count: count(generatedStudies.id),
        })
        .from(generatedStudies)
        .where(gte(generatedStudies.createdAt, startDate));

      if (input.tenantId) {
        query = dbInstance
          .select({
            date: sql`DATE(${generatedStudies.createdAt})`,
            count: count(generatedStudies.id),
          })
          .from(generatedStudies)
          .where(and(gte(generatedStudies.createdAt, startDate), eq(generatedStudies.tenantId, input.tenantId)));
      }

      const trends = await query
        .groupBy(sql`DATE(${generatedStudies.createdAt})`)
        .orderBy(sql`DATE(${generatedStudies.createdAt})`);

      return trends.map(t => ({
        date: t.date,
        count: t.count || 0,
      }));
    }),

  // Obter previsão de receita baseado em upgrades
  getRevenueProjection: adminProcedure
    .input(z.object({
      months: z.number().default(3),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await getDb();
      if (!dbInstance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
      }

      if (ctx.user.role !== "admin_bp") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP pode acessar analytics" });
      }

      // Preços por plano (em reais)
      const planPrices: Record<string, number> = {
        free: 0,
        start: 99,
        growth: 299,
        enterprise: 999,
      };

      // Obter todos os tenants com seus planos
      const allTenants = await dbInstance.select().from(tenants);

      // Calcular receita atual
      const currentRevenue = allTenants.reduce((sum, tenant) => {
        return sum + (planPrices[tenant.plan] || 0);
      }, 0);

      // Simular crescimento (assumindo 5% de upgrade por mês)
      const projections = [];
      for (let i = 1; i <= input.months; i++) {
        const projectedRevenue = currentRevenue * Math.pow(1.05, i);
        projections.push({
          month: i,
          projectedRevenue: Math.round(projectedRevenue),
          estimatedUpgrades: Math.round(allTenants.length * 0.05 * i),
        });
      }

      return {
        currentRevenue,
        currentTenants: allTenants.length,
        projections,
      };
    }),

  // Obter resumo de KPIs
  getAnalyticsKPIs: adminProcedure.query(async ({ ctx }) => {
    const dbInstance = await getDb();
    if (!dbInstance) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
    }

    if (ctx.user.role !== "admin_bp") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP pode acessar analytics" });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Total de tenants
    const totalTenants = await dbInstance.select({ count: count() }).from(tenants);

    // Total de estudos este mês
    const monthlyStudies = await dbInstance
      .select({ count: count() })
      .from(generatedStudies)
      .where(
        and(
          sql`DATE(${generatedStudies.createdAt}) >= DATE(${monthStart})`,
          sql`DATE(${generatedStudies.createdAt}) <= DATE(${monthEnd})`
        )
      );

    // Total de usuários
    const totalUsers = await dbInstance.select({ count: count() }).from(users);

    // Tenants com limite próximo (80%+)
    const stats = await dbInstance
      .select({
        tenantId: tenants.id,
        studiesUsed: count(generatedStudies.id),
        studiesLimit: tenants.limitsJson,
      })
      .from(tenants)
      .leftJoin(
        generatedStudies,
        and(
          eq(generatedStudies.tenantId, tenants.id),
          sql`DATE(${generatedStudies.createdAt}) >= DATE(${monthStart}) AND DATE(${generatedStudies.createdAt}) <= DATE(${monthEnd})`
        )
      )
      .groupBy(tenants.id, tenants.limitsJson);

    const tenantsNearLimit = stats.filter(s => {
      const limit = s.studiesLimit?.simultaneousStudies || 0;
      const used = s.studiesUsed || 0;
      return limit > 0 && (used / limit) >= 0.8;
    }).length;

    return {
      totalTenants: totalTenants[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
      monthlyStudies: monthlyStudies[0]?.count || 0,
      tenantsNearLimit,
    };
  }),
});

