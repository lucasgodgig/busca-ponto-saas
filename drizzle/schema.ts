import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, index, boolean } from "drizzle-orm/mysql-core";
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
  monthlyStudyLimit: int("monthlyStudyLimit").default(10).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
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
  segment: varchar("segment", { length: 100 }),
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
  role: mysqlEnum("role", ["tenant_admin", "analyst", "member"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  tenantIdIdx: index("tenantId_idx").on(table.tenantId),
}));

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
}, (table) => ({
  tenantIdIdx: index("tenantId_idx").on(table.tenantId),
  statusIdx: index("status_idx").on(table.status),
  createdByIdx: index("createdBy_idx").on(table.createdBy),
}));

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

/**
 * Leads - cadastros da landing page antes do login
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  empresa: varchar("empresa", { length: 255 }),
  cargo: varchar("cargo", { length: 255 }),
  userId: int("userId"), // Vinculado após login
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * InviteCode - codigos de convite para controlar acesso
 */
export const inviteCodes = mysqlTable("inviteCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 255 }).notNull().unique(),
  createdBy: int("createdBy").notNull(),
  usedBy: int("usedBy"),
  usedAt: timestamp("usedAt"),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * SavedLocation - Pontos e polígonos salvos pelo usuário no mapa interativo
 */
export const savedLocations = mysqlTable("savedLocations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["point", "polygon"]).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["concorrente", "oportunidade", "cliente", "fornecedor", "outro"]).default("outro").notNull(),
  coordinatesJson: json("coordinatesJson").$type<{
    lat?: number;
    lng?: number;
    vertices?: Array<{ lat: number; lng: number }>;
  }>().notNull(),
  metadataJson: json("metadataJson").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  categoryIdx: index("category_idx").on(table.category),
}));

/**
 * StudyUsage - Rastreamento de estudos completos por usuário por mês
 */
export const studyUsage = mysqlTable("studyUsage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  count: int("count").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userMonthYearIdx: index("user_month_year_idx").on(table.userId, table.month, table.year),
}));

/**
 * Notifications - Notificacoes para usuarios
 */
