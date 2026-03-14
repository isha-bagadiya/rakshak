import crypto from 'node:crypto';

type EncryptedBackupKey = {
  ciphertext: string;
  iv: string;
  authTag: string;
  alg: 'aes-256-gcm';
  keyVersion: string;
};

const KEY_VERSION = 'v1';

function getEncryptionKey(): Buffer {
  const secret = process.env.BACKUP_KEY_ENCRYPTION_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('BACKUP_KEY_ENCRYPTION_SECRET is not set in environment.');
  }
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

export function encryptBackupPrivateKey(plainText: string): EncryptedBackupKey {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    alg: 'aes-256-gcm',
    keyVersion: KEY_VERSION,
  };
}

export function decryptBackupPrivateKey(payload: EncryptedBackupKey): string {
  if (payload.alg !== 'aes-256-gcm') {
    throw new Error('Unsupported backup key encryption algorithm.');
  }
  if (payload.keyVersion !== KEY_VERSION) {
    throw new Error('Unsupported backup key version.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, 'base64');
  const authTag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

