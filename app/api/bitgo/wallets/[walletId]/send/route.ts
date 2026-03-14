import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { isWalletOwnedBy } from '@/lib/walletOwnersDb';
import { appendTransferAuditEvent } from '@/lib/transferAuditDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

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
  { params }: { params: Promise<{ walletId: string }> },
) {
  let auditContext: {
    actorEmail: string;
    walletId: string;
    coin: string;
    recipientAddress: string;
    amountBaseUnits: string;
    note?: string;
  } | null = null;

  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }

    const { walletId } = await params;
    const id = typeof walletId === 'string' ? walletId.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Missing or invalid wallet ID in path.' }, { status: 400 });
    }

    const allowedOwner = await isWalletOwnedBy(id, identity.email);
    if (!allowedOwner) {
      return NextResponse.json(
        { error: 'Forbidden. This wallet does not belong to the signed-in user.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const coin =
      typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();
    const recipientAddress =
      typeof body.recipientAddress === 'string' ? body.recipientAddress.trim() : '';
    const amountBaseUnits =
      typeof body.amountBaseUnits === 'string' ? body.amountBaseUnits.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin". Only Arbitrum Testnet (tarbeth) is allowed.' },
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

    const walletPassphrase = process.env.WALLET_PASSPHRASE;
    if (!walletPassphrase) {
      return NextResponse.json(
        { error: 'WALLET_PASSPHRASE is not set in environment.' },
        { status: 500 },
      );
    }

    auditContext = {
      actorEmail: identity.email,
      walletId: id,
      coin,
      recipientAddress,
      amountBaseUnits,
      note: note || undefined,
    };

    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as {
      coin(name: string): {
        wallets(): {
          get(params: { id: string }): Promise<{ sendMany(params: unknown): Promise<unknown> }>;
        };
      };
    }).coin(coin).wallets();
    const wallet = await walletsApi.get({ id });
    const sendResult = await wallet.sendMany({
      recipients: [
        {
          address: recipientAddress,
          amount: amountBaseUnits,
        },
      ],
      walletPassphrase,
      comment: note || undefined,
    });
    const metadata = pickTxMetadata(sendResult);

    await appendTransferAuditEvent({
      eventType: 'normal_transfer',
      status: 'submitted',
      actorEmail: identity.email,
      walletId: id,
      coin,
      recipientAddress,
      amountBaseUnits,
      txid: metadata.txid,
      transferId: metadata.transferId,
      note: note || undefined,
    });

    return NextResponse.json({
      walletId: id,
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
        eventType: 'normal_transfer',
        status: 'failed',
        actorEmail: auditContext.actorEmail,
        walletId: auditContext.walletId,
        coin: auditContext.coin,
        recipientAddress: auditContext.recipientAddress,
        amountBaseUnits: auditContext.amountBaseUnits,
        note: auditContext.note,
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
