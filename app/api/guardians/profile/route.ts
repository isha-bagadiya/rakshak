import { NextResponse } from 'next/server';
import { getRequestIdentity } from '@/lib/requestIdentity';
import {
  getUserGuardians,
  hasRequiredUserGuardians,
  saveUserGuardians,
  type GuardianContact,
} from '@/lib/userGuardiansDb';
import { parseAddressOrEns } from '@/lib/ens';

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
    const completed = await hasRequiredUserGuardians(identity.email);
    return NextResponse.json({
      guardians: profile?.guardians ?? [],
      updatedAt: profile?.updatedAt ?? null,
      completed,
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
    const guardiansRaw: unknown[] = Array.isArray(body.guardians) ? body.guardians : [];
    const guardiansResolved = await Promise.all(
      guardiansRaw.map(async (value: unknown): Promise<GuardianContact | null> => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return null;
        }
        const maybe = value as { address?: unknown; addressOrEns?: unknown; email?: unknown };
        const addressOrEns =
          typeof maybe.addressOrEns === 'string'
            ? maybe.addressOrEns.trim()
            : typeof maybe.address === 'string'
              ? maybe.address.trim()
              : '';
        const email = typeof maybe.email === 'string' ? maybe.email.trim().toLowerCase() : '';
        if (!addressOrEns || !email) return null;

        const parsed = await parseAddressOrEns(addressOrEns);
        if (!parsed) {
          throw new Error(`Invalid guardian address/ENS: ${addressOrEns}`);
        }
        return {
          address: parsed.address,
          email,
          ensName: parsed.ensName,
        };
      }),
    );
    const guardians = guardiansResolved.filter((value): value is GuardianContact => Boolean(value));

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
