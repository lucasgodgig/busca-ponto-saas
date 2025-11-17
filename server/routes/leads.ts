import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { leads } from "../../drizzle/schema";
import { getDb } from "../db";

export const leadsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("E-mail inválido"),
        telefone: z.string().optional(),
        empresa: z.string().optional(),
        cargo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database não disponível");
      }

      const [lead] = await db.insert(leads).values({
        nome: input.nome,
        email: input.email,
        telefone: input.telefone || null,
        empresa: input.empresa || null,
        cargo: input.cargo || null,
      });

      return { success: true, leadId: lead.insertId };
    }),
});

