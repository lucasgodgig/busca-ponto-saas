import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const notificationsRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const notifications = await db.getUserNotifications(ctx.user.id);
      return notifications;
    }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const result = await db.markNotificationAsRead(input.notificationId);
      return { success: true };
    }),

  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const notifications = await db.getUserNotifications(ctx.user.id);
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      return { unreadCount };
    }),
});
