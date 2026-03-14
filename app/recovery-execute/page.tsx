"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
const GAS_BUFFER_ETH = "0.00012";
const GAS_BUFFER_WEI = 120000000000000n;

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
  const wholeWei = BigInt(wholePart) * 10n ** 18n;
  const fracWei = BigInt(fracPart || "0");
  const wei = wholeWei + fracWei;
  return wei > 0n ? wei.toString() : null;
}

function formatWeiToEth(value: string | null): string {
  if (!value) return "n/a";
  try {
    const wei = BigInt(value);
    const sign = wei < 0n ? "-" : "";
    const abs = wei < 0n ? -wei : wei;
    const whole = abs / 10n ** 18n;
    const fraction = (abs % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
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
      const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : 0n;
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
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(walletId)}/balance?coin=tarbeth`,
        { headers: authHeaders },
      );
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
        const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : 0n;
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
      const res = await fetch(
        `/api/recovery-requests/${encodeURIComponent(requestId.trim())}/execute`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amountBaseUnits: resolvedAmountBaseUnits,
            recipientAddress: recipientAddress.trim() || undefined,
          }),
        },
      );
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
    return <main className="mx-auto max-w-4xl px-4 py-10">Loading authentication...</main>;
  }
  if (!authenticated) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Recovery Transfer Execution</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Sign in to execute approved recovery transfers.</p>
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
        <h1 className="text-2xl font-semibold">Recovery Transfer (Backup Key + BitGo)</h1>
        <div className="flex items-center gap-3">
          <Link href="/demo-flow" className="text-sm text-blue-600 hover:underline">
            Demo flow
          </Link>
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>

      <section className="mb-8 rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Approved recovery requests</h2>
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && approvedRequests.length === 0 && (
          <p className="text-sm text-zinc-500">
            No approved requests available. Create recovery request and collect guardian approvals first.
          </p>
        )}
        {approvedRequests.length > 0 && (
          <ul className="space-y-2">
            {approvedRequests.map((request) => (
              <li key={request.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="text-sm"><span className="font-medium">Request:</span> {request.id}</p>
                <p className="text-sm"><span className="font-medium">Wallet:</span> {request.walletId}</p>
                <p className="text-sm"><span className="font-medium">Reason:</span> {request.reason}</p>
                <p className="text-sm"><span className="font-medium">Expires:</span> {request.expiresAt}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-medium">Execute recovery payout</h2>
        <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Current wallet balance</p>
            <button
              type="button"
              onClick={loadWalletBalance}
              disabled={walletBalanceLoading || !selectedRequest?.walletId}
              className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {walletBalanceLoading ? "Refreshing..." : "Refresh balance"}
            </button>
          </div>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Selected request wallet: {selectedRequest?.walletId ?? "n/a"}
          </p>
          {walletBalanceError && <p className="text-sm text-red-600">{walletBalanceError}</p>}
          {!walletBalanceLoading && !walletBalanceError && !walletBalance && (
            <p className="text-sm text-zinc-500">Select approved request to load wallet balance.</p>
          )}
          {walletBalance && (
            <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
              <p><span className="font-medium">Balance:</span> {formatWeiToEth(walletBalance.balanceString)}</p>
              <p><span className="font-medium">Confirmed:</span> {formatWeiToEth(walletBalance.confirmedBalanceString)}</p>
              <p><span className="font-medium">Spendable:</span> {formatWeiToEth(walletBalance.spendableBalanceString)}</p>
              <p><span className="font-medium">Maximum spendable:</span> {formatWeiToEth(walletBalance.maximumSpendable)}</p>
              <p><span className="font-medium">Gas buffer reserved:</span> {GAS_BUFFER_ETH} ETH</p>
              <p><span className="font-medium">Receive address:</span> {walletBalance.receiveAddress ?? "n/a"}</p>
            </div>
          )}
        </div>
        <form onSubmit={handleExecute} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Approved request ID</label>
            <select
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select request</option>
              {approvedRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.id} ({request.walletId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Amount (ETH)</label>
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
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Amount (base units / wei)</label>
            <input
              type="text"
              value={amountBaseUnits}
              onChange={(e) => setAmountBaseUnits(e.target.value)}
              placeholder="1000000000000000"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Auto-filled from ETH amount using 18 decimals.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
              Recipient address (optional, defaults to configured receiver)
            </label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={executing}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {executing ? "Executing..." : "Execute recovery transfer"}
          </button>
          {isAmountGreaterThanSpendable && (
            <p className="text-sm text-amber-700">
              Entered amount is greater than max sendable after gas buffer ({GAS_BUFFER_ETH} ETH).
            </p>
          )}
        </form>
        {executeError && <p className="mt-3 text-sm text-red-600">{executeError}</p>}
        {executeResult && (
          <pre className="mt-3 max-h-80 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            {JSON.stringify(executeResult, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}
