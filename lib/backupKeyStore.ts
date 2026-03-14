import { getMongoDb } from '@/lib/mongodb';

export type BackupKeyRecord = {
  walletId: string;
  ownerEmail: string;
  coin: string;
  backupKeychain: {
    id: string;
    pub: string;
    encryptedPrv: string;
  };
  encryptedBackupPrv: {
    ciphertext: string;
    iv: string;
    authTag: string;
    alg: 'aes-256-gcm';
    keyVersion: string;
  };
  guardians: Array<{ address: string; email: string; ensName?: string }>;
  receiverAddress: string;
  receiverEnsName?: string;
  createdAt: string;
};

type StoreBackupKeyParams = {
  walletId: string;
  ownerEmail: string;
  coin: string;
  backupKeychainId: string;
  backupPub: string;
  backupEncryptedPrv: string;
  encryptedBackupPrv: {
    ciphertext: string;
    iv: string;
    authTag: string;
    alg: 'aes-256-gcm';
    keyVersion: string;
  };
  guardians: Array<{ address: string; email: string; ensName?: string }>;
  receiverAddress: string;
  receiverEnsName?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeWalletId(walletId: string): string {
  return walletId.trim();
}

export async function storeBackupKeyRecord(params: StoreBackupKeyParams): Promise<string | null> {
  const walletId = normalizeWalletId(params.walletId);
  if (!walletId) {
    throw new Error('walletId is required');
  }
  if (!params.receiverAddress.trim()) {
    throw new Error('receiverAddress is required');
  }
  if (!params.guardians.length) {
    throw new Error('guardians are required');
  }

  const db = await getMongoDb();
  const result = await db.collection('backupKeys').insertOne({
    walletId,
    ownerEmail: normalizeEmail(params.ownerEmail),
    coin: params.coin,
    backupKeychain: {
      id: params.backupKeychainId,
      pub: params.backupPub,
      encryptedPrv: params.backupEncryptedPrv,
    },
    encryptedBackupPrv: params.encryptedBackupPrv,
    guardians: params.guardians,
    receiverAddress: params.receiverAddress.trim(),
    receiverEnsName: params.receiverEnsName?.trim().toLowerCase() || undefined,
    createdAt: new Date().toISOString(),
  });
  return result.insertedId.toString();
}

export async function getBackupKeyRecordByWallet(
  walletIdInput: string,
  ownerEmailInput: string,
): Promise<BackupKeyRecord | null> {
  const walletId = normalizeWalletId(walletIdInput);
  const ownerEmail = normalizeEmail(ownerEmailInput);
  if (!walletId || !ownerEmail) {
    return null;
  }

  const db = await getMongoDb();
  const record = await db.collection<BackupKeyRecord>('backupKeys').findOne({
    walletId,
    ownerEmail,
  });

  return record ?? null;
}
