import mongoose from "mongoose";

/**
 * Mongoose connection helper for a serverless runtime.
 *
 * Each serverless invocation may reuse a warm container, so the connection is
 * cached on `globalThis`. Without this, every request would open a new pool and
 * Atlas would run out of connections under even light load.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

const cached = globalThis._mongooseConn ?? { conn: null, promise: null };
globalThis._mongooseConn = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and add your Atlas connection string.",
    );
  }

  cached.promise ??= mongoose.connect(uri, {
    // Fail fast rather than hanging a patient's booking request.
    serverSelectionTimeoutMS: 8_000,
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
