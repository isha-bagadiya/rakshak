import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { listWalletIdsByOwner } from '@/lib/walletOwnersDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

export async function GET(request: Request) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const coin = (searchParams.get('coin') ?? getDefaultCoin()).trim().toLowerCase();

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin" query. Only Base Ethereum Testnet (tbaseeth) is allowed.' },
        { status: 400 },
      );
    }

    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as { coin(name: string): { wallets(): { list(params?: { limit?: number; skip?: number; prevId?: string }): Promise<{ wallets: unknown[] }> } } }).coin(coin).wallets();
    const result = await walletsApi.list({ limit: 100 });
    const allowedWalletIds = new Set(await listWalletIdsByOwner(identity.email));
    const wallets = (result?.wallets ?? []).filter((wallet) => {
      const walletId =
        typeof wallet === 'object' && wallet !== null && 'id' in wallet
          ? (wallet as { id?: unknown }).id
          : undefined;
      return typeof walletId === 'string' && allowedWalletIds.has(walletId);
    });

    return NextResponse.json({
      wallets,
      coin,
    });
  } catch (error) {
    const message = toUserMessage(error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
