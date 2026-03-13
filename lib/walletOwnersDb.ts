import { promises as fs } from 'fs';
import path from 'path';

type WalletOwnersDb = Record<string, string>;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'walletOwners.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFileSafe(): Promise<WalletOwnersDb> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as WalletOwnersDb;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeFileSafe(db: WalletOwnersDb): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function setWalletOwner(walletId: string, email: string): Promise<void> {
  const id = walletId.trim();
  const owner = normalizeEmail(email);
  if (!id) {
    throw new Error('walletId is required');
  }
  if (!owner) {
    throw new Error('email is required');
  }

  const db = await readFileSafe();
  db[id] = owner;
  await writeFileSafe(db);
}

export async function listWalletIdsByOwner(email: string): Promise<string[]> {
  const owner = normalizeEmail(email);
  if (!owner) {
    return [];
  }

  const db = await readFileSafe();
  return Object.entries(db)
    .filter(([, value]) => normalizeEmail(value) === owner)
    .map(([walletId]) => walletId);
}

export async function isWalletOwnedBy(walletId: string, email: string): Promise<boolean> {
  const id = walletId.trim();
  const owner = normalizeEmail(email);
  if (!id || !owner) {
    return false;
  }

  const db = await readFileSafe();
  return normalizeEmail(db[id] ?? '') === owner;
}

