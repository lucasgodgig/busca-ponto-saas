import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { sql, eq, desc } from "drizzle-orm";
import { users } from "../../drizzle/schema";

export const registrationAnalyticsRouter = router({
  /**
   * Obter estatísticas de registros (apenas para admins)
   * Retorna contagem de usuários por método de registro
   */
  getStats: adminProcedure.query(async () => {
    const dbInstance = await db.getDb();
    if (!dbInstance) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
    }

    try {
      // Obter contagem por método de registro
      const stats = await dbInstance
        .select({
          method: users.loginMethod,
          count: sql<number>`COUNT(*) as count`,
          percentage: sql<string>`ROUND(COUNT(*) * 100 / (SELECT COUNT(*) FROM users), 2) as percentage`,
        })
        .from(users)
        .groupBy(users.loginMethod);

      // Obter total de usuários
      const totalResult = await dbInstance
        .select({
          total: sql<number>`COUNT(*) as total`,
        })
        .from(users);

      const total = totalResult[0]?.total || 0;

      return {
        total,
        byMethod: stats.map(s => ({
          method: s.method,
          count: s.count,
          percentage: parseFloat(s.percentage || "0"),
        })),
      };
    } catch (error) {
      console.error("[Registration Analytics] Error fetching stats:", error);
      throw new TRPCError({ 
        code: "INTERNAL_SERVER_ERROR", 
        message: "Erro ao buscar estatísticas de registro" 
      });
    }
  }),

  /**
   * Obter lista de usuários com método de registro (apenas para admins)
   */
  getUsersList: adminProcedure
    .input(z.object({
      method: z.enum(["form", "oauth", "admin"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
      }

      try {
        let query: any = dbInstance.select().from(users);

        if (input.method) {
          query = dbInstance.select().from(users).where(eq(users.loginMethod, input.method));
        }

        const results = await query
          .orderBy(desc(users.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return results.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          loginMethod: u.loginMethod,
          createdAt: u.createdAt,
          lastSignedIn: u.lastSignedIn,
        }));
      } catch (error) {
        console.error("[Registration Analytics] Error fetching users list:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Erro ao buscar lista de usuários" 
        });
      }
    }),

  /**
   * Obter conversão por período (últimos 7, 30, 90 dias)
   */
  getConversionTrend: adminProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
      }

      try {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - input.days);

        const trend = await dbInstance
          .select({
            date: sql<string>`DATE(${users.createdAt}) as date`,
            method: users.loginMethod,
            count: sql<number>`COUNT(*) as count`,
          })
          .from(users)
          .where(sql`${users.createdAt} >= ${daysAgo}`)
          .groupBy(sql`DATE(${users.createdAt})`, users.loginMethod);

        return trend;
      } catch (error) {
        console.error("[Registration Analytics] Error fetching conversion trend:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Erro ao buscar tendência de conversão" 
        });
      }
    }),
});
