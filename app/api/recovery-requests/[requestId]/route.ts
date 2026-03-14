import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { getRecoveryRequest } from '@/lib/recoveryRequestsDb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const { requestId } = await params;
    const id = typeof requestId === 'string' ? requestId.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Invalid request ID.' }, { status: 400 });
    }

    const record = await getRecoveryRequest(id);
    if (!record) {
      return NextResponse.json({ error: 'Recovery request not found.' }, { status: 404 });
    }

    const normalizedEmail = identity.email.trim().toLowerCase();
    const isRequester = record.requesterEmail.trim().toLowerCase() === normalizedEmail;
    const isGuardian = record.guardians.some(
      (g) => g.email.trim().toLowerCase() === normalizedEmail,
    );
    if (!isRequester && !isGuardian) {
      return NextResponse.json(
        { error: 'Forbidden. You are not part of this recovery request.' },
        { status: 403 },
      );
    }

    return NextResponse.json({ request: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load recovery request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

