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

    const bitgo: BitGo = await getBitGo();
    const walletsApi = (bitgo as unknown as {
      coin(name: string): {
        wallets(): { get(params: { id: string }): Promise<{ refresh(): Promise<unknown>; maximumSpendable(): Promise<unknown> }> };
      };
    }).coin(coin).wallets();
    const wallet = await walletsApi.get({ id });
    const refreshed = await wallet.refresh();

    let maximumSpendable: string | null = null;
    try {
      const max = (await wallet.maximumSpendable()) as { maximumSpendable?: unknown };
      maximumSpendable =
        typeof max.maximumSpendable === 'string' || typeof max.maximumSpendable === 'number'
          ? String(max.maximumSpendable)
          : null;
    } catch {
      maximumSpendable = null;
    }

    const obj = refreshed as {
      label?: () => string;
      receiveAddress?: () => string | undefined;
      balanceString?: () => string;
      confirmedBalanceString?: () => string;
      spendableBalanceString?: () => string;
    };

    return NextResponse.json({
      walletId: id,
      coin,
      label: typeof obj.label === 'function' ? obj.label() : null,
      receiveAddress: typeof obj.receiveAddress === 'function' ? obj.receiveAddress() ?? null : null,
      balanceString: typeof obj.balanceString === 'function' ? obj.balanceString() : null,
      confirmedBalanceString:
        typeof obj.confirmedBalanceString === 'function' ? obj.confirmedBalanceString() : null,
      spendableBalanceString:
        typeof obj.spendableBalanceString === 'function' ? obj.spendableBalanceString() : null,
      maximumSpendable,
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
