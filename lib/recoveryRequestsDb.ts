import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'node:crypto';

export type RecoveryDecision = 'approve' | 'reject';
export type RecoveryGuardianStatus = 'pending' | 'approved' | 'rejected';
export type RecoveryRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executed';

export type RecoveryGuardianApproval = {
  address: string;
  email: string;
  challenge: string;
  status: RecoveryGuardianStatus;
  signature?: string;
  decidedAt?: string;
};

export type RecoveryRequestRecord = {
  id: string;
  walletId: string;
  requesterEmail: string;
  reason: string;
  status: RecoveryRequestStatus;
  requiredApprovals: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  guardians: RecoveryGuardianApproval[];
  executedAt?: string;
  executedBy?: string;
  executionTxid?: string;
  executionTransferId?: string;
};

type RecoveryRequestsDb = Record<string, RecoveryRequestRecord>;

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'recoveryRequests.json');
const REQUIRED_APPROVALS = 2;
const DEFAULT_EXPIRY_HOURS = 24;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function randomChallenge(walletId: string, guardianEmail: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  return `RECOVER:${walletId}:${normalizeEmail(guardianEmail)}:${nonce}`;
}

function getExpiryHours(): number {
  const raw = process.env.RECOVERY_REQUEST_EXPIRY_HOURS;
  if (!raw) return DEFAULT_EXPIRY_HOURS;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return DEFAULT_EXPIRY_HOURS;
  return Math.floor(num);
}

function isExpired(record: RecoveryRequestRecord): boolean {
  return record.status !== 'expired' && new Date(record.expiresAt).getTime() < Date.now();
}

