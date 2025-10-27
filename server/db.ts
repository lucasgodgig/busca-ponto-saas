import { and, desc, eq } from "drizzle-orm";
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
  Membership
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
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin_bp';
      updateSet.role = 'admin_bp';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
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

