"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

const GAS_BUFFER_ETH = "0.00012";
const GAS_BUFFER_WEI = BigInt("120000000000000");
const ZERO_WEI = BigInt(0);
const TEN_WEI = BigInt(10);
const ETH_DECIMALS = BigInt(18);
const WEI_PER_ETH = TEN_WEI ** ETH_DECIMALS;

type RecoveryGuardian = {
  email: string;
  status: "pending" | "approved" | "rejected";
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

type WalletBalance = {
  walletId: string;
  coin: string;
  label: string | null;
  receiveAddress: string | null;
  balanceString: string | null;
  confirmedBalanceString: string | null;
  spendableBalanceString: string | null;
  maximumSpendable: string | null;
};

function parseEthToWei(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (!/^\d+(\.\d+)?$/.test(value)) return null;

  const [wholePart, fracPartRaw = ""] = value.split(".");
  if (fracPartRaw.length > 18) return null;

  const fracPart = fracPartRaw.padEnd(18, "0");
  const wholeWei = BigInt(wholePart) * WEI_PER_ETH;
  const fracWei = BigInt(fracPart || "0");
  const wei = wholeWei + fracWei;
  return wei > ZERO_WEI ? wei.toString() : null;
}

function formatWeiToEth(value: string | null): string {
  if (!value) return "n/a";
  try {
    const wei = BigInt(value);
    const sign = wei < ZERO_WEI ? "-" : "";
    const abs = wei < ZERO_WEI ? -wei : wei;
    const whole = abs / WEI_PER_ETH;
    const fraction = (abs % WEI_PER_ETH).toString().padStart(18, "0").replace(/0+$/, "");
    return `${sign}${whole.toString()}${fraction ? `.${fraction}` : ""} ETH`;
  } catch {
    return "n/a";
  }
}

export default function RecoveryExecutePage() {
  const { ready, authenticated, user, login } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (currentUserEmail) headers["x-user-email"] = currentUserEmail;
    return headers;
  }, [currentUserEmail]);

  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestId, setRequestId] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [amountBaseUnits, setAmountBaseUnits] = useState("");
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);
  const [executeResult, setExecuteResult] = useState<Record<string, unknown> | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [walletBalanceError, setWalletBalanceError] = useState<string | null>(null);

  async function loadRequests() {
    if (!authenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recovery-requests?role=requester", {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      const list = Array.isArray(data?.requests) ? (data.requests as RecoveryRequest[]) : [];
      setRequests(list);
      const approved = list.find((request) => request.status === "approved");
      if (!requestId && approved?.id) {
        setRequestId(approved.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, currentUserEmail]);

  const approvedRequests = requests.filter((request) => request.status === "approved");
  const selectedRequest = approvedRequests.find((request) => request.id === requestId) ?? null;
  const weiFromEth = parseEthToWei(amountEth);
  const resolvedAmountBaseUnits = amountBaseUnits.trim() || weiFromEth || "";
  const isAmountGreaterThanSpendable = (() => {
    if (!resolvedAmountBaseUnits || !walletBalance?.spendableBalanceString) return false;
    try {
      const spendable = BigInt(walletBalance.spendableBalanceString);
      const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : ZERO_WEI;
      return BigInt(resolvedAmountBaseUnits) > maxAfterBuffer;
    } catch {
      return false;
    }
  })();

  async function loadWalletBalance() {
    const walletId = selectedRequest?.walletId?.trim() ?? "";
    if (!authenticated || !walletId) {
      setWalletBalance(null);
      return;
    }
    setWalletBalanceLoading(true);
    setWalletBalanceError(null);
    try {
      const res = await fetch(`/api/bitgo/wallets/${encodeURIComponent(walletId)}/balance?coin=tarbeth`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWalletBalanceError(data?.error ?? `Request failed: ${res.status}`);
        setWalletBalance(null);
        return;
      }
      setWalletBalance(data as WalletBalance);
    } catch (err) {
      setWalletBalanceError(err instanceof Error ? err.message : "Failed to load wallet balance");
      setWalletBalance(null);
    } finally {
      setWalletBalanceLoading(false);
    }
  }

  useEffect(() => {
    loadWalletBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, requestId, currentUserEmail]);

  async function handleExecute(e: React.FormEvent) {
    e.preventDefault();
    setExecuteError(null);
    setExecuteResult(null);

    if (!requestId.trim()) {
      setExecuteError("Select an approved recovery request.");
      return;
    }
    if (!resolvedAmountBaseUnits) {
      setExecuteError("Enter amount in ETH or base units (wei).");
      return;
    }
    if (walletBalance?.spendableBalanceString) {
      try {
        const spendable = BigInt(walletBalance.spendableBalanceString);
        const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : ZERO_WEI;
        if (BigInt(resolvedAmountBaseUnits) > maxAfterBuffer) {
          setExecuteError(`Amount exceeds max sendable after gas buffer (${GAS_BUFFER_ETH} ETH).`);
          return;
        }
      } catch {
        // ignore parsing guard failures; API validates final send amount
      }
    }

    setExecuting(true);
    try {
      const res = await fetch(`/api/recovery-requests/${encodeURIComponent(requestId.trim())}/execute`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amountBaseUnits: resolvedAmountBaseUnits,
          recipientAddress: recipientAddress.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExecuteError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setExecuteResult(data);
      await loadRequests();
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : "Failed to execute recovery transfer");
    } finally {
      setExecuting(false);
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
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D6BCE5]/75">Recovery</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Recovery Transfer Execution</h1>
            <p className="mt-3 max-w-xl text-sm text-[#C6B2D6]">Sign in to execute approved recovery transfers.</p>
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
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D6BCE5]/75">Recovery Execution</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Recovery Transfer (Backup Key + BitGo)</h1>
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
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-[#F3E9FA]">Approved Recovery Requests</h2>
            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="rounded-md border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#EBDDF7] transition-colors disabled:opacity-50 hover:bg-[rgb(122_27_122_/_0.35)]"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && <p className="text-sm text-rose-300">{error}</p>}
          {!loading && approvedRequests.length === 0 && (
            <p className="text-sm text-[#D6BCE5]/75">
              No approved requests available. Create a recovery request and collect guardian approvals first.
            </p>
          )}
          {approvedRequests.length > 0 && (
            <ul className="space-y-3">
              {approvedRequests.map((request) => (
                <li key={request.id} className="rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-black/30 p-4">
                  <p className="text-sm"><span className="text-[#C6B2D6]">Request:</span> {request.id}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Wallet:</span> {request.walletId}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Reason:</span> {request.reason}</p>
                  <p className="text-sm"><span className="text-[#C6B2D6]">Expires:</span> {request.expiresAt}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[rgb(122_27_122_/_0.55)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.3)] sm:p-7">
          <h2 className="text-xl font-semibold tracking-tight text-[#F3E9FA]">Execute Recovery Payout</h2>

          <div className="mt-4 rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-[rgb(65_8_65_/_0.25)] p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#F3E9FA]">Current Wallet Balance</p>
              <button
                type="button"
                onClick={loadWalletBalance}
                disabled={walletBalanceLoading || !selectedRequest?.walletId}
                className="rounded-md border border-[rgb(122_27_122_/_0.6)] bg-[rgb(122_27_122)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors disabled:opacity-50 hover:bg-[rgb(101_19_101)]"
              >
                {walletBalanceLoading ? "Refreshing..." : "Refresh Balance"}
              </button>
            </div>

            <p className="mb-2 text-xs text-[#C6B2D6]">Selected request wallet: {selectedRequest?.walletId ?? "n/a"}</p>
            {walletBalanceError && <p className="text-sm text-rose-300">{walletBalanceError}</p>}
            {!walletBalanceLoading && !walletBalanceError && !walletBalance && (
              <p className="text-sm text-[#D6BCE5]/75">Select an approved request to load wallet balance.</p>
            )}
            {walletBalance && (
              <div className="grid gap-2 text-sm text-[#EBDDF7] sm:grid-cols-2">
                <p><span className="text-[#C6B2D6]">Balance:</span> {formatWeiToEth(walletBalance.balanceString)}</p>
                <p><span className="text-[#C6B2D6]">Confirmed:</span> {formatWeiToEth(walletBalance.confirmedBalanceString)}</p>
                <p><span className="text-[#C6B2D6]">Spendable:</span> {formatWeiToEth(walletBalance.spendableBalanceString)}</p>
                <p><span className="text-[#C6B2D6]">Maximum spendable:</span> {formatWeiToEth(walletBalance.maximumSpendable)}</p>
                <p><span className="text-[#C6B2D6]">Gas buffer reserved:</span> {GAS_BUFFER_ETH} ETH</p>
                <p><span className="text-[#C6B2D6]">Receive address:</span> {walletBalance.receiveAddress ?? "n/a"}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleExecute} className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Approved Request ID</label>
              <select
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] outline-none transition-colors focus:border-[rgb(122_27_122)]"
              >
                <option value="">Select request</option>
                {approvedRequests.map((request) => (
                  <option key={request.id} value={request.id}>
                    {request.id} ({request.walletId})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Amount (ETH)</label>
                <input
                  type="text"
                  value={amountEth}
                  onChange={(e) => {
                    const next = e.target.value;
                    setAmountEth(next);
                    const wei = parseEthToWei(next);
                    if (wei) setAmountBaseUnits(wei);
                  }}
                  placeholder="0.00001"
                  className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Amount (Wei)</label>
                <input
                  type="text"
                  value={amountBaseUnits}
                  onChange={(e) => setAmountBaseUnits(e.target.value)}
                  placeholder="1000000000000000"
                  className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
                />
              </div>
            </div>

            <p className="-mt-2 text-xs text-[#C6B2D6]">Auto-filled from ETH amount using 18 decimals.</p>

            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">
                Recipient Address (Optional; defaults to configured receiver)
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
              />
            </div>

            <button
              type="submit"
              disabled={executing}
              className="rounded-md border border-[rgb(122_27_122_/_0.65)] bg-[rgb(122_27_122)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors disabled:opacity-50 hover:bg-[rgb(101_19_101)]"
            >
              {executing ? "Executing..." : "Execute Recovery Transfer"}
            </button>

            {isAmountGreaterThanSpendable && (
              <p className="text-sm text-amber-300">
                Entered amount is greater than max sendable after gas buffer ({GAS_BUFFER_ETH} ETH).
              </p>
            )}
          </form>

          {executeError && <p className="mt-3 text-sm text-rose-300">{executeError}</p>}
          {executeResult && (
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-black/35 p-4 text-xs text-[#EBDDF7]">
              {JSON.stringify(executeResult, null, 2)}
            </pre>
          )}
        </section>
      </div>
    </main>
  );
}
