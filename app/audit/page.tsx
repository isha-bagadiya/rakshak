"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type AuditEvent = {
  id: string;
  eventType: "normal_transfer" | "recovery_transfer";
  status: "submitted" | "failed";
  walletId: string;
  actorEmail: string;
  coin: string;
  recipientAddress: string;
  amountBaseUnits: string;
  txid?: string;
  transferId?: string;
  requestId?: string;
  note?: string;
  error?: string;
  createdAt: string;
};

export default function AuditPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (currentUserEmail) headers["x-user-email"] = currentUserEmail;
    return headers;
  }, [currentUserEmail]);

  const [walletId, setWalletId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);

  async function loadEvents() {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const query = walletId.trim()
        ? `?walletId=${encodeURIComponent(walletId.trim())}`
        : "";
      const res = await fetch(`/api/audit-events${query}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setEvents(Array.isArray(data?.events) ? (data.events as AuditEvent[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <main className="mx-auto max-w-4xl px-4 py-10">Loading authentication...</main>;
  }
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Audit Timeline</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Sign in to view transfer audit logs.</p>
        <button
          type="button"
          onClick={login}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit Timeline</h1>
        <div className="flex items-center gap-3">
          <Link href="/demo-flow" className="text-sm text-blue-600 hover:underline">
            Demo flow
          </Link>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>

      <section className="mb-6 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Wallet ID (optional)</label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="Filter by wallet ID"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load events"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {events.length === 0 && !loading && (
          <p className="text-sm text-zinc-500">No audit events yet.</p>
        )}
        {events.length > 0 && (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="text-sm"><span className="font-medium">Type:</span> {event.eventType}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {event.status}</p>
                <p className="text-sm"><span className="font-medium">Wallet:</span> {event.walletId}</p>
                <p className="text-sm"><span className="font-medium">Recipient:</span> {event.recipientAddress}</p>
                <p className="text-sm"><span className="font-medium">Amount:</span> {event.amountBaseUnits}</p>
                <p className="text-sm"><span className="font-medium">TxID:</span> {event.txid ?? "n/a"}</p>
                <p className="text-sm"><span className="font-medium">Recovery Request:</span> {event.requestId ?? "n/a"}</p>
                {event.error && <p className="text-sm text-red-600">{event.error}</p>}
                <p className="text-xs text-zinc-500">{event.createdAt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
