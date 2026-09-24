/**
 * Verifies that MONGODB_URI points at a reachable Atlas cluster.
 *
 * Run with:  npm run db:check
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

// Minimal .env.local reader — avoids a dependency just to run one check.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("No .env.local found. Copy .env.example to .env.local first.");
  process.exit(1);
}

const uri = process.env.MONGODB_URI;
if (!uri || uri.includes("<user>")) {
  console.error("MONGODB_URI is not filled in yet in .env.local.");
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const { host, name } = mongoose.connection;
  console.log(`Connected.  host: ${host}   database: ${name}`);

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(
    collections.length
      ? `Collections: ${collections.map((c) => c.name).join(", ")}`
      : "No collections yet — expected on a fresh database.",
  );
  await mongoose.disconnect();
} catch (error) {
  console.error(`Could not connect: ${error.message}`);
  console.error(
    "\nMost common cause: your current IP is not allowlisted in Atlas.\n" +
      "Atlas → Network Access → Add IP Address → Add Current IP Address.",
  );
  process.exit(1);
}