function toRecordMap(parsed: unknown): RecoveryRequestsDb {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  const input = parsed as Record<string, unknown>;
  const next: RecoveryRequestsDb = {};
  Object.entries(input).forEach(([key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const record = value as Partial<RecoveryRequestRecord>;
    if (!record.id || !record.walletId || !Array.isArray(record.guardians)) return;
    next[key] = record as RecoveryRequestRecord;
  });
  return next;
}

async function readFileSafe(): Promise<RecoveryRequestsDb> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return toRecordMap(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function writeFileSafe(db: RecoveryRequestsDb): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

async function readAndSyncExpiry(): Promise<RecoveryRequestsDb> {
  const db = await readFileSafe();
  let changed = false;
  Object.values(db).forEach((record) => {
    if (isExpired(record) && record.status === 'pending') {
      record.status = 'expired';
      record.updatedAt = new Date().toISOString();
      changed = true;
    }
  });
  if (changed) await writeFileSafe(db);
  return db;
}

function hasActivePendingRequestForWallet(
  db: RecoveryRequestsDb,
  walletId: string,
): boolean {
  return Object.values(db).some(
    (record) => record.walletId === walletId && record.status === 'pending',
  );
}

export async function createRecoveryRequest(params: {
  walletId: string;
  requesterEmail: string;
  reason: string;
  guardians: Array<{ address: string; email: string }>;
}): Promise<RecoveryRequestRecord> {
  const walletId = params.walletId.trim();
  const requesterEmail = normalizeEmail(params.requesterEmail);
  const reason = params.reason.trim();
  if (!walletId) throw new Error('walletId is required');
  if (!requesterEmail) throw new Error('requesterEmail is required');
  if (!reason) throw new Error('reason is required');
  if (params.guardians.length !== 3) throw new Error('Exactly 3 guardians are required');

  const db = await readAndSyncExpiry();
  if (hasActivePendingRequestForWallet(db, walletId)) {
    throw new Error('A pending recovery request already exists for this wallet');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + getExpiryHours() * 60 * 60 * 1000);
  const id = crypto.randomUUID();
  const guardians: RecoveryGuardianApproval[] = params.guardians.map((g) => ({
    address: g.address,
    email: normalizeEmail(g.email),
    challenge: randomChallenge(walletId, g.email),
    status: 'pending',
  }));

  const record: RecoveryRequestRecord = {
    id,
    walletId,
    requesterEmail,
    reason,
    status: 'pending',
    requiredApprovals: REQUIRED_APPROVALS,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    guardians,
  };

  db[id] = record;
  await writeFileSafe(db);
  return record;
}

export async function getRecoveryRequest(idInput: string): Promise<RecoveryRequestRecord | null> {
  const id = idInput.trim();
  if (!id) return null;
  const db = await readAndSyncExpiry();
  return db[id] ?? null;
}

export async function listRecoveryRequestsForGuardian(
  guardianEmailInput: string,
): Promise<RecoveryRequestRecord[]> {
  const guardianEmail = normalizeEmail(guardianEmailInput);
  if (!guardianEmail) return [];
  const db = await readAndSyncExpiry();
  return Object.values(db)
    .filter((record) =>
      record.guardians.some((g) => normalizeEmail(g.email) === guardianEmail),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRecoveryRequestsForRequester(
  requesterEmailInput: string,
): Promise<RecoveryRequestRecord[]> {
  const requesterEmail = normalizeEmail(requesterEmailInput);
  if (!requesterEmail) return [];
  const db = await readAndSyncExpiry();
  return Object.values(db)
    .filter((record) => normalizeEmail(record.requesterEmail) === requesterEmail)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function recalcStatus(record: RecoveryRequestRecord): RecoveryRequestStatus {
  if (isExpired(record)) {
    return 'expired';
  }
  const approvals = record.guardians.filter((g) => g.status === 'approved').length;
  const rejects = record.guardians.filter((g) => g.status === 'rejected').length;
  if (approvals >= record.requiredApprovals) {
    return 'approved';
  }
  const maxPossibleApprovals = record.guardians.length - rejects;
  if (maxPossibleApprovals < record.requiredApprovals) {
    return 'rejected';
  }
  return 'pending';
}

export async function decideRecoveryRequest(params: {
  requestId: string;
  guardianEmail: string;
  decision: RecoveryDecision;
  signature: string;
}): Promise<RecoveryRequestRecord> {
  const requestId = params.requestId.trim();
  const guardianEmail = normalizeEmail(params.guardianEmail);
  const signature = params.signature.trim();
  if (!requestId) throw new Error('requestId is required');
  if (!guardianEmail) throw new Error('guardianEmail is required');
  if (!signature) throw new Error('signature is required');

  const db = await readAndSyncExpiry();
  const record = db[requestId];
  if (!record) {
    throw new Error('Recovery request not found');
  }
  if (record.status !== 'pending') {
    throw new Error(`Recovery request is already ${record.status}`);
  }

  const guardian = record.guardians.find(
    (g) => normalizeEmail(g.email) === guardianEmail,
  );
  if (!guardian) {
    throw new Error('Only listed guardians can decide this request');
  }
  if (guardian.status !== 'pending') {
    throw new Error('Guardian has already submitted a decision');
  }

  guardian.status = params.decision === 'approve' ? 'approved' : 'rejected';
  guardian.signature = signature;
  guardian.decidedAt = new Date().toISOString();
  record.status = recalcStatus(record);
  record.updatedAt = new Date().toISOString();
  db[requestId] = record;
  await writeFileSafe(db);
  return record;
}

export async function markRecoveryRequestExecuted(params: {
  requestId: string;
  executedBy: string;
  txid?: string;
  transferId?: string;
}): Promise<RecoveryRequestRecord> {
  const requestId = params.requestId.trim();
  const executedBy = normalizeEmail(params.executedBy);
  if (!requestId) throw new Error('requestId is required');
  if (!executedBy) throw new Error('executedBy is required');

  const db = await readAndSyncExpiry();
  const record = db[requestId];
  if (!record) {
    throw new Error('Recovery request not found');
  }
  if (record.status !== 'approved') {
    throw new Error(`Recovery request cannot be executed in status ${record.status}`);
  }

  record.status = 'executed';
  record.executedAt = new Date().toISOString();
  record.executedBy = executedBy;
  record.executionTxid = params.txid?.trim() || undefined;
  record.executionTransferId = params.transferId?.trim() || undefined;
  record.updatedAt = new Date().toISOString();
  db[requestId] = record;
  await writeFileSafe(db);
  return record;
}

