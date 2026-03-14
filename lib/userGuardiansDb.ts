import { promises as fs } from 'fs';
import path from 'path';

type UserGuardianProfile = {
  guardians: string[];
  updatedAt: string;
};

type UserGuardiansDb = Record<string, UserGuardianProfile>;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'userGuardians.json');
const REQUIRED_GUARDIANS = 3;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFileSafe(): Promise<UserGuardiansDb> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as UserGuardiansDb;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeFileSafe(db: UserGuardiansDb): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function validateGuardianAddresses(guardians: string[]): string[] {
  if (guardians.length !== REQUIRED_GUARDIANS) {
    throw new Error(`Exactly ${REQUIRED_GUARDIANS} guardian addresses are required`);
  }

  const normalized = guardians.map((g) => g.trim());
  if (normalized.some((g) => !isValidEvmAddress(g))) {
    throw new Error('Each guardian must be a valid EVM address');
  }

  const unique = new Set(normalized.map(normalizeAddress));
  if (unique.size !== REQUIRED_GUARDIANS) {
    throw new Error('Guardian addresses must be unique');
  }

  return normalized;
}

export async function getUserGuardians(email: string): Promise<UserGuardianProfile | null> {
  const user = normalizeEmail(email);
  if (!user) return null;

  const db = await readFileSafe();
  return db[user] ?? null;
}

export async function saveUserGuardians(
  email: string,
  guardians: string[],
): Promise<UserGuardianProfile> {
  const user = normalizeEmail(email);
  if (!user) {
    throw new Error('email is required');
  }

  const valid = validateGuardianAddresses(guardians);
  const db = await readFileSafe();

  const profile: UserGuardianProfile = {
    guardians: valid,
    updatedAt: new Date().toISOString(),
  };

  db[user] = profile;
  await writeFileSafe(db);
  return profile;
}

export async function hasRequiredUserGuardians(email: string): Promise<boolean> {
  const profile = await getUserGuardians(email);
  if (!profile) return false;

  try {
    validateGuardianAddresses(profile.guardians);
    return true;
  } catch {
    return false;
  }
}

