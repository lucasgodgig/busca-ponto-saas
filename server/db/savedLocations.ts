import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { savedLocations, InsertSavedLocation } from "../../drizzle/schema";

export async function createSavedLocation(data: InsertSavedLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [location] = await db.insert(savedLocations).values(data).$returningId();
  return location;
}

export async function listSavedLocations(userId: number, category?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(savedLocations.userId, userId)];
  if (category) {
    conditions.push(eq(savedLocations.category, category as any));
  }

  return await db
    .select()
    .from(savedLocations)
    .where(and(...conditions))
    .orderBy(desc(savedLocations.createdAt));
}

export async function getSavedLocation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [location] = await db
    .select()
    .from(savedLocations)
    .where(and(eq(savedLocations.id, id), eq(savedLocations.userId, userId)))
    .limit(1);

  return location;
}

export async function updateSavedLocation(
  id: number,
  userId: number,
  data: Partial<Pick<InsertSavedLocation, "name" | "description" | "category">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(savedLocations)
    .set(data)
    .where(and(eq(savedLocations.id, id), eq(savedLocations.userId, userId)));

  return { success: true };
}

export async function deleteSavedLocation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(savedLocations)
    .where(and(eq(savedLocations.id, id), eq(savedLocations.userId, userId)));

  return { success: true };
}