export const notifications = mysqlTable('notifications', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('userId').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  type: mysqlEnum('type', ['study_ready', 'study_rejected', 'system', 'other']).default('other').notNull(),
  relatedStudyRequestId: int('relatedStudyRequestId'),
  isRead: boolean('isRead').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  typeIdx: index('type_idx').on(table.type),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  createdStudies: many(studies, { relationName: "createdBy" }),
  assignedStudies: many(studies, { relationName: "assignedTo" }),
  comments: many(studyComments),
  quickQueries: many(quickQueries),
  savedLocations: many(savedLocations),
  studyUsage: many(studyUsage),
  notifications: many(notifications),
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

export const inviteCodesRelations = relations(inviteCodes, ({ one }) => ({
  creator: one(users, {
    fields: [inviteCodes.createdBy],
    references: [users.id],
  }),
}));

export const savedLocationsRelations = relations(savedLocations, ({ one }) => ({
  user: one(users, {
    fields: [savedLocations.userId],
    references: [users.id],
  }),
}));

export const studyUsageRelations = relations(studyUsage, ({ one }) => ({
  user: one(users, {
    fields: [studyUsage.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

/**
 * GeneratedStudy - Estudos gerados automaticamente com dados da Space API
 */
export const generatedStudies = mysqlTable('generatedStudies', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenantId').notNull(),
  createdBy: int('createdBy').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  segment: varchar('segment', { length: 255 }).notNull(),
  lat: varchar('lat', { length: 50 }).notNull(),
  lng: varchar('lng', { length: 50 }).notNull(),
  radiusM: int('radiusM').notNull(),
  notes: text('notes'),
  status: mysqlEnum('status', ['queued', 'processing', 'done', 'error']).default('queued').notNull(),
  resultJsonUrl: text('resultJsonUrl'),
  pdfUrl: text('pdfUrl'),
  errorMessage: text('errorMessage'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
});

export const generatedStudiesRelations = relations(generatedStudies, ({ one }) => ({
  tenant: one(tenants, {
    fields: [generatedStudies.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [generatedStudies.createdBy],
    references: [users.id],
  }),
}));

/**
 * StudyRequest - Solicitações de estudos via formulário
 * Cliente preenche formulário, admin analisa e faz upload do PDF final
 */
export const studyRequests = mysqlTable('studyRequests', {
  id: int('id').autoincrement().primaryKey(),
  tenantId: int('tenantId').notNull(),
  createdBy: int('createdBy').notNull(),
  
  // Dados da solicitação
  title: varchar('title', { length: 255 }).notNull(),
  segment: varchar('segment', { length: 255 }),
  address: text('address').notNull(),
  lat: varchar('lat', { length: 50 }),
  lng: varchar('lng', { length: 50 }),
  radiusM: int('radiusM'),
  description: text('description'),
  objectives: text('objectives'),
  
  // Controle
  status: mysqlEnum('status', ['pendente', 'em_analise', 'concluido', 'cancelado']).default('pendente').notNull(),
  priority: mysqlEnum('priority', ['baixa', 'media', 'alta']).default('media').notNull(),
  assignedTo: int('assignedTo'), // Admin BP responsável
  
  // Resultado
  pdfUrl: text('pdfUrl'), // URL do PDF no S3
  pdfFileKey: text('pdfFileKey'), // Chave do arquivo no S3
  adminNotes: text('adminNotes'), // Notas internas do admin
  completedAt: timestamp('completedAt'),
  
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('tenantId_idx').on(table.tenantId),
  statusIdx: index('status_idx').on(table.status),
  createdByIdx: index('createdBy_idx').on(table.createdBy),
}));

export const studyRequestsRelations = relations(studyRequests, ({ one }) => ({
  tenant: one(tenants, {
    fields: [studyRequests.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [studyRequests.createdBy],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [studyRequests.assignedTo],
    references: [users.id],
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
export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = typeof inviteCodes.$inferInsert;
export type GeneratedStudy = typeof generatedStudies.$inferSelect;
export type InsertGeneratedStudy = typeof generatedStudies.$inferInsert;
export type SavedLocation = typeof savedLocations.$inferSelect;
export type InsertSavedLocation = typeof savedLocations.$inferInsert;
export type StudyUsage = typeof studyUsage.$inferSelect;
export type InsertStudyUsage = typeof studyUsage.$inferInsert;
export type StudyRequest = typeof studyRequests.$inferSelect;
export type InsertStudyRequest = typeof studyRequests.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type CommercialPointRequest = typeof commercialPointRequests.$inferSelect;
export type InsertCommercialPointRequest = typeof commercialPointRequests.$inferInsert;
export type CommercialPoint = typeof commercialPoints.$inferSelect;
export type InsertCommercialPoint = typeof commercialPoints.$inferInsert;
export type CommercialPointPhoto = typeof commercialPointPhotos.$inferSelect;
export type InsertCommercialPointPhoto = typeof commercialPointPhotos.$inferInsert;




/**
 * CommercialPointRequest - Solicitações de indicação de pontos comerciais
 */
export const commercialPointRequests = mysqlTable("commercialPointRequests", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  userId: int("userId").notNull(),
  studyId: int("studyId"), // Opcional: vinculado a um estudo
  segment: varchar("segment", { length: 255 }).notNull(), // Segmento do negócio (Farmácia, Restaurante, etc)
  city: varchar("city", { length: 255 }).notNull(), // Cidade de interesse
  neighborhoods: text("neighborhoods"), // Bairros de interesse (JSON array ou string separada por vírgula)
  socialClass: varchar("socialClass", { length: 50 }), // Classe social atendida (A, B, C, D, E)
  propertySize: int("propertySize"), // Tamanho do imóvel em m²
  maxRent: int("maxRent"), // Valor máximo de aluguel em reais
  requirements: text("requirements").notNull(), // Requisitos adicionais (OBRIGATÓRIO)
  status: mysqlEnum("status", ["aberto", "em_busca", "encontrado", "cancelado"]).default("aberto").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdIdx: index("tenantId_idx").on(table.tenantId),
  userIdIdx: index("userId_idx").on(table.userId),
  statusIdx: index("status_idx").on(table.status),
  cityIdx: index("city_idx").on(table.city),
}));

/**
 * CommercialPoint - Pontos comerciais indicados em resposta às solicitações
 */
export const commercialPoints = mysqlTable("commercialPoints", {
  id: int("id").autoincrement().primaryKey(),
  requestId: int("requestId").notNull(),
  tenantId: int("tenantId").notNull(),
  address: text("address").notNull(),
  lat: varchar("lat", { length: 50 }).notNull(),
  lng: varchar("lng", { length: 50 }).notNull(),
  propertyType: varchar("propertyType", { length: 100 }), // Loja, Sala, Galpão, etc
  totalAreaM2: int("totalAreaM2"),
  usableAreaM2: int("usableAreaM2"),
  rentalPrice: int("rentalPrice"), // Em centavos
  salePrice: int("salePrice"), // Em centavos
  ownerName: varchar("ownerName", { length: 255 }),
  ownerPhone: varchar("ownerPhone", { length: 20 }),
  brokerName: varchar("brokerName", { length: 255 }),
  brokerPhone: varchar("brokerPhone", { length: 20 }),
  brokerEmail: varchar("brokerEmail", { length: 320 }),
  description: text("description"),
  amenitiesJson: json("amenitiesJson").$type<string[]>(), // ["estacionamento", "elevador", etc]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  requestIdIdx: index("requestId_idx").on(table.requestId),
  tenantIdIdx: index("tenantId_idx").on(table.tenantId),
}));

/**
 * CommercialPointPhoto - Fotos dos pontos comerciais
 */
export const commercialPointPhotos = mysqlTable("commercialPointPhotos", {
  id: int("id").autoincrement().primaryKey(),
  pointId: int("pointId").notNull(),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  caption: varchar("caption", { length: 255 }),
  order: int("order").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  pointIdIdx: index("pointId_idx").on(table.pointId),
}));

export type CommercialPointRequest = typeof commercialPointRequests.$inferSelect;
export type InsertCommercialPointRequest = typeof commercialPointRequests.$inferInsert;
export type CommercialPoint = typeof commercialPoints.$inferSelect;
export type InsertCommercialPoint = typeof commercialPoints.$inferInsert;
export type CommercialPointPhoto = typeof commercialPointPhotos.$inferSelect;
export type InsertCommercialPointPhoto = typeof commercialPointPhotos.$inferInsert;




// Duplicated tables removed - already defined above

// Relations
export const commercialPointRequestsRelations = relations(commercialPointRequests, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [commercialPointRequests.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [commercialPointRequests.userId],
    references: [users.id],
  }),
  points: many(commercialPoints),
}));

export const commercialPointsRelations = relations(commercialPoints, ({ one, many }) => ({
  request: one(commercialPointRequests, {
    fields: [commercialPoints.requestId],
    references: [commercialPointRequests.id],
  }),
  tenant: one(tenants, {
    fields: [commercialPoints.tenantId],
    references: [tenants.id],
  }),
  photos: many(commercialPointPhotos),
}));

export const commercialPointPhotosRelations = relations(commercialPointPhotos, ({ one }) => ({
  point: one(commercialPoints, {
    fields: [commercialPointPhotos.pointId],
    references: [commercialPoints.id],
  }),
}));

// Type exports
export type CommercialPointRequest = typeof commercialPointRequests.$inferSelect;
export type InsertCommercialPointRequest = typeof commercialPointRequests.$inferInsert;
export type CommercialPoint = typeof commercialPoints.$inferSelect;
export type InsertCommercialPoint = typeof commercialPoints.$inferInsert;
export type CommercialPointPhoto = typeof commercialPointPhotos.$inferSelect;
export type InsertCommercialPointPhoto = typeof commercialPointPhotos.$inferInsert;

