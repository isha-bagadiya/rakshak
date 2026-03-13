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
const MAX_GUARDIANS_PER_WALLET = 3;
const REQUIRED_RECOVERY_THRESHOLD = 2;

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

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function requiredThresholdForCount(guardiansCount: number): number {
  if (guardiansCount <= 0) {
    return 0;
  }
  if (guardiansCount < REQUIRED_RECOVERY_THRESHOLD) {
    return guardiansCount;
  }
  return REQUIRED_RECOVERY_THRESHOLD;
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
    const expectedThreshold = requiredThresholdForCount(existing.guardians.length);
    if (existing.threshold !== expectedThreshold) {
      existing.threshold = expectedThreshold;
      db[id] = existing;
      await writeFileSafe(db);
    }
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
  if (!isValidEvmAddress(rawAddress)) {
    throw new Error('Guardian address must be a valid EVM address');
  }

  const db = await readFileSafe();
  const current: GuardianConfig =
    db[id] ?? {
      guardians: [],
      threshold: 0,
    };

  const normalized = normalizeAddress(rawAddress);
  const existing = current.guardians.map(normalizeAddress);
  const alreadyExists = existing.includes(normalized);

  if (!alreadyExists && current.guardians.length >= MAX_GUARDIANS_PER_WALLET) {
    throw new Error(`A wallet can only have up to ${MAX_GUARDIANS_PER_WALLET} guardians`);
  }

  if (!alreadyExists) {
    current.guardians.push(rawAddress);
  }

  current.threshold = requiredThresholdForCount(current.guardians.length);

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

  current.threshold = requiredThresholdForCount(current.guardians.length);

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
  const db = await readFileSafe();
  const current: GuardianConfig =
    db[id] ?? {
      guardians: [],
      threshold: 0,
    };

  const expectedThreshold = requiredThresholdForCount(current.guardians.length);
  if (threshold !== expectedThreshold) {
    const hint =
      expectedThreshold === REQUIRED_RECOVERY_THRESHOLD
        ? `${REQUIRED_RECOVERY_THRESHOLD} (mandatory)`
        : String(expectedThreshold);
    throw new Error(`Threshold is fixed at ${hint} for the current number of guardians`);
  }
  current.threshold = expectedThreshold;

  db[id] = current;
  await writeFileSafe(db);
  return current;
}

