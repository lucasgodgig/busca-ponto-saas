import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { validateTenantAccess } from "../_core/tenantContext";
import { getDb } from "../db";
import { commercialPointRequests, commercialPoints, commercialPointPhotos } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const commercialPointsRouter = router({
  createRequest: protectedProcedure
    .input(z.object({
      tenantId: z.number(),
      segment: z.string().min(1),
      city: z.string().min(1),
      neighborhoods: z.string().optional(),
      socialClass: z.string().optional(),
      propertySize: z.number().int().optional(),
      maxRent: z.number().int().optional(),
      requirements: z.string().min(1),
      studyId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      const result = await db.createCommercialPointRequest({
        tenantId: input.tenantId,
        userId: ctx.user.id,
        segment: input.segment,
        city: input.city,
        neighborhoods: input.neighborhoods,
        socialClass: input.socialClass,
        propertySize: input.propertySize,
        maxRent: input.maxRent,
        requirements: input.requirements,
        studyId: input.studyId,
        status: "aberto",
      });

      return { success: true, requestId: (result as any).insertId };
    }),

  listRequests: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      const requests = await db.getTenantCommercialPointRequests(input.tenantId);
      return requests.map(req => ({
        ...req,
        neighborhoods: req.neighborhoods ? (typeof req.neighborhoods === 'string' ? req.neighborhoods.split(',').map(n => n.trim()) : req.neighborhoods) : [],
      }));
    }),

  getRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const request = await db.getCommercialPointRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      }

      await validateTenantAccess(ctx, request.tenantId);

      return {
        ...request,
        neighborhoods: request.neighborhoods ? (typeof request.neighborhoods === 'string' ? request.neighborhoods.split(',').map(n => n.trim()) : request.neighborhoods) : [],
      };
    }),

  /**
   * Criar ponto comercial + atualizar status da solicitação
   * TRANSACAO: Ambas operações em uma única transação
   */
  createPoint: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      tenantId: z.number(),
      address: z.string().min(1),
      lat: z.string(),
      lng: z.string(),
      propertyType: z.string().optional(),
      totalAreaM2: z.number().int().optional(),
      usableAreaM2: z.number().int().optional(),
      rentalPrice: z.number().int().optional(),
      salePrice: z.number().int().optional(),
      ownerName: z.string().optional(),
      ownerPhone: z.string().optional(),
      brokerName: z.string().optional(),
      brokerPhone: z.string().optional(),
      brokerEmail: z.string().email().optional(),
      description: z.string().optional(),
      amenitiesJson: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      const drizzleDb = await getDb();
      if (!drizzleDb) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database não disponível",
        });
      }

      let pointId: number = 0;

      try {
        // TRANSACAO: Criar ponto + atualizar status em uma única transação
        await drizzleDb.transaction(async (tx) => {
          // 1. Criar ponto comercial
          const result = await tx.insert(commercialPoints).values({
            requestId: input.requestId,
            tenantId: input.tenantId,
            address: input.address,
            lat: input.lat,
            lng: input.lng,
            propertyType: input.propertyType,
            totalAreaM2: input.totalAreaM2,
            usableAreaM2: input.usableAreaM2,
            rentalPrice: input.rentalPrice,
            salePrice: input.salePrice,
            ownerName: input.ownerName,
            ownerPhone: input.ownerPhone,
            brokerName: input.brokerName,
            brokerPhone: input.brokerPhone,
            brokerEmail: input.brokerEmail,
            description: input.description,
            amenitiesJson: input.amenitiesJson,
          });

          pointId = Number((result as any).insertId);

          // 2. Atualizar status da solicitação para "encontrado"
          const updateResult = await tx
            .update(commercialPointRequests)
            .set({ status: "encontrado", updatedAt: new Date() })
            .where(eq(commercialPointRequests.id, input.requestId));

          // Validar que solicitação foi atualizada
          if ((updateResult as any).rowsAffected === 0) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Solicitação não encontrada",
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[commercialPoints.createPoint] Erro ao criar ponto:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao criar ponto comercial. Tente novamente.",
        });
      }

      return { success: true, pointId };
    }),

  /**
   * Listar pontos com fotos
   * MELHORADO: Usar Promise.allSettled para não falhar tudo se uma foto falhar
   */
  getPoints: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const request = await db.getCommercialPointRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      }

      await validateTenantAccess(ctx, request.tenantId);

      const points = await db.getCommercialPointsByRequestId(input.requestId);
      
      // Buscar fotos para cada ponto usando Promise.allSettled
      // Se uma foto falhar, as outras continuam sendo processadas
      const photoResults = await Promise.allSettled(
        points.map(async (point) => {
          const photos = await db.getCommercialPointPhotos(point.id);
          return {
            ...point,
            photos,
          };
        })
      );

      // Filtrar resultados bem-sucedidos e logar erros
      const pointsWithPhotos = photoResults
        .map((result, index) => {
          if (result.status === "fulfilled") {
            return result.value;
          } else {
            console.error(`[commercialPoints.getPoints] Erro ao buscar fotos do ponto ${points[index].id}:`, result.reason);
            // Retornar ponto sem fotos em caso de erro
            return {
              ...points[index],
              photos: [],
            };
          }
        });

      return pointsWithPhotos;
    }),

  getPoint: protectedProcedure
    .input(z.object({ pointId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const point = await db.getCommercialPointById(input.pointId);
      if (!point) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Ponto comercial não encontrado" });
      }

      await validateTenantAccess(ctx, point.tenantId);

      const photos = await db.getCommercialPointPhotos(input.pointId);

      return {
        ...point,
        photos,
      };
    }),

  addPhoto: protectedProcedure
    .input(z.object({
      pointId: z.number(),
      tenantId: z.number(),
      url: z.string().url(),
      fileKey: z.string(),
      caption: z.string().optional(),
      order: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      const result = await db.addCommercialPointPhoto({
        pointId: input.pointId,
        url: input.url,
        fileKey: input.fileKey,
        caption: input.caption,
        order: input.order || 0,
      });

      return { success: true, photoId: (result as any).insertId };
    }),
});
