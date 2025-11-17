import { and, desc, eq, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  tenants, 
  memberships, 
  studies,
  quickQueries,
  planUsage,
  auditLogs,
  Tenant,
  Membership,
  commercialPointRequests,
  commercialPoints,
  commercialPointPhotos,
  InsertCommercialPointRequest,
  InsertCommercialPoint,
  InsertCommercialPointPhoto,
  leads
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    console.log("[Database] Starting upsertUser for openId:", user.openId);
    
    // First, check if user exists
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    console.log("[Database] User exists:", existingUser.length > 0);
    
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      updateSet.lastSignedIn = user.lastSignedIn;
    } else {
      updateSet.lastSignedIn = new Date();
    }
    
    if (user.role !== undefined) {
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      updateSet.role = 'admin_bp';
    }
    


    if (existingUser.length > 0) {
      // User exists, update only
      console.log("[Database] Updating existing user:", user.openId);
      await db.update(users).set(updateSet).where(eq(users.openId, user.openId));
    } else {
      // User doesn't exist, insert
      console.log("[Database] Inserting new user:", user.openId);
      const values: InsertUser = {
        openId: user.openId,
        ...updateSet,
      };
      await db.insert(users).values(values);
    }
    
    console.log("[Database] upsertUser completed for openId:", user.openId);
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Multi-tenant queries

export async function getUserMemberships(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      membership: memberships,
      tenant: tenants,
    })
    .from(memberships)
    .leftJoin(tenants, eq(memberships.tenantId, tenants.id))
    .where(eq(memberships.userId, userId));

  return result;
}

export async function getTenantById(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserMembershipInTenant(userId: number, tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getTenantMembers(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      membership: memberships,
      user: users,
    })
    .from(memberships)
    .leftJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, tenantId));

  return result;
}

// Plan usage queries

export async function getCurrentPlanUsage(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59);

    // Buscar registro existente para o período atual
    const result = await db
      .select()
      .from(planUsage)
      .where(
        and(
          eq(planUsage.tenantId, tenantId),
          eq(planUsage.periodStart, periodStart)
        )
      )
      .limit(1);

    if (result.length > 0) {
      return result[0];
    }

    // Criar novo registro de uso para o período atual
    const [newUsage] = await db.insert(planUsage).values({
      tenantId,
      periodStart,
      periodEnd,
      quickQueriesUsed: 0,
      studiesOpened: 0,
    }).$returningId();

    const newResult = await db.select().from(planUsage).where(eq(planUsage.id, newUsage.id)).limit(1);
    return newResult[0];
  } catch (error) {
    console.error("[Database] Error in getCurrentPlanUsage:", error);
    // Retornar um objeto padrão em caso de erro para não bloquear a consulta
    return {
      id: 0,
      tenantId,
      periodStart: new Date(),
      periodEnd: new Date(),
      quickQueriesUsed: 0,
      studiesOpened: 0,
      createdAt: new Date(),
    };
  }
}

export async function incrementQuickQueryUsage(tenantId: number) {
  const db = await getDb();
  if (!db) return;

  const usage = await getCurrentPlanUsage(tenantId);
  if (!usage) return;

  await db
    .update(planUsage)
    .set({ quickQueriesUsed: usage.quickQueriesUsed + 1 })
    .where(eq(planUsage.id, usage.id));
}

export async function incrementStudyUsage(tenantId: number) {
  const db = await getDb();
  if (!db) return;

  const usage = await getCurrentPlanUsage(tenantId);
  if (!usage) return;

  await db
    .update(planUsage)
    .set({ studiesOpened: usage.studiesOpened + 1 })
    .where(eq(planUsage.id, usage.id));
}

// Audit log

export async function createAuditLog(log: {
  tenantId?: number;
  actorId?: number;
  action: string;
  targetType?: string;
  targetId?: number;
  metaJson?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) return;

  await db.insert(auditLogs).values(log);
}

// Quick queries

export async function getTenantQuickQueries(tenantId: number, limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      query: quickQueries,
      user: users,
    })
    .from(quickQueries)
    .leftJoin(users, eq(quickQueries.userId, users.id))
    .where(eq(quickQueries.tenantId, tenantId))
    .orderBy(desc(quickQueries.createdAt))
    .limit(limit)
    .offset(offset);

  return result;
}

// Studies

export async function getTenantStudies(tenantId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      study: studies,
      creator: users,
    })
    .from(studies)
    .leftJoin(users, eq(studies.createdBy, users.id))
    .where(eq(studies.tenantId, tenantId))
    .orderBy(desc(studies.createdAt));

  return result;
}

