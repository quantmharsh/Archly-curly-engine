import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

const connectionString = process.env.DATABASE_URL ?? "postgresql://archly:archly_dev_password@127.0.0.1:5433/archly";

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
