import { promises as fs } from 'fs';
import path from 'path';

type PublicKeychain = {
  id: string;
  pub: string;
  encryptedPrv: string;
};

type KeyExportPayload = {
  userKeychain: PublicKeychain & { prv: string };
};

type KeyExportRecord = {
  walletId: string;
  ownerEmail: string;
  createdAt: string;
  expiresAt: string;
  payload: KeyExportPayload;
};

type KeyExportDb = Record<string, KeyExportRecord>;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'keyExports.json');
const EXPORT_TTL_MINUTES = 30;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFileSafe(): Promise<KeyExportDb> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as KeyExportDb;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeFileSafe(db: KeyExportDb): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function saveKeyExportRecord(params: {
  walletId: string;
  ownerEmail: string;
  payload: KeyExportPayload;
}): Promise<{ expiresAt: string }> {
  const walletId = params.walletId.trim();
  const ownerEmail = normalizeEmail(params.ownerEmail);
  if (!walletId) {
    throw new Error('walletId is required');
  }
  if (!ownerEmail) {
    throw new Error('ownerEmail is required');
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + EXPORT_TTL_MINUTES * 60 * 1000);

  const db = await readFileSafe();
  db[walletId] = {
    walletId,
    ownerEmail,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    payload: params.payload,
  };
  await writeFileSafe(db);

  return { expiresAt: expiresAt.toISOString() };
}

export async function consumeKeyExportRecord(
  walletIdInput: string,
  ownerEmailInput: string,
): Promise<{ payload: KeyExportPayload; expiresAt: string }> {
  const walletId = walletIdInput.trim();
  const ownerEmail = normalizeEmail(ownerEmailInput);
  if (!walletId) {
    throw new Error('walletId is required');
  }
  if (!ownerEmail) {
    throw new Error('ownerEmail is required');
  }

  const db = await readFileSafe();
  const record = db[walletId];
  if (!record) {
    throw new Error('No key export is available for this wallet');
  }
  if (normalizeEmail(record.ownerEmail) !== ownerEmail) {
    throw new Error('Forbidden key export access for this wallet');
  }
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    delete db[walletId];
    await writeFileSafe(db);
    throw new Error('Key export has expired. Create a new wallet to generate keys again');
  }

  delete db[walletId];
  await writeFileSafe(db);

  return { payload: record.payload, expiresAt: record.expiresAt };
}
