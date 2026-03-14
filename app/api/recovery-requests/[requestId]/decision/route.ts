import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { decideRecoveryRequest } from '@/lib/recoveryRequestsDb';
import { sendRecoveryOutcomeEmails } from '@/lib/recoveryEmails';

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const decision = body.decision === 'approve' ? 'approve' : body.decision === 'reject' ? 'reject' : null;
    const signature = typeof body.signature === 'string' ? body.signature.trim() : '';

    if (!decision) {
      return NextResponse.json(
        { error: 'decision must be "approve" or "reject".' },
        { status: 400 },
      );
    }
    if (!signature) {
      return NextResponse.json(
        { error: 'signature is required to approve/reject.' },
        { status: 400 },
      );
    }

    const updated = await decideRecoveryRequest({
      requestId: id,
      guardianEmail: identity.email,
      decision,
      signature,
    });

    let notifications: unknown = null;
    if (updated.status === 'approved' || updated.status === 'rejected' || updated.status === 'expired') {
      notifications = await sendRecoveryOutcomeEmails(updated);
    }

    return NextResponse.json({
      request: updated,
      notifications,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit decision';
    const isForbidden = message.toLowerCase().includes('only listed guardians');
    return NextResponse.json({ error: message }, { status: isForbidden ? 403 : 400 });
  }
}

