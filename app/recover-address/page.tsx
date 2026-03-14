"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type RecoveryGuardian = {
  address: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  decidedAt?: string;
};

type RecoveryRequest = {
  id: string;
  walletId: string;
  reason: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  guardians: RecoveryGuardian[];
};

export default function RecoverAddressPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (currentUserEmail) headers["x-user-email"] = currentUserEmail;
    return headers;
  }, [currentUserEmail]);

  const [walletId, setWalletId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  async function loadRequests() {
    if (!authenticated) return;
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/recovery-requests?role=requester", {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRequests(Array.isArray(data?.requests) ? data.requests : []);
      }
    } finally {
      setLoadingRequests(false);
    }
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, currentUserEmail]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!walletId.trim()) {
      setError("Wallet ID is required.");
      return;
    }
    if (!reason.trim()) {
      setError("Reason is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/recovery-requests", {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletId: walletId.trim(),
          reason: reason.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setSuccess("Recovery request created and sent to guardians.");
      setReason("");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-[#EBDDF7]">
        <div className="mx-auto max-w-5xl rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[rgb(10_10_10_/_0.75)] p-6 text-sm text-[#BDA9CC]">
          Loading authentication...
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-[#EBDDF7]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[rgb(122_27_122_/_0.2)] blur-3xl" />

        <section className="relative z-10 mx-auto max-w-5xl rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#BDA9CC]">Recovery Workflow</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Recover Wallet Address</h1>
          <p className="mt-3 text-sm text-[#BDA9CC]">Sign in to create a recovery request.</p>
          <button
            type="button"
            onClick={login}
            className="mt-5 rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)]"
          >
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-[#EBDDF7]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[rgb(122_27_122_/_0.2)] blur-3xl" />

      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-[rgb(122_27_122_/_0.35)] pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#BDA9CC]">Recovery Workflow</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Recover Wallet Address</h1>
          </div>
          <Link href="/" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Back to Dashboard
          </Link>
        </div>

        <section className="mb-8 rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-[#BDA9CC]">Wallet ID</label>
              <input
                type="text"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                placeholder="Wallet ID"
                className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-[#BDA9CC]">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why recovery is needed"
                className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit recovery request"}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-[#FF8CA9]">{error}</p>}
          {success && <p className="mt-3 text-sm text-[#6FE6B4]">{success}</p>}
        </section>

        <section className="rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-[#D6BCE5]">My recovery requests</h2>
          {loadingRequests && <p className="text-sm text-[#BDA9CC]">Loading...</p>}
          {!loadingRequests && requests.length === 0 && (
            <p className="text-sm text-[#BDA9CC]">No recovery requests yet.</p>
          )}
          {requests.length > 0 && (
            <ul className="space-y-3">
              {requests.map((req) => (
                <li key={req.id} className="rounded-lg border border-[rgb(122_27_122_/_0.4)] bg-[rgb(10_10_10_/_0.65)] p-4">
                  <p className="text-sm text-[#D6BCE5]">
                    <span className="font-medium text-[#F3E9FA]">Wallet:</span> {req.walletId}
                  </p>
                  <p className="text-sm text-[#D6BCE5]">
                    <span className="font-medium text-[#F3E9FA]">Status:</span> {req.status}
                  </p>
                  <p className="mt-1 text-sm text-[#BDA9CC]">{req.reason}</p>
                  <p className="mt-1 text-xs text-[#BDA9CC]">Created: {req.createdAt}</p>
                  <p className="text-xs text-[#BDA9CC]">Expires: {req.expiresAt}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
