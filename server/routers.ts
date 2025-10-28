import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { validateTenantAccess, requireTenantAdmin } from "./_core/tenantContext";
import { TRPCError } from "@trpc/server";
import { querySpaceApiWithCache } from "./spaceService";
import { searchAddress, searchCompetitors } from "./googlePlacesService";
import { ENV } from "./_core/env";

export const appRouter = router({
  system: systemRouter,

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
        logoUrl: z.string().url().optional(),
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
          logoUrl: input.logoUrl,
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

        const updateData: any = {};
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
    // Normalizar dados da Space API
    normalize: protectedProcedure
      .input(z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        radius: z.number().int().positive().max(ENV.spaceMaxRadius),
      }))
      .query(async ({ input }) => {
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

        console.log('[space.normalize] Resultado:', { ok: result.ok, people: result.data?.people, income: result.data?.income });
        
        const raw = result.data || {};
        const people = pick(raw, ['people', 'population', 'habitantes', 'pop_total'], 0);
        const income = pick(raw, ['income', 'renda', 'avg_income', 'renda_per_capita'], 0);
        const consumer = pick(raw, ['consumer', 'cons_a_total', 'consumo_total'], 0);
        
        console.log('[space.normalize] Valores:', { people, income, consumer });

        const classes = [
          ["A1", "class_a1"],
          ["A2", "class_a2"],
          ["B1", "class_b1"],
          ["B2", "class_b2"],
          ["C", "class_c"],
          ["D", "class_d"],
          ["E", "class_e"],
        ].map(([sigla, key]: any) => ({ sigla, domicilios: pick(raw, [key], 0) }));
        const totalDom = classes.reduce((s, c) => s + c.domicilios, 0);
        classes.forEach(
          (c: any) =>
            (c["pct"] = totalDom > 0 ? (c.domicilios / totalDom) * 100 : 0)
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
          ["cons_9_tobacco", "Fumo", 9],
          ["cons_10_personal_services", "Serviços Pessoais", 10],
          ["cons_12_others", "Outros", 12],
          ["cons_13_asset_increase", "Aumento de Ativos", 13],
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
          segment: input.segment,
        });

        // Registrar consulta no banco
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { quickQueries } = await import("../drizzle/schema");
          
          await dbInstance.insert(quickQueries).values({
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
        await validateTenantAccess(ctx, input.tenantId);
        return await db.getTenantQuickQueries(input.tenantId, input.limit, input.offset);
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

        // Incrementar contador de estudos
        await db.incrementStudyUsage(tenantCtx.tenantId);

        // Audit log
        await db.createAuditLog({
          tenantId: tenantCtx.tenantId,
          actorId: ctx.user.id,
          action: "study_created",
          targetType: "study",
          targetId: newStudy.id,
        });

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

        return { success: true };
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
  }),
});

export type AppRouter = typeof appRouter;

