import pkg from "pg";
import pgvector from "pgvector/pg";

const { Client } = pkg;

export const client = new Client({
  connectionString: process.env.DATABASE_URL
});

/**
 * Validate and parse DATABASE_URL
 */
interface DatabaseConfig {
  dbName: string;
  adminUrl: string;
  connectionUrl: string;
}

const parseDatabaseUrl = (dbUrlString: string | undefined): DatabaseConfig => {
  if (!dbUrlString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const dbUrl = new URL(dbUrlString);
  const dbName = dbUrl.pathname.slice(1); // Remove leading '/'

  if (!dbName) {
    throw new Error("Database name not found in DATABASE_URL");
  }

  // Validate database name (alphanumeric and underscores only)
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(
      `Invalid database name: ${dbName}. Only alphanumeric characters and underscores are allowed.`
    );
  }

  const adminUrl = dbUrlString.replace(`/${dbName}`, "/postgres");

  return { dbName, adminUrl, connectionUrl: dbUrlString };
};

/**
 * Refresh database collation versions to fix version mismatches
 */
const refreshCollations = async (adminClient: InstanceType<typeof Client>): Promise<void> => {
  const databases = ["template1", "postgres"];

  for (const db of databases) {
    try {
      await adminClient.query(`ALTER DATABASE ${db} REFRESH COLLATION VERSION`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!errorMessage.includes("does not exist")) {
        console.warn(`Warning: Could not refresh ${db} collation:`, errorMessage);
      }
    }
  }
};

/**
 * Ensure database exists, create if needed
 */
const ensureDatabaseExists = async (
  adminClient: InstanceType<typeof Client>,
  dbName: string
): Promise<void> => {
  // Check if database exists
  const result = await adminClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );

  if (result.rows.length === 0) {
    // Database doesn't exist, create it
    try {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Database ${dbName} created`);
    } catch (createError: unknown) {
      const errorMessage =
        createError instanceof Error ? createError.message : String(createError);
      const errorCode =
        createError && typeof createError === "object" && "code" in createError
          ? createError.code
          : undefined;

      if (errorCode === "XX000" || errorMessage.includes("collation")) {
        console.error("\n❌ Failed to create database due to collation version mismatch.");
        console.error("\n💡 Solution: Clean the old database volume and start fresh:");
        console.error("   make clean");
        console.error("   make up\n");
        throw new Error(`Cannot create database: ${errorMessage}`);
      }
      throw createError;
    }
  }
};

/**
 * Setup PostgreSQL extensions and create tables
 */
const setupExtensionsAndTables = async (client: InstanceType<typeof Client>): Promise<void> => {
  // Create required extensions
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pgvector.registerTypes(client);

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS face_embeddings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      embedding vector(512),
      image_path text,
      created_at timestamptz DEFAULT now()
    )
  `);

  console.log("✓ Extensions and tables ready");
};

/**
 * Connect to database, create if needed, and setup tables
 */
export const connectDB = async (): Promise<void> => {
  // Step 1: Parse and validate DATABASE_URL
  const { dbName, adminUrl } = parseDatabaseUrl(process.env.DATABASE_URL);

  // Step 2: Connect to admin database
  const adminClient = new Client({ connectionString: adminUrl });

  try {
    await adminClient.connect();

    // Step 3: Refresh collations
    await refreshCollations(adminClient);

    // Step 4: Ensure database exists
    await ensureDatabaseExists(adminClient, dbName);
  } catch (error) {
    console.error("Error during database setup:", error);
    throw error;
  } finally {
    await adminClient.end();
  }

  // Step 5: Connect to target database
  await client.connect();

  // Step 6: Setup extensions and tables
  await setupExtensionsAndTables(client);
};

export const vectorToSql = (arr: number[]) => pgvector.toSql(arr);


