import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { listWalletIdsByOwner } from '@/lib/walletOwnersDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

type WalletListResult = {
  wallets?: unknown[];
  nextBatchPrevId?: string;
};

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
        { error: 'Invalid "coin" query. Only Arbitrum Testnet (tarbeth) is allowed.' },
        { status: 400 },
      );
    }

    const allowedWalletIds = new Set(await listWalletIdsByOwner(identity.email));
    if (allowedWalletIds.size === 0) {
      return NextResponse.json({ wallets: [], coin });
    }

    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as {
      coin(name: string): {
        wallets(): {
          list(params?: { limit?: number; skip?: number; prevId?: string }): Promise<WalletListResult>;
        };
      };
    }).coin(coin).wallets();

    const allWallets: unknown[] = [];
    const seenWalletIds = new Set<string>();
    let prevId: string | undefined;

    for (let page = 0; page < 25; page += 1) {
      const result = await walletsApi.list({ limit: 100, ...(prevId ? { prevId } : {}) });
      const pageWallets = result?.wallets ?? [];

      if (pageWallets.length === 0) {
        break;
      }

      for (const wallet of pageWallets) {
        const walletId =
          typeof wallet === 'object' && wallet !== null && 'id' in wallet
            ? (wallet as { id?: unknown }).id
            : undefined;

        if (typeof walletId !== 'string') {
          continue;
        }

        if (seenWalletIds.has(walletId)) {
          continue;
        }

        seenWalletIds.add(walletId);
        allWallets.push(wallet);
      }

      prevId = typeof result?.nextBatchPrevId === 'string' ? result.nextBatchPrevId : undefined;
      if (!prevId) {
        break;
      }
    }

    const wallets = allWallets.filter((wallet) => {
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
