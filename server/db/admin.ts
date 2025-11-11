import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { users, studyUsage, InsertUser, InsertStudyUsage } from "../../drizzle/schema";

/**
 * Listar todos os usuários com informações de uso
 */
export async function listAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
  
  // Buscar uso atual de cada usuário
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const usersWithUsage = await Promise.all(
    allUsers.map(async (user) => {
      const [usage] = await db
        .select()
        .from(studyUsage)
        .where(
          and(
            eq(studyUsage.userId, user.id),
            eq(studyUsage.month, currentMonth),
            eq(studyUsage.year, currentYear)
          )
        )
        .limit(1);

      return {
        ...user,
        currentUsage: usage?.count || 0,
      };
    })
  );

  return usersWithUsage;
}

/**
 * Criar novo usuário
 */
export async function createUser(data: Omit<InsertUser, "id" | "createdAt" | "updatedAt" | "lastSignedIn">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.insert(users).values({
    ...data,
    lastSignedIn: new Date(),
  }).$returningId();

  return user;
}

/**
 * Atualizar usuário
 */
export async function updateUser(
  userId: number,
  data: Partial<Pick<InsertUser, "name" | "email" | "monthlyStudyLimit" | "isActive" | "role">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set(data).where(eq(users.id, userId));

  return { success: true };
}

/**
 * Deletar usuário
 */
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}

/**
 * Obter uso de estudos de um usuário
 */
export async function getUserStudyUsage(userId: number, month?: number, year?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();

  const [usage] = await db
    .select()
    .from(studyUsage)
    .where(
      and(
        eq(studyUsage.userId, userId),
        eq(studyUsage.month, targetMonth),
        eq(studyUsage.year, targetYear)
      )
    )
    .limit(1);

  return usage || { userId, month: targetMonth, year: targetYear, count: 0 };
}

/**
 * Incrementar contador de estudos
 */
export async function incrementStudyUsage(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Buscar registro existente
  const [existing] = await db
    .select()
    .from(studyUsage)
    .where(
      and(
        eq(studyUsage.userId, userId),
        eq(studyUsage.month, currentMonth),
        eq(studyUsage.year, currentYear)
      )
    )
    .limit(1);

  if (existing) {
    // Incrementar contador
    await db
      .update(studyUsage)
      .set({ count: existing.count + 1 })
      .where(eq(studyUsage.id, existing.id));
  } else {
    // Criar novo registro
    await db.insert(studyUsage).values({
      userId,
      month: currentMonth,
      year: currentYear,
      count: 1,
    });
  }

  return { success: true };
}

/**
 * Resetar contador de estudos de um usuário
 */
export async function resetStudyUsage(userId: number, month?: number, year?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const targetMonth = month || new Date().getMonth() + 1;
  const targetYear = year || new Date().getFullYear();

  await db
    .delete(studyUsage)
    .where(
      and(
        eq(studyUsage.userId, userId),
        eq(studyUsage.month, targetMonth),
        eq(studyUsage.year, targetYear)
      )
    );

  return { success: true };
}

/**
 * Verificar se usuário atingiu limite de estudos
 */
export async function checkStudyLimit(userId: number): Promise<{ allowed: boolean; current: number; limit: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar usuário
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  
  if (!user) {
    throw new Error("User not found");
  }

  if (!user.isActive) {
    return { allowed: false, current: 0, limit: user.monthlyStudyLimit };
  }

  // Buscar uso atual
  const usage = await getUserStudyUsage(userId);

  return {
    allowed: usage.count < user.monthlyStudyLimit,
    current: usage.count,
    limit: user.monthlyStudyLimit,
  };
}

