"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

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
  const router = useRouter();
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Guardian Requests</h1>
          <p className="mt-3 text-sm text-[#BDA9CC]">Sign in to review recovery requests.</p>
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
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Guardian Requests</h1>
          </div>
          <Button variant="outline" className="border-[rgb(122_27_122_/_0.55)] bg-[rgb(65_8_65_/_0.35)] text-[#EBDDF7]" onClick={() => router.push("/")}>
            Back to Dashboard
          </Button>
        </div>

        <section className="rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          {loading && <p className="text-sm text-[#BDA9CC]">Loading requests...</p>}
          {error && <p className="text-sm text-[#FF8CA9]">{error}</p>}
          {!loading && !error && requests.length === 0 && (
            <p className="text-sm text-[#BDA9CC]">No guardian requests yet.</p>
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
                  <p className="mt-1 text-xs text-[#BDA9CC]">Expires: {req.expiresAt}</p>
                  <Link
                    href={`/guardian/requests/${req.id}`}
                    className="mt-3 inline-block text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white"
                  >
                    Review and decide
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
