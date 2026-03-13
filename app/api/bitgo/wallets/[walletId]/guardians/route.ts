import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import {
  addGuardian,
  listGuardians,
  removeGuardian,
  setThreshold,
} from '@/lib/guardiansDb';

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

async function ensureWalletExists(bitgo: BitGo, coin: string, walletId: string) {
  const wallets = (bitgo as unknown as {
    coin(name: string): {
      wallets(): { get(params: { id: string }): Promise<unknown> };
    };
  }).coin(coin).wallets();

  const wallet = await wallets.get({ id: walletId });
  if (!wallet) {
    throw Object.assign(new Error('Wallet not found'), { status: 404 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  try {
    const { walletId } = await params;
    const id = typeof walletId === 'string' ? walletId.trim() : '';

    if (!id) {
      return NextResponse.json(
        { error: 'Missing or invalid wallet ID in path.' },
        { status: 400 },
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

    const bitgo = await getBitGo();
    await ensureWalletExists(bitgo, coin, id);

    const config = await listGuardians(id);

    return NextResponse.json({
      walletId: id,
      guardians: config.guardians,
      threshold: config.threshold,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  try {
    const { walletId } = await params;
    const id = typeof walletId === 'string' ? walletId.trim() : '';

    if (!id) {
      return NextResponse.json(
        { error: 'Missing or invalid wallet ID in path.' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const coin =
      typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();

    if (!address) {
      return NextResponse.json(
        { error: 'Missing or empty "address" in request body.' },
        { status: 400 },
      );
    }

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin". Only Base Ethereum Testnet (tbaseeth) is allowed.' },
        { status: 400 },
      );
    }

    const bitgo = await getBitGo();
    await ensureWalletExists(bitgo, coin, id);

    const config = await addGuardian(id, address);

    return NextResponse.json({
      walletId: id,
      guardians: config.guardians,
      threshold: config.threshold,
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  try {
    const { walletId } = await params;
    const id = typeof walletId === 'string' ? walletId.trim() : '';

    if (!id) {
      return NextResponse.json(
        { error: 'Missing or invalid wallet ID in path.' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const address = typeof body.address === 'string' ? body.address.trim() : '';
    const coin =
      typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();

    if (!address) {
      return NextResponse.json(
        { error: 'Missing or empty "address" in request body.' },
        { status: 400 },
      );
    }

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin". Only Base Ethereum Testnet (tbaseeth) is allowed.' },
        { status: 400 },
      );
    }

    const bitgo = await getBitGo();
    await ensureWalletExists(bitgo, coin, id);

    const config = await removeGuardian(id, address);

    return NextResponse.json({
      walletId: id,
      guardians: config.guardians,
      threshold: config.threshold,
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> },
) {
  try {
    const { walletId } = await params;
    const id = typeof walletId === 'string' ? walletId.trim() : '';

    if (!id) {
      return NextResponse.json(
        { error: 'Missing or invalid wallet ID in path.' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const threshold = Number.isFinite(body.threshold)
      ? (body.threshold as number)
      : Number(body.threshold);
    const coin =
      typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();

    if (!Number.isFinite(threshold)) {
      return NextResponse.json(
        { error: 'Missing or invalid "threshold" in request body.' },
        { status: 400 },
      );
    }

    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: 'Invalid "coin". Only Base Ethereum Testnet (tbaseeth) is allowed.' },
        { status: 400 },
      );
    }

    const bitgo = await getBitGo();
    await ensureWalletExists(bitgo, coin, id);

    const config = await setThreshold(id, Math.trunc(threshold));

    return NextResponse.json({
      walletId: id,
      guardians: config.guardians,
      threshold: config.threshold,
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

