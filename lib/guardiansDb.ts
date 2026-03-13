import { promises as fs } from 'fs';
import path from 'path';

type GuardianConfig = {
  guardians: string[];
  /**
   * Number of guardian approvals required to recover / approve a sensitive action.
   * Must be between 1 and guardians.length (inclusive).
   */
  threshold: number;
};

type GuardiansDb = Record<string, GuardianConfig>;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'guardians.json');

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFileSafe(): Promise<GuardiansDb> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as GuardiansDb;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeFileSafe(db: GuardiansDb): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

export async function getGuardianConfig(walletId: string): Promise<GuardianConfig | null> {
  const id = walletId.trim();
  if (!id) return null;

  const db = await readFileSafe();
  return db[id] ?? null;
}

export async function listGuardians(walletId: string): Promise<GuardianConfig> {
  const id = walletId.trim();
  if (!id) {
    throw new Error('walletId is required');
  }

  const db = await readFileSafe();
  const existing = db[id];

  if (existing) {
    return existing;
  }

  const initial: GuardianConfig = {
    guardians: [],
    threshold: 0,
  };
  db[id] = initial;
  await writeFileSafe(db);
  return initial;
}

export async function addGuardian(walletId: string, address: string): Promise<GuardianConfig> {
  const id = walletId.trim();
  const rawAddress = address.trim();

  if (!id) {
    throw new Error('walletId is required');
  }
  if (!rawAddress) {
    throw new Error('Guardian address is required');
  }

  const db = await readFileSafe();
  const current: GuardianConfig =
    db[id] ?? {
      guardians: [],
      threshold: 0,
    };

  const normalized = normalizeAddress(rawAddress);
  const existing = current.guardians.map(normalizeAddress);

  if (!existing.includes(normalized)) {
    current.guardians.push(rawAddress);
  }

  if (current.threshold > current.guardians.length) {
    current.threshold = current.guardians.length;
  }

  db[id] = current;
  await writeFileSafe(db);
  return current;
}

export async function removeGuardian(walletId: string, address: string): Promise<GuardianConfig> {
  const id = walletId.trim();
  const rawAddress = address.trim();

  if (!id) {
    throw new Error('walletId is required');
  }
  if (!rawAddress) {
    throw new Error('Guardian address is required');
  }

  const db = await readFileSafe();
  const current: GuardianConfig =
    db[id] ?? {
      guardians: [],
      threshold: 0,
    };

  const normalized = normalizeAddress(rawAddress);
  current.guardians = current.guardians.filter((addr) => normalizeAddress(addr) !== normalized);

  if (current.threshold > current.guardians.length) {
    current.threshold = current.guardians.length;
  }

  db[id] = current;
  await writeFileSafe(db);
  return current;
}

export async function setThreshold(walletId: string, threshold: number): Promise<GuardianConfig> {
  const id = walletId.trim();

  if (!id) {
    throw new Error('walletId is required');
  }
  if (!Number.isInteger(threshold)) {
    throw new Error('Threshold must be an integer');
  }
  if (threshold < 0) {
    throw new Error('Threshold cannot be negative');
  }

  const db = await readFileSafe();
  const current: GuardianConfig =
    db[id] ?? {
      guardians: [],
      threshold: 0,
    };

  if (threshold === 0 && current.guardians.length === 0) {
    current.threshold = 0;
  } else {
    if (threshold < 1) {
      throw new Error('Threshold must be at least 1 when guardians exist');
    }
    if (threshold > current.guardians.length) {
      throw new Error('Threshold cannot be greater than number of guardians');
    }
    current.threshold = threshold;
  }

  db[id] = current;
  await writeFileSafe(db);
  return current;
}

