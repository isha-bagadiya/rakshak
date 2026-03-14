import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { isWalletOwnedBy } from '@/lib/walletOwnersDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const { walletId } = await params;
    const id = typeof walletId === 'string' ? walletId.trim() : '';

    if (!id) {
      return NextResponse.json(
        { error: 'Missing or invalid wallet ID in path.' },
        { status: 400 },
      );
    }

    const isAllowedOwner = await isWalletOwnedBy(id, identity.email);
    if (!isAllowedOwner) {
      return NextResponse.json(
        { error: 'Forbidden. This wallet does not belong to the signed-in user.' },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const coin =
      typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin". Only Arbitrum Testnet (tarbeth) is allowed.' },
        { status: 400 },
      );
    }

    const bitgo: BitGo = await getBitGo();
    const wallets = (bitgo as unknown as { coin(name: string): { wallets(): { get(params: { id: string }): Promise<{ createAddress(): Promise<unknown> }> } } }).coin(coin).wallets();
    const wallet = await wallets.get({ id });

    if (!wallet || typeof (wallet as { createAddress?: unknown }).createAddress !== 'function') {
      return NextResponse.json(
        { error: 'Wallet not found or invalid.' },
        { status: 404 },
      );
    }

    const address = await (wallet as { createAddress(): Promise<unknown> }).createAddress();

    return NextResponse.json(
      typeof address === 'object' && address !== null ? address : { address },
    );
  } catch (error) {
    const message = toUserMessage(error);
    const status = (error as { status?: number })?.status;
    return NextResponse.json(
      { error: message },
      { status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500 },
    );
  }
}


