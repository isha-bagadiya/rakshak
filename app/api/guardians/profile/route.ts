import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { getUserGuardians, saveUserGuardians } from '@/lib/userGuardiansDb';

export async function GET(request: Request) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const profile = await getUserGuardians(identity.email);
    return NextResponse.json({
      guardians: profile?.guardians ?? [],
      updatedAt: profile?.updatedAt ?? null,
      completed: (profile?.guardians?.length ?? 0) === 3,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load guardian profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const guardiansRaw = Array.isArray(body.guardians) ? body.guardians : [];
    const guardians = guardiansRaw
      .map((value: unknown) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);

    const profile = await saveUserGuardians(identity.email, guardians);
    return NextResponse.json({
      guardians: profile.guardians,
      updatedAt: profile.updatedAt,
      completed: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save guardian profile';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

