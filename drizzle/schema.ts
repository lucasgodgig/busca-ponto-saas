import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin_bp", "tenant_admin", "member", "analyst_bp"]).default("member").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Tenant (Franqueadora) - cada franqueadora é um tenant isolado
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  colorPrimary: varchar("colorPrimary", { length: 7 }).default("#0F172A"),
  colorDark: varchar("colorDark", { length: 7 }).default("#020617"),
  plan: mysqlEnum("plan", ["start", "essencial", "pro"]).default("start").notNull(),
  limitsJson: json("limitsJson").$type<{
    quickQueriesPerMonth: number;
    simultaneousStudies: number;
    maxAttachmentSizeMB: number;
  }>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Membership - relacionamento entre usuários e tenants com role específico
 */
export const memberships = mysqlTable("memberships", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tenantId: int("tenantId").notNull(),
  role: mysqlEnum("role", ["tenant_admin", "member"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Study - estudos de mercado solicitados pelas franqueadoras
 */
export const studies = mysqlTable("studies", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  segment: varchar("segment", { length: 255 }).notNull(),
  address: text("address").notNull(),
  lat: varchar("lat", { length: 50 }).notNull(),
  lng: varchar("lng", { length: 50 }).notNull(),
  radiusM: int("radiusM").notNull(),
  objectives: text("objectives"),
  status: mysqlEnum("status", ["aberto", "em_analise", "devolvido", "concluido"]).default("aberto").notNull(),
  priority: mysqlEnum("priority", ["baixa", "media", "alta"]).default("media").notNull(),
  dueAt: timestamp("dueAt"),
  createdBy: int("createdBy").notNull(),
  assignedBpUserId: int("assignedBpUserId"),
  finalReportJson: json("finalReportJson").$type<{
    items: Array<{
      title: string;
      content: string;
    }>;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * StudyComment - comentários em estudos com suporte a menções
 */
export const studyComments = mysqlTable("studyComments", {
  id: int("id").autoincrement().primaryKey(),
  studyId: int("studyId").notNull(),
  authorId: int("authorId").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * StudyFile - arquivos anexados aos estudos
 */
export const studyFiles = mysqlTable("studyFiles", {
  id: int("id").autoincrement().primaryKey(),
  studyId: int("studyId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * QuickQuery - histórico de consultas rápidas na API Space
 */
export const quickQueries = mysqlTable("quickQueries", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  lat: varchar("lat", { length: 50 }).notNull(),
  lng: varchar("lng", { length: 50 }).notNull(),
  radiusM: int("radiusM").notNull(),
  layersEnabledJson: json("layersEnabledJson").$type<{
    demografia: boolean;
    renda: boolean;
    fluxo: boolean;
    concorrencia: boolean;
  }>().notNull(),
  resultSummaryJson: json("resultSummaryJson").$type<Record<string, any>>(),
  costUnits: int("costUnits").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * PlanUsage - controle de uso mensal por tenant
 */
export const planUsage = mysqlTable("planUsage", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  quickQueriesUsed: int("quickQueriesUsed").default(0).notNull(),
  studiesOpened: int("studiesOpened").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * AuditLog - auditoria de ações críticas
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  actorId: int("actorId"),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("targetType", { length: 100 }),
  targetId: int("targetId"),
  metaJson: json("metaJson").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * BillingCustomer - integração com Stripe
 */
export const billingCustomers = mysqlTable("billingCustomers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull().unique(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  createdStudies: many(studies, { relationName: "createdBy" }),
  assignedStudies: many(studies, { relationName: "assignedTo" }),
  comments: many(studyComments),
  quickQueries: many(quickQueries),
}));

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  memberships: many(memberships),
  studies: many(studies),
  quickQueries: many(quickQueries),
  planUsage: many(planUsage),
  auditLogs: many(auditLogs),
  billingCustomer: one(billingCustomers, {
    fields: [tenants.id],
    references: [billingCustomers.tenantId],
  }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [memberships.tenantId],
    references: [tenants.id],
  }),
}));

export const studiesRelations = relations(studies, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [studies.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [studies.createdBy],
    references: [users.id],
    relationName: "createdBy",
  }),
  assignedBpUser: one(users, {
    fields: [studies.assignedBpUserId],
    references: [users.id],
    relationName: "assignedTo",
  }),
  comments: many(studyComments),
  files: many(studyFiles),
}));

export const studyCommentsRelations = relations(studyComments, ({ one }) => ({
  study: one(studies, {
    fields: [studyComments.studyId],
    references: [studies.id],
  }),
  author: one(users, {
    fields: [studyComments.authorId],
    references: [users.id],
  }),
}));

export const studyFilesRelations = relations(studyFiles, ({ one }) => ({
  study: one(studies, {
    fields: [studyFiles.studyId],
    references: [studies.id],
  }),
  uploader: one(users, {
    fields: [studyFiles.uploadedBy],
    references: [users.id],
  }),
}));

export const quickQueriesRelations = relations(quickQueries, ({ one }) => ({
  tenant: one(tenants, {
    fields: [quickQueries.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [quickQueries.userId],
    references: [users.id],
  }),
}));

export const planUsageRelations = relations(planUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [planUsage.tenantId],
    references: [tenants.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenantId],
    references: [tenants.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const billingCustomersRelations = relations(billingCustomers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [billingCustomers.tenantId],
    references: [tenants.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type InsertMembership = typeof memberships.$inferInsert;
export type Study = typeof studies.$inferSelect;
export type InsertStudy = typeof studies.$inferInsert;
export type StudyComment = typeof studyComments.$inferSelect;
export type InsertStudyComment = typeof studyComments.$inferInsert;
export type StudyFile = typeof studyFiles.$inferSelect;
export type InsertStudyFile = typeof studyFiles.$inferInsert;
export type QuickQuery = typeof quickQueries.$inferSelect;
export type InsertQuickQuery = typeof quickQueries.$inferInsert;
export type PlanUsage = typeof planUsage.$inferSelect;
export type InsertPlanUsage = typeof planUsage.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type BillingCustomer = typeof billingCustomers.$inferSelect;
export type InsertBillingCustomer = typeof billingCustomers.$inferInsert;

