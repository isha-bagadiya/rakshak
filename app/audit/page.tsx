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
      const query = walletId.trim() ? `?walletId=${encodeURIComponent(walletId.trim())}` : "";
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
    return (
      <main className="min-h-screen bg-black text-[#EBDDF7] selection:bg-[rgb(122_27_122)]">
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
          <div className="rounded-2xl border border-[rgb(122_27_122_/_0.45)] bg-[rgb(65_8_65_/_0.3)] p-6 text-sm">
            Loading authentication...
          </div>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-black text-[#EBDDF7] selection:bg-[rgb(122_27_122)]">
        <div
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
          <section className="rounded-2xl border border-[rgb(122_27_122_/_0.55)] bg-[linear-gradient(160deg,rgba(65,8,65,0.55),rgba(10,10,10,0.9))] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D6BCE5]/75">Audit</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Audit Timeline</h1>
            <p className="mt-3 max-w-xl text-sm text-[#C6B2D6]">Sign in to view transfer audit logs.</p>
            <button
              type="button"
              onClick={login}
              className="mt-6 rounded-md border border-[rgb(122_27_122_/_0.65)] bg-[rgb(122_27_122)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[rgb(101_19_101)]"
            >
              Sign In
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-[#EBDDF7] selection:bg-[rgb(122_27_122)]">
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 md:px-8 lg:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D6BCE5]/75">Audit</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Audit Timeline</h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
            <Link
              href="/demo-flow"
              className="rounded-md border border-[rgb(122_27_122_/_0.55)] bg-[rgb(65_8_65_/_0.35)] px-3 py-2 text-[#EBDDF7] transition-colors hover:bg-[rgb(122_27_122_/_0.22)]"
            >
              Demo Flow
            </Link>
            <Link
              href="/"
              className="rounded-md border border-[rgb(122_27_122_/_0.55)] bg-[rgb(65_8_65_/_0.35)] px-3 py-2 text-[#EBDDF7] transition-colors hover:bg-[rgb(122_27_122_/_0.22)]"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-[rgb(122_27_122_/_0.55)] bg-[linear-gradient(160deg,rgba(65,8,65,0.55),rgba(10,10,10,0.92))] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Wallet ID (Optional)</label>
              <input
                type="text"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                placeholder="Filter by wallet ID"
                className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
              />
            </div>
            <button
              type="button"
              onClick={loadEvents}
              disabled={loading}
              className="rounded-md border border-[rgb(122_27_122_/_0.65)] bg-[rgb(122_27_122)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors disabled:opacity-50 hover:bg-[rgb(101_19_101)]"
            >
              {loading ? "Loading..." : "Load Events"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
        </section>

        <section className="rounded-2xl border border-[rgb(122_27_122_/_0.55)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.3)] sm:p-7">
          {events.length === 0 && !loading && <p className="text-sm text-[#D6BCE5]/75">No audit events yet.</p>}
          {events.length > 0 && (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-black/30 p-4">
                  <p className="text-sm"><span className="text-[#C6B2D6]">Type:</span> {event.eventType}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Status:</span> {event.status}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Wallet:</span> {event.walletId}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Recipient:</span> {event.recipientAddress}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Amount:</span> {event.amountBaseUnits}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">TxID:</span> {event.txid ?? "n/a"}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Recovery Request:</span> {event.requestId ?? "n/a"}</p>
                  {event.error && <p className="text-sm text-rose-300">{event.error}</p>}
                  <p className="mt-1 text-xs text-[#D6BCE5]/75">{event.createdAt}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
