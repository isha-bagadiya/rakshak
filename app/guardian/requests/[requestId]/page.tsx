"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

type RecoveryGuardian = {
  address: string;
  email: string;
  challenge: string;
  status: "pending" | "approved" | "rejected";
  decidedAt?: string;
};

type RecoveryRequest = {
  id: string;
  walletId: string;
  reason: string;
  status: string;
  requesterEmail: string;
  expiresAt: string;
  guardians: RecoveryGuardian[];
};

export default function GuardianRequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const requestId = (params?.requestId ?? "").trim();

  const { ready, authenticated, user, login } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (currentUserEmail) headers["x-user-email"] = currentUserEmail;
    return headers;
  }, [currentUserEmail]);

  const [request, setRequest] = useState<RecoveryRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  const myGuardianEntry = request?.guardians.find(
    (g) => g.email.trim().toLowerCase() === currentUserEmail,
  );

  async function loadRequest() {
    if (!authenticated || !requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recovery-requests/${encodeURIComponent(requestId)}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setRequest((data?.request ?? null) as RecoveryRequest | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load request");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, requestId, currentUserEmail]);

  async function submitDecision(decision: "approve" | "reject") {
    if (!requestId) return;
    if (!signature.trim()) {
      setActionError("Signature is required.");
      return;
    }

    setSaving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch(
        `/api/recovery-requests/${encodeURIComponent(requestId)}/decision`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decision,
            signature: signature.trim(),
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setRequest((data?.request ?? null) as RecoveryRequest | null);
      setActionSuccess(`Decision submitted: ${decision}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to submit decision");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">Loading authentication...</main>;
  }
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Guardian Decision</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Sign in to review recovery request.</p>
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
        <h1 className="text-2xl font-semibold">Guardian Decision</h1>
        <Link href="/guardian/requests" className="text-sm text-blue-600 hover:underline">
          Back to Guardian Requests
        </Link>
      </div>

      {loading && <p className="text-sm text-zinc-500">Loading request...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {request && (
        <section className="space-y-4 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="text-sm"><span className="font-medium">Request ID:</span> {request.id}</p>
            <p className="text-sm"><span className="font-medium">Wallet:</span> {request.walletId}</p>
            <p className="text-sm"><span className="font-medium">Requester:</span> {request.requesterEmail}</p>
            <p className="text-sm"><span className="font-medium">Status:</span> {request.status}</p>
            <p className="text-sm"><span className="font-medium">Expires:</span> {request.expiresAt}</p>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{request.reason}</p>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Guardian approvals</h2>
            <ul className="space-y-1 text-sm">
              {request.guardians.map((g) => (
                <li key={g.email} className="rounded border border-zinc-200 px-2 py-1 dark:border-zinc-700">
                  {g.email} ({g.address}) - {g.status}
                </li>
              ))}
            </ul>
          </div>

          {myGuardianEntry ? (
            <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Sign this challenge with your guardian wallet:
              </p>
              <pre className="overflow-auto rounded bg-white p-2 text-xs dark:bg-zinc-900 dark:text-zinc-100">{myGuardianEntry.challenge}</pre>
              <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Guardian signature</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Paste signed challenge"
                rows={3}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving || request.status !== "pending" || myGuardianEntry.status !== "pending"}
                  onClick={() => submitDecision("approve")}
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={saving || request.status !== "pending" || myGuardianEntry.status !== "pending"}
                  onClick={() => submitDecision("reject")}
                  className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Reject"}
                </button>
              </div>
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              {actionSuccess && <p className="text-sm text-emerald-700">{actionSuccess}</p>}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">You are not listed as a guardian for this request.</p>
          )}
        </section>
      )}
    </main>
  );
}
