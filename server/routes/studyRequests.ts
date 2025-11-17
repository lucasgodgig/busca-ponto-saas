import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { studyRequests, studyUsage, notifications } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";

/**
 * Router para gerenciamento de solicitações de estudos
 * - Cliente: criar e visualizar suas solicitações
 * - Admin BP: listar todas, atualizar status, fazer upload de PDF
 */
export const studyRequestsRouter = router({
  /**
   * Cliente cria nova solicitação de estudo
   */
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        title: z.string().min(1, "Título é obrigatório"),
        segment: z.string().optional(),
        address: z.string().min(1, "Endereço é obrigatório"),
        lat: z.string().optional(),
        lng: z.string().optional(),
        radiusM: z.number().optional(),
        description: z.string().optional(),
        objectives: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      const result = await db.insert(studyRequests).values({
        tenantId: input.tenantId,
        createdBy: ctx.user.id,
        title: input.title,
        segment: input.segment,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        radiusM: input.radiusM,
        description: input.description,
        objectives: input.objectives,
        status: "pendente",
        priority: "media",
      });

      // Incrementar contador de uso mensal
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      const [existingUsage] = await db
        .select()
        .from(studyUsage)
        .where(
          and(
            eq(studyUsage.userId, ctx.user.id),
            eq(studyUsage.month, currentMonth),
            eq(studyUsage.year, currentYear)
          )
        )
        .limit(1);

      if (existingUsage) {
        await db
          .update(studyUsage)
          .set({ count: existingUsage.count + 1 })
          .where(eq(studyUsage.id, existingUsage.id));
      } else {
        await db.insert(studyUsage).values({
          userId: ctx.user.id,
          month: currentMonth,
          year: currentYear,
          count: 1,
        });
      }

      return {
        success: true,
        id: Number((result as any).insertId),
      };
    }),

  /**
   * Cliente lista suas próprias solicitações
   */
  myRequests: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      const requests = await db
        .select()
        .from(studyRequests)
        .where(
          and(
            eq(studyRequests.tenantId, input.tenantId),
            eq(studyRequests.createdBy, ctx.user.id)
          )
        )
        .orderBy(desc(studyRequests.createdAt));

      return requests;
    }),

  /**
   * Analyst lista todas as solicitações do seu tenant
   */
  listTenant: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        status: z.enum(["pendente", "em_analise", "concluido", "cancelado"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      // Verificar se usuário é analyst ou admin
      const { memberships } = await import("../../drizzle/schema");
      const membership = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, ctx.user.id),
            eq(memberships.tenantId, input.tenantId)
          )
        )
        .limit(1);

      // Permitir se for analyst ou tenant_admin do tenant
      if (
        !membership ||
        membership.length === 0 ||
        (membership[0].role !== "analyst" &&
          membership[0].role !== "tenant_admin")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para acessar estudos deste tenant",
        });
      }

      const { users, tenants } = await import("../../drizzle/schema");

      let query = db
        .select({
          request: studyRequests,
          creator: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          tenant: {
            id: tenants.id,
            name: tenants.name,
            slug: tenants.slug,
          },
        })
        .from(studyRequests)
        .leftJoin(users, eq(studyRequests.createdBy, users.id))
        .leftJoin(tenants, eq(studyRequests.tenantId, tenants.id))
        .where(eq(studyRequests.tenantId, input.tenantId))
        .$dynamic();

      if (input.status) {
        query = query.where(eq(studyRequests.status, input.status));
      }

      const results = await query.orderBy(desc(studyRequests.createdAt));

      return results;
    }),

  /**
   * Admin BP lista todas as solicitações
   */
  listAll: adminProcedure
    .input(
      z.object({
        status: z.enum(["pendente", "em_analise", "concluido", "cancelado"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      const { users, tenants } = await import("../../drizzle/schema");

      let query = db
        .select({
          request: studyRequests,
          creator: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          tenant: {
            id: tenants.id,
            name: tenants.name,
            slug: tenants.slug,
          },
        })
        .from(studyRequests)
        .leftJoin(users, eq(studyRequests.createdBy, users.id))
        .leftJoin(tenants, eq(studyRequests.tenantId, tenants.id))
        .$dynamic();

      if (input.status) {
        query = query.where(eq(studyRequests.status, input.status));
      }

      const results = await query.orderBy(desc(studyRequests.createdAt));

      return results;
    }),

  /**
   * Admin BP atualiza status e dados da solicitação
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pendente", "em_analise", "concluido", "cancelado"]).optional(),
        priority: z.enum(["baixa", "media", "alta"]).optional(),
        assignedTo: z.number().nullable().optional(),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      const updateData: any = {};

      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === "concluido") {
          updateData.completedAt = new Date();
        }
      }
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
      if (input.adminNotes !== undefined) updateData.adminNotes = input.adminNotes;

      await db
        .update(studyRequests)
        .set(updateData)
        .where(eq(studyRequests.id, input.id));

      return { success: true };
    }),

  /**
   * Admin BP faz upload do PDF final
   */
  uploadPdf: adminProcedure
    .input(
      z.object({
        requestId: z.number(),
        pdfBase64: z.string(),
        filename: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      // Converter base64 para buffer
      const pdfBuffer = Buffer.from(input.pdfBase64, "base64");

      // Gerar chave única para o arquivo
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `study-requests/${input.requestId}/${timestamp}-${randomSuffix}.pdf`;

      // Upload para S3
      const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      // Obter dados da solicitacao para notificacao
      const studyRequest = await db
        .select()
        .from(studyRequests)
        .where(eq(studyRequests.id, input.requestId))
        .limit(1);

      if (studyRequest.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitacao nao encontrada",
        });
      }

      const study = studyRequest[0];

      // Atualizar registro no banco
      await db
        .update(studyRequests)
        .set({
          pdfUrl: url,
          pdfFileKey: fileKey,
          status: "concluido",
          completedAt: new Date(),
        })
        .where(eq(studyRequests.id, input.requestId));

      // Criar notificacao para o usuario
      await db
        .insert(notifications)
        .values({
          userId: study.createdBy,
          title: `Estudo Pronto: ${study.title}`,
          content: `Seu estudo "${study.title}" esta pronto para download. Acesse a pagina "Meus Estudos" para visualizar.`,
          type: "study_ready",
          relatedStudyRequestId: input.requestId,
          isRead: false,
        });

      return {
        success: true,
        pdfUrl: url,
      };
    }),

  /**
   * Cliente obtém detalhes de uma solicitação específica
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      const request = await db
        .select()
        .from(studyRequests)
        .where(eq(studyRequests.id, input.id))
        .limit(1);

      if (!request || request.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      // Verificar se usuário tem acesso (criador ou admin)
      if (
        request[0].createdBy !== ctx.user.id &&
        ctx.user.role !== "admin_bp" &&
        ctx.user.role !== "analyst_bp"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para acessar esta solicitação",
        });
      }

      return request[0];
    }),
});



// Adicionar procedures de notificacoes
export const notificationsRouter = router({
  getNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database nao disponivel",
        });
      }

      const notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return notifs;
    }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database nao disponivel",
        });
      }

      await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),
});

