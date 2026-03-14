import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { getRecoveryRequest, markRecoveryRequestExecuted } from '@/lib/recoveryRequestsDb';
import { getBackupKeyRecordByWallet } from '@/lib/backupKeyStore';
import { decryptBackupPrivateKey } from '@/lib/backupKeyCrypto';
import { getBitGo, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { isWalletOwnedBy } from '@/lib/walletOwnersDb';
import { appendTransferAuditEvent } from '@/lib/transferAuditDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function isPositiveIntegerString(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

function pickTxMetadata(result: unknown): { txid?: string; transferId?: string } {
  if (!result || typeof result !== 'object') return {};
  const base = result as {
    txid?: unknown;
    transfer?: { id?: unknown };
    transferId?: unknown;
  };

  const txid = typeof base.txid === 'string' ? base.txid : undefined;
  const transferId =
    typeof base.transferId === 'string'
      ? base.transferId
      : typeof base.transfer?.id === 'string'
        ? base.transfer.id
        : undefined;
  return { txid, transferId };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  let auditContext: {
    actorEmail: string;
    walletId: string;
    coin: string;
    recipientAddress: string;
    amountBaseUnits: string;
    requestId: string;
  } | null = null;

  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }

    const { requestId } = await params;
    const id = typeof requestId === 'string' ? requestId.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Invalid request ID.' }, { status: 400 });
    }

    const recovery = await getRecoveryRequest(id);
    if (!recovery) {
      return NextResponse.json({ error: 'Recovery request not found.' }, { status: 404 });
    }

    if (normalizeEmail(recovery.requesterEmail) !== normalizeEmail(identity.email)) {
      return NextResponse.json(
        { error: 'Forbidden. Only the requester can execute this recovery transfer.' },
        { status: 403 },
      );
    }
    if (recovery.status !== 'approved') {
      return NextResponse.json(
        { error: `Recovery request must be approved before execution. Current status: ${recovery.status}` },
        { status: 400 },
      );
    }

    const allowedOwner = await isWalletOwnedBy(recovery.walletId, identity.email);
    if (!allowedOwner) {
      return NextResponse.json(
        { error: 'Forbidden. This wallet does not belong to the signed-in user.' },
        { status: 403 },
      );
    }

    const backupRecord = await getBackupKeyRecordByWallet(recovery.walletId, identity.email);
    if (!backupRecord) {
      return NextResponse.json(
        { error: 'Backup key record not found for this wallet.' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const amountBaseUnits =
      typeof body.amountBaseUnits === 'string' ? body.amountBaseUnits.trim() : '';
    const recipientAddressInput =
      typeof body.recipientAddress === 'string' ? body.recipientAddress.trim() : '';
    const recipientAddress = recipientAddressInput || backupRecord.receiverAddress;
    const coin = backupRecord.coin.trim().toLowerCase();

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Stored wallet coin is not supported by this app.' },
        { status: 400 },
      );
    }
    if (!isValidEvmAddress(recipientAddress)) {
      return NextResponse.json(
        { error: 'Invalid recipientAddress. Must be a valid EVM address.' },
        { status: 400 },
      );
    }
    if (!isPositiveIntegerString(amountBaseUnits)) {
      return NextResponse.json(
        { error: 'amountBaseUnits must be a positive integer string.' },
        { status: 400 },
      );
    }

    auditContext = {
      actorEmail: identity.email,
      walletId: recovery.walletId,
      coin,
      recipientAddress,
      amountBaseUnits,
      requestId: recovery.id,
    };

    const backupPrv = decryptBackupPrivateKey(backupRecord.encryptedBackupPrv);

    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as {
      coin(name: string): {
        wallets(): { get(params: { id: string }): Promise<{ sendMany(params: unknown): Promise<unknown> }> };
      };
    }).coin(coin).wallets();
    const wallet = await walletsApi.get({ id: recovery.walletId });
    const sendResult = await wallet.sendMany({
      recipients: [
        {
          address: recipientAddress,
          amount: amountBaseUnits,
        },
      ],
      prv: backupPrv,
      comment: `Recovery execution for request ${recovery.id}`,
    });
    const metadata = pickTxMetadata(sendResult);
    const updatedRecovery = await markRecoveryRequestExecuted({
      requestId: recovery.id,
      executedBy: identity.email,
      txid: metadata.txid,
      transferId: metadata.transferId,
    });

    await appendTransferAuditEvent({
      eventType: 'recovery_transfer',
      status: 'submitted',
      actorEmail: identity.email,
      walletId: recovery.walletId,
      coin,
      recipientAddress,
      amountBaseUnits,
      txid: metadata.txid,
      transferId: metadata.transferId,
      requestId: recovery.id,
      note: 'backup_key_plus_bitgo',
    });

    return NextResponse.json({
      requestId: recovery.id,
      walletId: recovery.walletId,
      requestStatus: updatedRecovery.status,
      coin,
      recipientAddress,
      amountBaseUnits,
      txid: metadata.txid ?? null,
      transferId: metadata.transferId ?? null,
      result: sendResult,
    });
  } catch (error) {
    if (auditContext) {
      await appendTransferAuditEvent({
        eventType: 'recovery_transfer',
        status: 'failed',
        actorEmail: auditContext.actorEmail,
        walletId: auditContext.walletId,
        coin: auditContext.coin,
        recipientAddress: auditContext.recipientAddress,
        amountBaseUnits: auditContext.amountBaseUnits,
        requestId: auditContext.requestId,
        note: 'backup_key_plus_bitgo',
        error: toUserMessage(error),
      });
    }

    const message = toUserMessage(error);
    const status = (error as { status?: number })?.status;
    return NextResponse.json(
      { error: message },
      { status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500 },
    );
  }
}
