import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { isWalletOwnedBy } from '@/lib/walletOwnersDb';
import { consumeKeyExportRecord } from '@/lib/keyExportDb';

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

    const exported = await consumeKeyExportRecord(id, identity.email);

    return NextResponse.json({
      walletId: id,
      exportedAt: new Date().toISOString(),
      userKeychain: exported.payload.userKeychain,
      _warning:
        'This user key export is one-time only and has now been consumed. Store it in a secure vault immediately.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export keys';
    const status = message.includes('Forbidden') ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
