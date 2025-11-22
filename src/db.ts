import pkg from "pg";
import pgvector from "pgvector/pg";

const { Client } = pkg;

export const client = new Client({
  connectionString: process.env.DATABASE_URL
});

export const connectDB = async () => {
  const dbUrlString = process.env.DATABASE_URL;
  if (!dbUrlString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Parse the connection string to get database name
  const dbUrl = new URL(dbUrlString);
  const dbName = dbUrl.pathname.slice(1); // Remove leading '/'
  
  if (!dbName) {
    throw new Error("Database name not found in DATABASE_URL");
  }
  
  // Validate database name (alphanumeric and underscores only)
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error(`Invalid database name: ${dbName}. Only alphanumeric characters and underscores are allowed.`);
  }
  
  // Connect to default 'postgres' database first to create the target database if needed
  const adminUrl = dbUrlString.replace(`/${dbName}`, "/postgres");
  const adminClient = new Client({ connectionString: adminUrl });
  
  try {
    await adminClient.connect();
    
    // Try to refresh collation versions to fix version mismatches
    try {
      await adminClient.query("ALTER DATABASE template1 REFRESH COLLATION VERSION");
    } catch (e: unknown) {
      // Ignore - template1 might not need refreshing or might not be accessible
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!errorMessage.includes('does not exist')) {
        console.warn("Warning: Could not refresh template1 collation:", errorMessage);
      }
    }
    
    try {
      await adminClient.query("ALTER DATABASE postgres REFRESH COLLATION VERSION");
    } catch (e: unknown) {
      // Ignore - postgres might not need refreshing
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!errorMessage.includes('does not exist')) {
        console.warn("Warning: Could not refresh postgres collation:", errorMessage);
      }
    }
    
    // Check if database exists
    const result = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    
    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      try {
        await adminClient.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database ${dbName} created`);
      } catch (createError: unknown) {
        const errorMessage = createError instanceof Error ? createError.message : String(createError);
        const errorCode = createError && typeof createError === "object" && "code" in createError ? createError.code : undefined;
        if (errorCode === 'XX000' || errorMessage.includes('collation')) {
          console.error("\n❌ Failed to create database due to collation version mismatch.");
          console.error("\n💡 Solution: Clean the old database volume and start fresh:");
          console.error("   make clean");
          console.error("   make up\n");
          throw new Error(`Cannot create database: ${errorMessage}`);
        }
        throw createError;
      }
    }
  } catch (error) {
    console.error("Error checking/creating database:", error);
    throw error;
  } finally {
    await adminClient.end();
  }
  
  // Now connect to the target database
  await client.connect();
  // Ensure required extensions exist
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await pgvector.registerTypes(client);
  await client.query(`
    CREATE TABLE IF NOT EXISTS face_embeddings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      embedding vector(512),
      image_path text,
      created_at timestamptz DEFAULT now()
    )
  `);
};

export const vectorToSql = (arr: number[]) => pgvector.toSql(arr);


