import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { validateTenantAccess, requireTenantAdmin } from "./_core/tenantContext";
import { TRPCError } from "@trpc/server";
import { querySpaceApiWithCache } from "./services/spaceApiService";
import { searchAddress, searchCompetitors } from "./services/googlePlacesService";
import { ENV } from "./_core/env";

import { leadsRouter } from "./routes/leads";
import { studyRequestsRouter, notificationsRouter } from "./routes/studyRequests";
import { usersRouter } from "./routes/users";
import { usageRouter } from "./routes/usage";
import { analyticsRouter } from "./routes/analytics";
import { registrationAnalyticsRouter } from "./routes/registrationAnalytics";
import { commercialPointsRouter } from "./routes/commercialPoints";
import { sendEmail, generateLimitAlertEmail, generateLimitReachedEmail } from "./services/emailService";

export const appRouter = router({
  system: systemRouter,
  leads: leadsRouter,
  studyRequests: studyRequestsRouter,
  notifications: notificationsRouter,
  users: usersRouter,
  usage: usageRouter,
  analytics: analyticsRouter,
  registrationAnalytics: registrationAnalyticsRouter,
  commercialPoints: commercialPointsRouter,

  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      
      // Buscar memberships do usuário
      const memberships = await db.getUserMemberships(ctx.user.id);
      
      return {
        ...ctx.user,
        memberships: memberships.map(m => ({
          id: m.membership.id,
          role: m.membership.role,
          tenant: m.tenant,
        })),
      };
    }),
    validateInviteCode: publicProcedure
      .input(z.object({ code: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
        }

        const { inviteCodes } = await import("../drizzle/schema");
        const { eq, and, or, isNull, gt } = await import("drizzle-orm");
        
        const code = await dbInstance
          .select()
          .from(inviteCodes)
          .where(
            and(
              eq(inviteCodes.code, input.code),
              eq(inviteCodes.isActive, true),
              or(
                isNull(inviteCodes.expiresAt),
                gt(inviteCodes.expiresAt, new Date())
              )
            )
          )
          .limit(1);

        return { valid: code.length > 0 };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  tenants: router({
    // Listar todos os tenants (apenas Admin BP)
    list: adminProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) return [];
      
      const { tenants } = await import("../drizzle/schema");
      return await dbInstance.select().from(tenants);
    }),

    // Obter detalhes de um tenant específico
    get: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        const tenantCtx = await validateTenantAccess(ctx, input.tenantId);
        const tenant = await db.getTenantById(tenantCtx.tenantId);
        
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant não encontrado" });
        }

        return tenant;
      }),

    // Criar novo tenant (onboarding)
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(3),
        slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
        segment: z.string().optional(),
        colorPrimary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { tenants, memberships } = await import("../drizzle/schema");

        // Criar tenant
        const [newTenant] = await dbInstance.insert(tenants).values({
          name: input.name,
          slug: input.slug,
          segment: input.segment,
          logoUrl: null,
          colorPrimary: input.colorPrimary || "#0F172A",
          colorDark: "#020617",
          plan: "start",
          limitsJson: {
            quickQueriesPerMonth: 300,
            simultaneousStudies: 3,
            maxAttachmentSizeMB: 5,
          },
        }).$returningId();

        // Criar membership como tenant_admin
        await dbInstance.insert(memberships).values({
          userId: ctx.user.id,
          tenantId: newTenant.id,
          role: "tenant_admin",
        });

        // Criar audit log
        await db.createAuditLog({
          tenantId: newTenant.id,
          actorId: ctx.user.id,
          action: "tenant_created",
          targetType: "tenant",
          targetId: newTenant.id,
        });

        return { tenantId: newTenant.id };
      }),

    // Atualizar tenant (apenas admin do tenant)
    update: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        name: z.string().min(3).optional(),
        logoUrl: z.string().url().optional(),
        colorPrimary: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        colorDark: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantCtx = await validateTenantAccess(ctx, input.tenantId);
        requireTenantAdmin(tenantCtx);

        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { tenants } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const updateData: Partial<typeof tenants.$inferInsert> = {};
        if (input.name) updateData.name = input.name;
        if (input.logoUrl) updateData.logoUrl = input.logoUrl;
        if (input.colorPrimary) updateData.colorPrimary = input.colorPrimary;
        if (input.colorDark) updateData.colorDark = input.colorDark;

        await dbInstance
          .update(tenants)
          .set(updateData)
          .where(eq(tenants.id, input.tenantId));

        await db.createAuditLog({
          tenantId: input.tenantId,
          actorId: ctx.user.id,
          action: "tenant_updated",
          targetType: "tenant",
          targetId: input.tenantId,
          metaJson: updateData,
        });

        return { success: true };
      }),

    // Obter membros do tenant
    members: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        await validateTenantAccess(ctx, input.tenantId);
        return await db.getTenantMembers(input.tenantId);
      }),

    // Obter uso do plano
    usage: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        const tenantCtx = await validateTenantAccess(ctx, input.tenantId);
        const tenant = await db.getTenantById(tenantCtx.tenantId);
        const usage = await db.getCurrentPlanUsage(tenantCtx.tenantId);

        return {
          tenant,
          usage,
        };
      }),
  }),

  // Google Places
  places: router({
    // Buscar endereço
    searchAddress: publicProcedure
      .input(z.object({ query: z.string().min(3) }))
      .query(async ({ input }) => {
        return await searchAddress(input.query);
      }),

    // Buscar concorrentes
    searchCompetitors: protectedProcedure
      .input(
        z.object({
          lat: z.number(),
          lng: z.number(),
          radius: z.number().int().positive(),
          types: z.array(z.string().min(1)).default([]),
          cursor: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        if (!input.types.length) {
          return { results: [], nextPageToken: undefined };
        }

        return await searchCompetitors({
          lat: input.lat,
          lng: input.lng,
          radius: input.radius,
          types: input.types,
          pageToken: input.cursor,
        });
      }),
  }),

  // Space API e Quick Queries
  space: router({
    //    space: router({
      normalize: publicProcedure
        .input(z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          radius: z.number().int().positive().max(ENV.spaceMaxRadius),
        }))
        .mutation(async ({ input }) => {
        const num = (v: any, d = 0) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : d;
        };

        // Função auxiliar para pegar valor com fallbacks de nomes
        const pick = (obj: any, names: string[], d = 0) => {
          for (const k of names) {
            if (obj && obj[k] != null && Number.isFinite(+obj[k])) {
              return +obj[k];
            }
          }
          return d;
        };

        const result = await querySpaceApiWithCache({
          lat: input.lat,
          lng: input.lng,
          radius: input.radius,
        });

        if (!result.ok || !result.data) {
          throw new Error('Falha ao buscar dados da Space API');
        }

        // querySpaceApiWithCache já retorna dados normalizados
        const raw = result.data;
        console.log('[space.normalize] Raw data recebido:', { keys: Object.keys(raw).slice(0, 20), people: raw.people, income: raw.income, consumer: raw.consumer });
        
        const people = num(raw.people, 0);
        const income = num(raw.income, 0);
        const consumer = num(raw.consumer, 0);
        
        console.log('[space.normalize] Valores normalizados:', { people, income, consumer });

        const classes = [
          ["A1", "class_a1"],
          ["A2", "class_a2"],
          ["B1", "class_b1"],
          ["B2", "class_b2"],
          ["C", "class_c"],
          ["D", "class_d"],
          ["E", "class_e"],
        ].map(([sigla, key]: any) => ({ sigla, domicilios: pick(raw, [key], 0), pct: 0 }));
        const totalDom = classes.reduce((s, c) => s + c.domicilios, 0);
        classes.forEach(
          (c: any) =>
            (c.pct = totalDom > 0 ? (c.domicilios / totalDom) * 100 : 0)
        );

        const categorias = [
          ["cons_1_food", "Alimentação", 1],
          ["cons_2_housing", "Habitação", 2],
          ["cons_3_clothing", "Vestuário", 3],
          ["cons_4_transport", "Transporte", 4],
          ["cons_5_hygiene_care", "Higiene & Cuidados", 5],
          ["cons_6_health", "Saúde", 6],
          ["cons_7_education", "Educação", 7],
          ["cons_8_recreation", "Lazer", 8],
          ["cons_10_personal_services", "Serviços Pessoais", 10],
          ["cons_14_liability_reduction", "Redução de Passivos", 14],
        ].map(([k, rotulo, ord]: any) => ({
          chave: String(k),
          rotulo,
          ordem: ord,
          valor: pick(raw, [k], 0),
        }));

        const ages = Object.entries(raw || {})
          .filter(([k]) => k.startsWith("age_"))
          .map(([k, v]) => ({
            chave: k,
            rotulo: k.replace("age_", "").toUpperCase(),
            valor: num(v, 0),
          }));

        return {
          ok: true,
          data: {
            head: { people, income, consumer },
            totals: {
              consumo_total: pick(raw, ['cons_a_total', 'consumo_total'], 0),
              consumo_corrente: pick(raw, ['cons_b_current', 'consumo_corrente'], 0),
              despesas: pick(raw, ['cons_c_expenditure', 'despesas'], 0),
            },
            categorias,
            classes,
            faixas: ages,
          },
        };
      }),

    // Consultar Space API
    query: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radius: z.number().int().positive().max(ENV.spaceMaxRadius),
        segment: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantCtx = await validateTenantAccess(ctx, input.tenantId);
        const tenant = await db.getTenantById(tenantCtx.tenantId);
        
        if (!tenant) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Tenant não encontrado" });
        }

        // Verificar limites do plano
        const usage = await db.getCurrentPlanUsage(tenantCtx.tenantId);
        if (usage && usage.quickQueriesUsed >= tenant.limitsJson.quickQueriesPerMonth) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Limite de consultas mensais atingido (${tenant.limitsJson.quickQueriesPerMonth})`,
          });
        }

        // Fazer consulta à Space API
        const result = await querySpaceApiWithCache({
          lat: input.lat,
          lng: input.lng,
          radius: input.radius,
        });

        // Registrar consulta no banco
        try {
          await db.createQuickQuery({
            tenantId: tenantCtx.tenantId,
            userId: ctx.user.id,
            lat: String(input.lat),
            lng: String(input.lng),
            radiusM: input.radius,
            layersEnabledJson: {
              demografia: true,
              renda: true,
              fluxo: true,
              concorrencia: true,
            },
            resultSummaryJson: result.data,
            costUnits: 1,
          });

          // Incrementar uso
          await db.incrementQuickQueryUsage(tenantCtx.tenantId);

          // Audit log
          await db.createAuditLog({
            tenantId: tenantCtx.tenantId,
            actorId: ctx.user.id,
            action: "quick_query_executed",
            targetType: "quick_query",
            metaJson: {
              lat: input.lat,
              lng: input.lng,
              radius: input.radius,
            },
          });
        } catch (error) {
          console.error("[Router] Error saving quick query:", error);
        }

        return result;
      }),

    // Listar histórico de consultas
    history: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuario nao autenticado" });
        }
        await validateTenantAccess(ctx, input.tenantId);
        const history = await db.getTenantQuickQueries(input.tenantId, input.limit, input.offset);
        return history || [];
      }),
  }),

  // Estudos
  studies: router({
    // Listar estudos do tenant
    list: protectedProcedure
      .input(z.object({ tenantId: z.number() }))
      .query(async ({ ctx, input }) => {
        await validateTenantAccess(ctx, input.tenantId);
        return await db.getTenantStudies(input.tenantId);
      }),

    // Obter detalhes de um estudo
    get: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        studyId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        await validateTenantAccess(ctx, input.tenantId);
        const study = await db.getStudyById(input.studyId);

        if (!study || study.tenantId !== input.tenantId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Estudo não encontrado" });
        }

        return study;
      }),

    // Criar novo estudo
    create: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        title: z.string().min(3),
        segment: z.string().min(2),
        address: z.string().min(5),
        lat: z.number(),
        lng: z.number(),
        radiusM: z.number().int().positive(),
        objectives: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantCtx = await validateTenantAccess(ctx, input.tenantId);
        
        // Verificar limite de estudos do usuário
        const { checkStudyLimit, incrementStudyUsage } = await import("./db/admin");
        const limitCheck = await checkStudyLimit(ctx.user.id);
        
        if (!limitCheck.allowed) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: `Limite de estudos atingido. Você já solicitou ${limitCheck.current} de ${limitCheck.limit} estudos este mês.` 
          });
        }
        
        const dbInstance = await db.getDb();
        
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { studies } = await import("../drizzle/schema");

        const [newStudy] = await dbInstance.insert(studies).values({
          tenantId: tenantCtx.tenantId,
          title: input.title,
          segment: input.segment,
          address: input.address,
          lat: String(input.lat),
          lng: String(input.lng),
          radiusM: input.radiusM,
          objectives: input.objectives,
          status: "aberto",
          priority: "media",
          createdBy: ctx.user.id,
        }).$returningId();

        // Incrementar contador de estudos do usuário
        await incrementStudyUsage(ctx.user.id);
        
        // Incrementar contador de estudos do tenant
        await db.incrementStudyUsage(tenantCtx.tenantId);

        // Audit log
        await db.createAuditLog({
          tenantId: tenantCtx.tenantId,
          actorId: ctx.user.id,
          action: "study_created",
          targetType: "study",
          targetId: newStudy.id,
        });

        // Notificar admins sobre novo estudo criado
        try {
          const { getNotificationManager } = await import("./_core/websocket");
          const notificationManager = getNotificationManager();
          if (notificationManager) {
            notificationManager.notifyAdmins({
              type: "study_created",
              data: {
                studyId: newStudy.id,
                title: input.title,
                segment: input.segment,
                address: input.address,
                tenantId: tenantCtx.tenantId,
                createdBy: ctx.user.name || "Usuário",
              },
              timestamp: new Date(),
            });
            console.log(`[Notification] Novo estudo criado: ${newStudy.id}`);
          }
        } catch (error) {
          console.error("[Notification] Erro ao notificar admins:", error);
        }

        return { studyId: newStudy.id };
      }),

    // Atualizar estudo
    update: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        studyId: z.number(),
        status: z.enum(["aberto", "em_analise", "devolvido", "concluido"]).optional(),
        priority: z.enum(["baixa", "media", "alta"]).optional(),
        assignedBpUserId: z.number().optional(),
        dueAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await validateTenantAccess(ctx, input.tenantId);
        const dbInstance = await db.getDb();
        
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { studies } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const updateData: any = {};
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.assignedBpUserId !== undefined) updateData.assignedBpUserId = input.assignedBpUserId;
        if (input.dueAt) updateData.dueAt = input.dueAt;

        // Buscar estudo atual para notificacao
        const currentStudy = await dbInstance
          .select()
          .from(studies)
          .where(eq(studies.id, input.studyId))
          .limit(1);

        await dbInstance
          .update(studies)
          .set(updateData)
          .where(eq(studies.id, input.studyId));

        await db.createAuditLog({
          tenantId: input.tenantId,
          actorId: ctx.user.id,
          action: "study_updated",
          targetType: "study",
          targetId: input.studyId,
          metaJson: updateData,
        });

        // Notificar sobre mudanca de status
        if (input.status && currentStudy.length > 0) {
          try {
            const { getNotificationManager } = await import("./_core/websocket");
            const notificationManager = getNotificationManager();
            if (notificationManager) {
              notificationManager.notifyAdmins({
                type: "study_status_changed",
                data: {
                  studyId: input.studyId,
                  title: currentStudy[0].title,
                  oldStatus: currentStudy[0].status,
                  newStatus: input.status,
                  tenantId: input.tenantId,
                  changedBy: ctx.user.name || "Usuario",
                },
                timestamp: new Date(),
              });
              console.log(`[Notification] Status do estudo ${input.studyId} alterado para ${input.status}`);
            }
          } catch (error) {
            console.error("[Notification] Erro ao notificar mudanca de status:", error);
          }
        }

        return { success: true };
      }),

    // Comentários
    comments: router({
      list: protectedProcedure
        .input(z.object({ studyId: z.number() }))
        .query(async ({ ctx, input }) => {
          const dbInstance = await db.getDb();
          if (!dbInstance) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
          }

          const { studyComments, users } = await import("../drizzle/schema");
          const { eq, desc } = await import("drizzle-orm");

          const comments = await dbInstance
            .select({
              comment: studyComments,
              author: users,
            })
            .from(studyComments)
            .leftJoin(users, eq(studyComments.authorId, users.id))
            .where(eq(studyComments.studyId, input.studyId))
            .orderBy(desc(studyComments.createdAt));

          return comments.map((row) => ({
            ...row.comment,
            author: row.author,
          }));
        }),

      create: protectedProcedure
        .input(z.object({
          studyId: z.number(),
          body: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
          const dbInstance = await db.getDb();
          if (!dbInstance) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
          }

          const { studyComments } = await import("../drizzle/schema");

          const result = await dbInstance
            .insert(studyComments)
            .values({
              studyId: input.studyId,
              authorId: ctx.user.id,
              body: input.body,
            });

          return { success: true, id: 0 };
        }),
    }),
  }),

  // Generated Studies
  generatedStudies: router({
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        segment: z.string().min(1),
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radiusM: z.number().int().positive(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
        }

        const memberships = await db.getUserMemberships(ctx.user.id);
        if (!memberships.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Usuario nao pertence a nenhum tenant" });
        }

        const tenantId = memberships[0].membership.tenantId;

        const { generatedStudies } = await import("../drizzle/schema");
        const result = await dbInstance
          .insert(generatedStudies)
          .values({
            tenantId,
            createdBy: ctx.user.id,
            title: input.title,
            segment: input.segment,
            lat: input.lat.toString(),
            lng: input.lng.toString(),
            radiusM: input.radiusM,
            notes: input.notes,
            status: "queued",
          });

        const studyId = (result as any).insertId;

        await db.createAuditLog({
          tenantId,
          actorId: ctx.user.id,
          action: "generated_study_created",
          targetType: "generated_study",
          targetId: studyId,
          metaJson: input,
        });

        return { studyId };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
        }

        const memberships = await db.getUserMemberships(ctx.user.id);
        if (!memberships.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Usuario nao pertence a nenhum tenant" });
        }

        const tenantId = memberships[0].membership.tenantId;

        const { generatedStudies } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const studies = await dbInstance
          .select()
          .from(generatedStudies)
          .where(eq(generatedStudies.tenantId, tenantId))
          .orderBy((t: any) => t.createdAt);

        return studies.map((s: any) => ({
          ...s,
          lat: parseFloat(s.lat),
          lng: parseFloat(s.lng),
        }));
      }),

    get: protectedProcedure
      .input(z.object({ studyId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database nao disponivel" });
        }

        const memberships = await db.getUserMemberships(ctx.user.id);
        if (!memberships.length) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Usuario nao pertence a nenhum tenant" });
        }

        const tenantId = memberships[0].membership.tenantId;

        const { generatedStudies } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        const studies = await dbInstance
          .select()
          .from(generatedStudies)
          .where(
            and(
              eq(generatedStudies.id, input.studyId),
              eq(generatedStudies.tenantId, tenantId)
            )
          )
          .limit(1);

        if (!studies.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Estudo nao encontrado" });
        }

        const study = studies[0];
        return {
          ...study,
          lat: parseFloat(study.lat),
          lng: parseFloat(study.lng),
        };
      }),
  }),

  // Admin BP routes
  admin: router({
    // Users management
    users: router({
      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          email: z.string().email().optional(),
          role: z.enum(["user", "admin"]).optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          const dbInstance = await db.getDb();
          if (!dbInstance) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
          }

          const { users: usersTable } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");

          const updateData: any = {};
          if (input.name !== undefined) updateData.name = input.name;
          if (input.email !== undefined) updateData.email = input.email;
          if (input.role !== undefined) updateData.role = input.role;
          if (input.isActive !== undefined) updateData.isActive = input.isActive;

          if (Object.keys(updateData).length === 0) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum campo para atualizar" });
          }

          await dbInstance
            .update(usersTable)
            .set(updateData)
            .where(eq(usersTable.id, input.id));

          return { success: true };
        }),
    }),

    // Atualizar limites de um tenant
    updateTenantLimits: adminProcedure
      .input(z.object({
        tenantId: z.number(),
        plan: z.enum(["start", "essencial", "pro"]).optional(),
        limitsJson: z.object({
          quickQueriesPerMonth: z.number(),
          simultaneousStudies: z.number(),
          maxAttachmentSizeMB: z.number(),
        }).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { tenants } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const updateData: any = {};
        if (input.plan) updateData.plan = input.plan;
        if (input.limitsJson) updateData.limitsJson = input.limitsJson;

        await dbInstance
          .update(tenants)
          .set(updateData)
          .where(eq(tenants.id, input.tenantId));

        await db.createAuditLog({
          tenantId: input.tenantId,
          actorId: ctx.user.id,
          action: "tenant_limits_updated",
          targetType: "tenant",
          targetId: input.tenantId,
          metaJson: updateData,
        });

        return { success: true };
      }),

    // Dashboard do Admin BP - Listar todos os estudos
    getAllStudies: adminProcedure
      .query(async ({ ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { studies, tenants } = await import("../drizzle/schema");
        const { desc } = await import("drizzle-orm");

        const allStudies = await dbInstance
          .select({
            study: studies,
            tenant: tenants,
          })
          .from(studies)
          .leftJoin(tenants, (eb: any) => eb.eq(studies.tenantId, tenants.id))
          .orderBy(desc(studies.createdAt));

        return allStudies.map((row: any) => ({
          ...row.study,
          tenant: row.tenant,
        }));
      }),

    // Dashboard do Admin BP - Métricas agregadas
    getMetrics: adminProcedure
      .query(async ({ ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database não disponível" });
        }

        const { studies, tenants } = await import("../drizzle/schema");
        const { count, eq, sql } = await import("drizzle-orm");

        // Total de estudos
        const totalStudies = await dbInstance
          .select({ count: count() })
          .from(studies);

        // Estudos por status
        const byStatus = await dbInstance
          .select({
            status: studies.status,
            count: count(),
          })
          .from(studies)
          .groupBy(studies.status);

        // Estudos por tenant
        const byTenant = await dbInstance
          .select({
            tenantId: studies.tenantId,
            tenantName: tenants.name,
            count: count(),
          })
          .from(studies)
          .leftJoin(tenants, (eb: any) => eb.eq(studies.tenantId, tenants.id))
          .groupBy(studies.tenantId, tenants.name);

        return {
          total: totalStudies[0]?.count || 0,
          byStatus: byStatus.map((s: any) => ({
            status: s.status,
            count: s.count,
          })),
          byTenant: byTenant.map((t: any) => ({
            tenantId: t.tenantId,
            tenantName: t.tenantName,
            count: t.count,
          })),
        };
      }),
  }),

  // Saved Locations (Pontos e Polígonos salvos)
  locations: router({
    create: protectedProcedure
      .input(z.object({
        type: z.enum(["point", "polygon"]),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.enum(["concorrente", "oportunidade", "cliente", "fornecedor", "outro"]).default("outro"),
        coordinatesJson: z.object({
          lat: z.number().optional(),
          lng: z.number().optional(),
          vertices: z.array(z.object({
            lat: z.number(),
            lng: z.number(),
          })).optional(),
        }),
        metadataJson: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createSavedLocation } = await import("./db/savedLocations");
        const result = await createSavedLocation({
          userId: ctx.user.id,
          type: input.type,
          name: input.name,
          description: input.description,
          category: input.category,
          coordinatesJson: input.coordinatesJson,
          metadataJson: input.metadataJson,
        });
        return result;
      }),

    list: protectedProcedure
      .input(z.object({
        category: z.enum(["concorrente", "oportunidade", "cliente", "fornecedor", "outro"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const { listSavedLocations } = await import("./db/savedLocations");
        return await listSavedLocations(ctx.user.id, input?.category);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const { getSavedLocation } = await import("./db/savedLocations");
        const location = await getSavedLocation(input.id, ctx.user.id);
        if (!location) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Localização não encontrada" });
        }
        return location;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        category: z.enum(["concorrente", "oportunidade", "cliente", "fornecedor", "outro"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { updateSavedLocation } = await import("./db/savedLocations");
        return await updateSavedLocation(input.id, ctx.user.id, {
          name: input.name,
          description: input.description,
          category: input.category,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { deleteSavedLocation } = await import("./db/savedLocations");
        return await deleteSavedLocation(input.id, ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;

