"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type RecoveryRequestItem = {
  id: string;
  walletId: string;
  reason: string;
  status: string;
  createdAt: string;
  expiresAt: string;
};

export default function GuardianRequestsPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (currentUserEmail) headers["x-user-email"] = currentUserEmail;
    return headers;
  }, [currentUserEmail]);

  const [requests, setRequests] = useState<RecoveryRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/recovery-requests?role=guardian", {
      headers: authHeaders,
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (data?.error) {
          setError(data.error);
          return;
        }
        setRequests(Array.isArray(data?.requests) ? data.requests : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load requests"))
      .finally(() => setLoading(false));
  }, [authenticated, authHeaders]);

  if (!ready) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">Loading authentication...</main>;
  }
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Guardian Requests</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Sign in to review recovery requests.</p>
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
        <h1 className="text-2xl font-semibold">Guardian Requests</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Back to Dashboard
        </Link>
      </div>

      <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {loading && <p className="text-sm text-zinc-500">Loading requests...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && requests.length === 0 && (
          <p className="text-sm text-zinc-500">No guardian requests yet.</p>
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
                <p className="text-xs text-zinc-500">Expires: {req.expiresAt}</p>
                <Link
                  href={`/guardian/requests/${req.id}`}
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Review and decide
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
