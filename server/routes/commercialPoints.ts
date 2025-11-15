import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { validateTenantAccess } from "../_core/tenantContext";

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

      const result = await db.createCommercialPoint({
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

      // Atualizar status da solicitação para "encontrado"
      await db.updateCommercialPointRequestStatus(input.requestId, "encontrado");

      // Buscar a solicitação para obter informações do usuário
      const request = await db.getCommercialPointRequestById(input.requestId);
      
      // Criar notificação para o usuário que fez a solicitação
      if (request) {
        await db.createNotification({
          userId: request.userId,
          title: "Ponto Comercial Encontrado!",
          content: `Um novo ponto comercial foi encontrado para sua solicitação de ${request.segment} em ${request.city}. Endereco: ${input.address}`,
          type: "other",
          relatedStudyRequestId: request.id,
        });
      }

      return { success: true, pointId: (result as any).insertId };
    }),

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
      
      // Buscar fotos para cada ponto
      const pointsWithPhotos = await Promise.all(
        points.map(async (point) => {
          const photos = await db.getCommercialPointPhotos(point.id);
          return {
            ...point,
            photos,
          };
        })
      );

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

