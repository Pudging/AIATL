import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not set in environment");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);
export const mongoClientPromise: Promise<MongoClient> =
  globalThis._mongoClientPromise ?? client.connect();

if (process.env.NODE_ENV !== "production") {
  globalThis._mongoClientPromise = mongoClientPromise;
}
