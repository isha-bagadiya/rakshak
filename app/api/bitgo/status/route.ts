import { NextResponse } from 'next/server';
import { getBitGo } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';

export async function GET() {
  try {
    const bitgo = await getBitGo();
    const session = await bitgo.session();

    const env = (process.env.ENV as string | undefined) ?? 'test';

    return NextResponse.json({
      ok: true,
      env,
      user: {
        id: session.user?.id,
        email: session.user?.email?.email,
      },
      enterprises: session.user?.enterprises?.map((e: { id: string; permissions: string[] }) => ({
        id: e.id,
        permissions: e.permissions,
      })),
    });
  } catch (error) {
    const message = toUserMessage(error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
