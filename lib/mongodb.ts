import { MongoClient } from 'mongodb';

let clientPromise: Promise<MongoClient> | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is not set in environment.`);
  }
  return value.trim();
}

export async function getMongoDb() {
  const uri = getEnv('MONGODB_URI');
  const dbName = getEnv('MONGODB_DB_NAME');

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db(dbName);
}

