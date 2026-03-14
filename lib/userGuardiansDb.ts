import { promises as fs } from 'fs';
import path from 'path';

export type GuardianContact = {
  address: string;
  email: string;
};

type UserGuardianProfile = {
  guardians: GuardianContact[];
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

function isValidEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return Boolean(value) && value.includes('@') && value.includes('.');
}

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function normalizeGuardian(value: unknown): GuardianContact | null {
  if (typeof value === 'string') {
    return {
      address: value.trim(),
      email: '',
    };
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const maybe = value as { address?: unknown; email?: unknown };
  return {
    address: typeof maybe.address === 'string' ? maybe.address.trim() : '',
    email: typeof maybe.email === 'string' ? maybe.email.trim().toLowerCase() : '',
  };
}

function normalizeGuardiansForRead(raw: unknown): GuardianContact[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(normalizeGuardian)
    .filter((item): item is GuardianContact => Boolean(item && item.address));
}

export function validateGuardianContacts(guardians: GuardianContact[]): GuardianContact[] {
  if (guardians.length !== REQUIRED_GUARDIANS) {
    throw new Error(`Exactly ${REQUIRED_GUARDIANS} guardian addresses are required`);
  }

  const normalized = guardians.map((g) => ({
    address: g.address.trim(),
    email: g.email.trim().toLowerCase(),
  }));
  if (normalized.some((g) => !isValidEvmAddress(g.address))) {
    throw new Error('Each guardian must be a valid EVM address');
  }
  if (normalized.some((g) => !isValidEmail(g.email))) {
    throw new Error('Each guardian must have a valid email address');
  }

  const uniqueAddresses = new Set(normalized.map((g) => normalizeAddress(g.address)));
  if (uniqueAddresses.size !== REQUIRED_GUARDIANS) {
    throw new Error('Guardian addresses must be unique');
  }
  const uniqueEmails = new Set(normalized.map((g) => g.email));
  if (uniqueEmails.size !== REQUIRED_GUARDIANS) {
    throw new Error('Guardian emails must be unique');
  }

  return normalized;
}

export async function getUserGuardians(email: string): Promise<UserGuardianProfile | null> {
  const user = normalizeEmail(email);
  if (!user) return null;

  const db = await readFileSafe();
  const profile = db[user];
  if (!profile) return null;

  const normalized = normalizeGuardiansForRead((profile as { guardians?: unknown }).guardians);
  return {
    guardians: normalized,
    updatedAt: profile.updatedAt,
  };
}

export async function saveUserGuardians(
  email: string,
  guardians: GuardianContact[],
): Promise<UserGuardianProfile> {
  const user = normalizeEmail(email);
  if (!user) {
    throw new Error('email is required');
  }

  const valid = validateGuardianContacts(guardians);
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
    validateGuardianContacts(profile.guardians);
    return true;
  } catch {
    return false;
  }
}

export async function getRequiredUserGuardians(email: string): Promise<GuardianContact[]> {
  const profile = await getUserGuardians(email);
  if (!profile) {
    throw new Error('Guardian setup is missing');
  }
  return validateGuardianContacts(profile.guardians);
}
