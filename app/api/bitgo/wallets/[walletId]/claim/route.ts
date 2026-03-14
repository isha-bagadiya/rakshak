import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { setWalletOwner } from '@/lib/walletOwnersDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const coin =
      typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();
    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin". Only Arbitrum Testnet (tarbeth) is allowed.' },
        { status: 400 },
      );
    }

    // Validate wallet exists and is accessible with current BitGo token.
    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as {
      coin(name: string): {
        wallets(): { get(params: { id: string }): Promise<unknown> };
      };
    }).coin(coin).wallets();
    await walletsApi.get({ id });

    await setWalletOwner(id, identity.email);

    return NextResponse.json({
      ok: true,
      walletId: id,
      ownerEmail: identity.email,
      coin,
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
