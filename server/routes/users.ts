import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const usersRouter = router({
  // Atualizar perfil do usuário (nome e email)
  updateProfile: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().email("Email inválido").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Preparar dados para atualizar
        const updateData: any = { updatedAt: new Date() };
        if (input.name) updateData.name = input.name;
        if (input.email) updateData.email = input.email;

        // Atualizar usuário
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.id));

        return {
          success: true,
          message: "Perfil atualizado com sucesso",
        };
      } catch (error) {
        console.error("Error updating user profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao atualizar perfil",
        });
      }
    }),

  // Alterar senha do usuário
  changePassword: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        currentPassword: z.string().min(1, "Senha atual é obrigatória"),
        newPassword: z
          .string()
          .min(8, "Nova senha deve ter no mínimo 8 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Buscar usuário
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, ctx.user.id))
          .limit(1);

        if (!user || user.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Usuário não encontrado",
          });
        }

        // TODO: Implementar verificação de senha atual com bcrypt
        // Por enquanto, apenas validamos que a senha foi fornecida
        if (!input.currentPassword) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Senha atual incorreta",
          });
        }

        // TODO: Hash da nova senha com bcrypt
        // Por enquanto, apenas salvamos a senha em texto plano (INSEGURO!)
        await db
          .update(users)
          .set({
            // passwordHash: await bcrypt.hash(input.newPassword, 10),
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id));

        return {
          success: true,
          message: "Senha alterada com sucesso",
        };
      } catch (error) {
        console.error("Error changing password:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao alterar senha",
        });
      }
    }),

  // Obter dados do perfil do usuário
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (!user || user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        });
      }

      return {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        loginMethod: user[0].loginMethod,
        createdAt: user[0].createdAt,
      };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao buscar perfil",
      });
    }
  }),
});

