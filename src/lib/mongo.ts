import { MongoClient, type Db } from "mongodb";

/**
 * READ-ONLY MongoDB access.
 *
 * This client is used ONLY by offline scripts (data audit + curation). The
 * deployed dashboard never touches Mongo directly — it serves precomputed JSON.
 * We never call insert/update/delete anywhere in this codebase; the connection
 * uses a secondary-preferred read preference to further discourage writes.
 */

let cached: MongoClient | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  if (cached) return cached;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local before running data scripts."
    );
  }
  const client = new MongoClient(uri, {
    readPreference: "secondaryPreferred",
    // Fail fast rather than hang if the URI/network is wrong.
    serverSelectionTimeoutMS: 15_000,
  });
  await client.connect();
  cached = client;
  return client;
}

/** Get a Db handle. If dbName is omitted, uses the database from the URI. */
export async function getDb(dbName?: string): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName || process.env.MONGODB_DB || undefined);
}

export async function closeMongo(): Promise<void> {
  if (cached) {
    await cached.close();
    cached = null;
  }
}
