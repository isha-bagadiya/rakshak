import { getMongoDb } from '@/lib/mongodb';

type WalletOwnerRecord = {
  walletId: string;
  ownerEmail: string;
  updatedAt: string;
};

const COLLECTION_NAME = 'walletOwners';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeWalletId(walletId: string): string {
  return walletId.trim();
}

async function walletOwnersCollection() {
  const db = await getMongoDb();
  return db.collection<WalletOwnerRecord>(COLLECTION_NAME);
}

export async function setWalletOwner(walletId: string, email: string): Promise<void> {
  const id = normalizeWalletId(walletId);
  const owner = normalizeEmail(email);

  if (!id) {
    throw new Error('walletId is required');
  }
  if (!owner) {
    throw new Error('email is required');
  }

  const collection = await walletOwnersCollection();
  await collection.updateOne(
    { walletId: id },
    {
      $set: {
        walletId: id,
        ownerEmail: owner,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
}

export async function listWalletIdsByOwner(email: string): Promise<string[]> {
  const owner = normalizeEmail(email);
  if (!owner) {
    return [];
  }

  const collection = await walletOwnersCollection();
  const records = await collection
    .find({ ownerEmail: owner }, { projection: { walletId: 1, _id: 0 } })
    .toArray();

  return records
    .map((record) => normalizeWalletId(record.walletId))
    .filter(Boolean);
}

export async function isWalletOwnedBy(walletId: string, email: string): Promise<boolean> {
  const id = normalizeWalletId(walletId);
  const owner = normalizeEmail(email);
  if (!id || !owner) {
    return false;
  }

  const collection = await walletOwnersCollection();
  const record = await collection.findOne(
    { walletId: id, ownerEmail: owner },
    { projection: { _id: 1 } },
  );

  return Boolean(record);
}
