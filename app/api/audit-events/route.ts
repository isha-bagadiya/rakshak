import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { listTransferAuditEvents } from '@/lib/transferAuditDb';

export async function GET(request: Request) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const walletId = (searchParams.get('walletId') ?? '').trim();

    const events = await listTransferAuditEvents(identity.email, walletId || undefined);

    return NextResponse.json({
      events,
      walletId: walletId || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list audit events';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
