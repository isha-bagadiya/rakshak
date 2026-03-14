import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { isWalletOwnedBy } from '@/lib/walletOwnersDb';
import { getRequiredUserGuardians } from '@/lib/userGuardiansDb';
import {
  createRecoveryRequest,
  listRecoveryRequestsForGuardian,
  listRecoveryRequestsForRequester,
} from '@/lib/recoveryRequestsDb';
import { sendGuardianRecoveryRequestEmails } from '@/lib/recoveryEmails';

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
    const role = (searchParams.get('role') ?? 'requester').trim().toLowerCase();

    if (role === 'guardian') {
      const requests = await listRecoveryRequestsForGuardian(identity.email);
      return NextResponse.json({ requests, role });
    }

    const requests = await listRecoveryRequestsForRequester(identity.email);
    return NextResponse.json({ requests, role: 'requester' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list recovery requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const walletId = typeof body.walletId === 'string' ? body.walletId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    const allowedOwner = await isWalletOwnedBy(walletId, identity.email);
    if (!allowedOwner) {
      return NextResponse.json(
        { error: 'Forbidden. This wallet does not belong to the signed-in user.' },
        { status: 403 },
      );
    }

    const guardians = await getRequiredUserGuardians(identity.email);
    const recoveryRequest = await createRecoveryRequest({
      walletId,
      requesterEmail: identity.email,
      reason,
      guardians,
    });

    const emailResult = await sendGuardianRecoveryRequestEmails(recoveryRequest);

    return NextResponse.json({
      request: recoveryRequest,
      notifications: emailResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create recovery request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