export async function getStudyById(studyId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(studies).where(eq(studies.id, studyId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}




// Quick Queries

export async function createQuickQuery(data: {
  tenantId: number;
  userId: number;
  lat: string;
  lng: string;
  radiusM: number;
  layersEnabledJson: {
    demografia: boolean;
    renda: boolean;
    fluxo: boolean;
    concorrencia: boolean;
  };
  resultSummaryJson?: Record<string, any>;
  costUnits?: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create quick query: database not available");
    return null;
  }

  try {
    const result = await db.insert(quickQueries).values({
      tenantId: data.tenantId,
      userId: data.userId,
      lat: data.lat,
      lng: data.lng,
      radiusM: data.radiusM,
      layersEnabledJson: data.layersEnabledJson,
      resultSummaryJson: data.resultSummaryJson || {},
      costUnits: data.costUnits || 1,
    });
    
    console.log("[Database] Quick query created successfully");
    return result;
  } catch (error) {
    console.error("[Database] Failed to create quick query:", error);
    throw error;
  }
}




// Commercial Points

export async function createCommercialPointRequest(data: InsertCommercialPointRequest) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create commercial point request: database not available");
    return null;
  }

  try {
    const result = await db.insert(commercialPointRequests).values(data);
    console.log("[Database] Commercial point request created successfully");
    return result;
  } catch (error) {
    console.error("[Database] Failed to create commercial point request:", error);
    throw error;
  }
}

export async function getTenantCommercialPointRequests(tenantId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get commercial point requests: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(commercialPointRequests)
      .where(eq(commercialPointRequests.tenantId, tenantId))
      .orderBy(desc(commercialPointRequests.createdAt));
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get commercial point requests:", error);
    throw error;
  }
}

export async function getCommercialPointRequestById(requestId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(commercialPointRequests)
      .where(eq(commercialPointRequests.id, requestId))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get commercial point request:", error);
    throw error;
  }
}

export async function createCommercialPoint(data: InsertCommercialPoint) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create commercial point: database not available");
    return null;
  }

  try {
    const result = await db.insert(commercialPoints).values(data);
    console.log("[Database] Commercial point created successfully");
    return result;
  } catch (error) {
    console.error("[Database] Failed to create commercial point:", error);
    throw error;
  }
}

export async function getCommercialPointsByRequestId(requestId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get commercial points: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(commercialPoints)
      .where(eq(commercialPoints.requestId, requestId))
      .orderBy(desc(commercialPoints.createdAt));
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get commercial points:", error);
    throw error;
  }
}

export async function getCommercialPointById(pointId: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db
      .select()
      .from(commercialPoints)
      .where(eq(commercialPoints.id, pointId))
      .limit(1);
    
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get commercial point:", error);
    throw error;
  }
}

export async function addCommercialPointPhoto(data: InsertCommercialPointPhoto) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add photo: database not available");
    return null;
  }

  try {
    const result = await db.insert(commercialPointPhotos).values(data);
    console.log("[Database] Photo added successfully");
    return result;
  } catch (error) {
    console.error("[Database] Failed to add photo:", error);
    throw error;
  }
}

export async function getCommercialPointPhotos(pointId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get photos: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(commercialPointPhotos)
      .where(eq(commercialPointPhotos.pointId, pointId))
      .orderBy(commercialPointPhotos.order);
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get photos:", error);
    throw error;
  }
}

export async function updateCommercialPointRequestStatus(requestId: number, status: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update request status: database not available");
    return null;
  }

  try {
    const result = await db
      .update(commercialPointRequests)
      .set({ status: status as any })
      .where(eq(commercialPointRequests.id, requestId));
    
    console.log("[Database] Request status updated successfully");
    return result;
  } catch (error) {
    console.error("[Database] Failed to update request status:", error);
    throw error;
  }
}


// Verificar se usuário é um lead válido (fez cadastro prévio)
export async function isValidLead(email: string): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot check lead: database not available");
    return false;
  }

  try {
    const result = await db.select().from(leads).where(eq(leads.email, email)).limit(1);
    return result.length > 0;
  } catch (error) {
    console.error("[Database] Failed to check lead:", error);
    return false;
  }
}

// Vincular lead ao usuário após login
export async function linkLeadToUser(email: string, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot link lead: database not available");
    return;
  }

  try {
    await db.update(leads).set({ userId }).where(eq(leads.email, email));
    console.log("[Database] Lead linked to user:", userId);
  } catch (error) {
    console.error("[Database] Failed to link lead:", error);
  }
}

// Novas funções para o fluxo de admin

export async function getCommercialPointRequestsForAdmin(tenantId?: number) {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    // Return all commercial point requests, optionally filtered by tenantId
    let query = db.select().from(commercialPointRequests);
    
    if (tenantId) {
      query = query.where(eq(commercialPointRequests.tenantId, tenantId)) as any;
    }
    
    const result = await query.orderBy(desc(commercialPointRequests.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get requests for admin:", error);
    throw error;
  }
}

export async function updateCommercialPointData(pointId: number, data: Partial<InsertCommercialPoint>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update commercial point: database not available");
    return null;
  }

  try {
    const result = await db
      .update(commercialPoints)
      .set(data)
      .where(eq(commercialPoints.id, pointId));
    
    console.log("[Database] Commercial point updated successfully");
    return result;
  } catch (error) {
    console.error("[Database] Failed to update commercial point:", error);
    throw error;
  }
}

export async function getCommercialPointsInValidation(userId: number, tenantId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get points in validation: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(commercialPointRequests)
      .where(
        and(
          eq(commercialPointRequests.userId, userId),
          eq(commercialPointRequests.tenantId, tenantId),
          eq(commercialPointRequests.status, "validacao")
        )
      )
      .orderBy(desc(commercialPointRequests.updatedAt));
    
    return result;
  } catch (error) {
    console.error("[Database] Failed to get points in validation:", error);
    throw error;
  }
}
