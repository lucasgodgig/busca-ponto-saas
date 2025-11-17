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

  // Procedures para admin gerenciar pontos comerciais
  getRequestsForAdmin: protectedProcedure
    .input(z.object({ tenantId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user || (ctx.user.role !== 'admin_bp' && ctx.user.role !== 'analyst_bp')) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP ou analyst BP pode acessar" });
      }

      // Se o usuário é admin_bp, retornar TODAS as solicitações
      // Caso contrário, filtrar por tenantId
      let tenantId = input.tenantId;
      if (!tenantId && ctx.user.role !== 'admin_bp') {
        const memberships = await db.getUserMemberships(ctx.user.id);
        if (memberships.length > 0) {
          tenantId = memberships[0].membership.tenantId;
        }
      }

      const requests = await db.getCommercialPointRequestsForAdmin(tenantId);
      return requests.map(req => ({
        ...req,
        neighborhoods: req.neighborhoods ? (typeof req.neighborhoods === 'string' ? req.neighborhoods.split(',').map(n => n.trim()) : req.neighborhoods) : [],
      }));
    }),

  updatePointData: protectedProcedure
    .input(z.object({
      pointId: z.number(),
      tenantId: z.number(),
      address: z.string().optional(),
      lat: z.string().optional(),
      lng: z.string().optional(),
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
      adminNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== 'admin_bp') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP pode atualizar" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      const { pointId, tenantId, ...updateData } = input;
      await db.updateCommercialPointData(pointId, updateData);

      return { success: true };
    }),

  sendToValidation: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      tenantId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== 'admin_bp') {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admin BP pode enviar para validacao" });
      }

      const request = await db.getCommercialPointRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitacao nao encontrada" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      // Atualizar status para "validacao"
      await db.updateCommercialPointRequestStatus(input.requestId, "validacao");

      // Enviar notificacao ao usuario
      const { notifyOwner } = await import("../_core/notification");
      await notifyOwner({
        title: "Ponto Comercial Pronto para Validacao",
        content: `Um novo ponto comercial foi preparado para sua validacao. Segmento: ${request.segment}, Cidade: ${request.city}`,
      });

      return { success: true };
    }),

  getValidationRequests: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      const requests = await db.getCommercialPointsInValidation(ctx.user.id, input.tenantId);
      
      // Buscar pontos para cada solicitacao
      const requestsWithPoints = await Promise.all(
        requests.map(async (req) => {
          const points = await db.getCommercialPointsByRequestId(req.id);
          const pointsWithPhotos = await Promise.all(
            points.map(async (point) => {
              const photos = await db.getCommercialPointPhotos(point.id);
              return { ...point, photos };
            })
          );
          return {
            ...req,
            neighborhoods: req.neighborhoods ? (typeof req.neighborhoods === 'string' ? req.neighborhoods.split(',').map(n => n.trim()) : req.neighborhoods) : [],
            points: pointsWithPhotos,
          };
        })
      );

      return requestsWithPoints;
    }),

  approvePoint: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      tenantId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const request = await db.getCommercialPointRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitacao nao encontrada" });
      }

      if (request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao pode aprovar esta solicitacao" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      // Atualizar status para "encontrado"
      await db.updateCommercialPointRequestStatus(input.requestId, "encontrado");

      return { success: true };
    }),

  rejectPoint: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      tenantId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const request = await db.getCommercialPointRequestById(input.requestId);
      if (!request) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitacao nao encontrada" });
      }

      if (request.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Voce nao pode rejeitar esta solicitacao" });
      }

      await validateTenantAccess(ctx, input.tenantId);

      // Atualizar status para "em_busca" (volta para busca)
      await db.updateCommercialPointRequestStatus(input.requestId, "em_busca");

      // Salvar comentario em adminNotes do ponto
      const points = await db.getCommercialPointsByRequestId(input.requestId);
      if (points.length > 0) {
        const point = points[0];
        const adminNotes = `[Rejeitado pelo usuario] ${input.comment || 'Sem comentarios'}`;
        await db.updateCommercialPointData(point.id, { adminNotes });
      }

      return { success: true };
    }),
});
