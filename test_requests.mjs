import { drizzle } from "drizzle-orm/mysql2";
import { commercialPointRequests } from "./drizzle/schema.js";
import { desc } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

const requests = await db
  .select()
  .from(commercialPointRequests)
  .orderBy(desc(commercialPointRequests.createdAt));

console.log("Total requests:", requests.length);
requests.forEach(req => {
  console.log(`- ID: ${req.id}, Segment: ${req.segment}, TenantId: ${req.tenantId}, Status: ${req.status}`);
});
