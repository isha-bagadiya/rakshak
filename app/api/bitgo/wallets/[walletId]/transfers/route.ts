import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { isWalletOwnedBy } from '@/lib/walletOwnersDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
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

    const { searchParams } = new URL(request.url);
    const coin = (searchParams.get('coin') ?? getDefaultCoin()).trim().toLowerCase();
    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin" query. Only Arbitrum Testnet (tarbeth) is allowed.' },
        { status: 400 },
      );
    }

    const limitRaw = Number(searchParams.get('limit') ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(50, Math.floor(limitRaw))) : 10;

    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as {
      coin(name: string): {
        wallets(): { get(params: { id: string }): Promise<{ transfers(params: unknown): Promise<unknown> }> };
      };
    }).coin(coin).wallets();
    const wallet = await walletsApi.get({ id });
    const transfersResult = await wallet.transfers({ limit });

    const transfers =
      transfersResult &&
      typeof transfersResult === 'object' &&
      Array.isArray((transfersResult as { transfers?: unknown[] }).transfers)
        ? (transfersResult as { transfers: unknown[] }).transfers
        : [];

    return NextResponse.json({
      walletId: id,
      coin,
      transfers,
    });
  } catch (error) {
    const message = toUserMessage(error);
    const status = (error as { status?: number })?.status;
    return NextResponse.json(
      { error: message },
      { status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500 },
    );
  }
}
