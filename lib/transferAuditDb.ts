import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export type TransferAuditEventType = 'normal_transfer' | 'recovery_transfer';
export type TransferAuditStatus = 'submitted' | 'failed';

export type TransferAuditEvent = {
  id: string;
  eventType: TransferAuditEventType;
  status: TransferAuditStatus;
  walletId: string;
  actorEmail: string;
  coin: string;
  recipientAddress: string;
  amountBaseUnits: string;
  txid?: string;
  transferId?: string;
  requestId?: string;
  note?: string;
  createdAt: string;
  error?: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'transferAudit.json');

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readEventsSafe(): Promise<TransferAuditEvent[]> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is TransferAuditEvent => {
      return Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as { id?: unknown }).id === 'string' &&
          typeof (item as { actorEmail?: unknown }).actorEmail === 'string' &&
          typeof (item as { walletId?: unknown }).walletId === 'string',
      );
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeEventsSafe(events: TransferAuditEvent[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(events, null, 2), 'utf8');
}

export async function appendTransferAuditEvent(
  event: Omit<TransferAuditEvent, 'id' | 'createdAt' | 'actorEmail'> & { actorEmail: string },
): Promise<TransferAuditEvent> {
  const events = await readEventsSafe();
  const next: TransferAuditEvent = {
    ...event,
    id: crypto.randomUUID(),
    actorEmail: normalizeEmail(event.actorEmail),
    createdAt: new Date().toISOString(),
  };
  events.push(next);
  await writeEventsSafe(events);
  return next;
}

export async function listTransferAuditEvents(
  actorEmailInput: string,
  walletIdInput?: string,
): Promise<TransferAuditEvent[]> {
  const actorEmail = normalizeEmail(actorEmailInput);
  const walletId = walletIdInput?.trim() ?? '';
  const events = await readEventsSafe();
  return events
    .filter((event) => {
      if (event.actorEmail !== actorEmail) return false;
      if (walletId && event.walletId !== walletId) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
