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
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#BDA9CC]">Guardian Recovery</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Guardian Decision</h1>
          <p className="mt-3 text-sm text-[#BDA9CC]">Sign in to review the recovery request.</p>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#BDA9CC]">Guardian Recovery</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Guardian Decision</h1>
          </div>
          <Link href="/guardian/requests" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Back to Requests
          </Link>
        </div>

        {loading && <p className="mb-4 text-sm text-[#BDA9CC]">Loading request...</p>}
        {error && <p className="mb-4 text-sm text-[#FF8CA9]">{error}</p>}

        {request && (
          <section className="space-y-5 rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
            <div className="grid gap-2 text-sm text-[#D6BCE5] md:grid-cols-2">
              <p><span className="font-medium text-[#F3E9FA]">Request ID:</span> {request.id}</p>
              <p><span className="font-medium text-[#F3E9FA]">Wallet:</span> {request.walletId}</p>
              <p><span className="font-medium text-[#F3E9FA]">Requester:</span> {request.requesterEmail}</p>
              <p><span className="font-medium text-[#F3E9FA]">Status:</span> {request.status}</p>
              <p className="md:col-span-2"><span className="font-medium text-[#F3E9FA]">Expires:</span> {request.expiresAt}</p>
              <p className="md:col-span-2 text-[#BDA9CC]">{request.reason}</p>
            </div>

            <div>
              <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[#D6BCE5]">Guardian approvals</h2>
              <ul className="space-y-2 text-sm">
                {request.guardians.map((g) => (
                  <li key={g.email} className="rounded-lg border border-[rgb(122_27_122_/_0.4)] bg-[rgb(10_10_10_/_0.65)] px-3 py-2 text-[#D6BCE5]">
                    {g.email} ({g.address}) - <span className="font-medium text-[#F3E9FA]">{g.status}</span>
                  </li>
                ))}
              </ul>
            </div>

            {myGuardianEntry ? (
              <div className="space-y-3 rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.7)] p-4">
                <p className="text-xs text-[#BDA9CC]">
                  Sign this challenge with your guardian wallet:
                </p>
                <pre className="overflow-auto rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.82)] p-3 text-xs text-[#D6BCE5]">{myGuardianEntry.challenge}</pre>
                <label className="mb-1 block text-sm text-[#BDA9CC]">Guardian signature</label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Paste signed challenge"
                  rows={3}
                  className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving || request.status !== "pending" || myGuardianEntry.status !== "pending"}
                    onClick={() => submitDecision("approve")}
                    className="rounded border border-emerald-500/70 bg-emerald-900/40 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-800/50 disabled:opacity-50"
                  >
                    {saving ? "Submitting..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={saving || request.status !== "pending" || myGuardianEntry.status !== "pending"}
                    onClick={() => submitDecision("reject")}
                    className="rounded border border-rose-500/70 bg-rose-900/40 px-4 py-2 text-sm font-medium text-rose-100 transition-colors hover:bg-rose-800/50 disabled:opacity-50"
                  >
                    {saving ? "Submitting..." : "Reject"}
                  </button>
                </div>
                {actionError && <p className="text-sm text-[#FF8CA9]">{actionError}</p>}
                {actionSuccess && <p className="text-sm text-[#6FE6B4]">{actionSuccess}</p>}
              </div>
            ) : (
              <p className="text-sm text-[#BDA9CC]">You are not listed as a guardian for this request.</p>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
