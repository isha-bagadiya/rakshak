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
    return <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">Loading authentication...</main>;
  }

  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Recover Wallet Address</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Sign in to create a recovery request.</p>
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
    <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recover Wallet Address</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      <section className="mb-8 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Wallet ID</label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="Wallet ID"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why recovery is needed"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit recovery request"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}
      </section>

      <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">My recovery requests</h2>
        {loadingRequests && <p className="text-sm text-zinc-500">Loading...</p>}
        {!loadingRequests && requests.length === 0 && (
          <p className="text-sm text-zinc-500">No recovery requests yet.</p>
        )}
        {requests.length > 0 && (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li key={req.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="text-sm">
                  <span className="font-medium">Wallet:</span> {req.walletId}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Status:</span> {req.status}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{req.reason}</p>
                <p className="text-xs text-zinc-500">Created: {req.createdAt}</p>
                <p className="text-xs text-zinc-500">Expires: {req.expiresAt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
