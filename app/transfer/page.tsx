"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

const COIN = "tarbeth";
const GAS_BUFFER_ETH = "0.00012";
const GAS_BUFFER_WEI = 120000000000000n;

type WalletItem = {
  id: string;
  label?: string;
  receiveAddress?: { address?: string };
};

type TransferItem = {
  id?: string;
  txid?: string;
  state?: string;
  date?: string;
  valueString?: string;
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

export default function TransferPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (currentUserEmail) headers["x-user-email"] = currentUserEmail;
    return headers;
  }, [currentUserEmail]);

  const [wallets, setWallets] = useState<WalletItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletsError, setWalletsError] = useState<string | null>(null);

  const [walletId, setWalletId] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amountEth, setAmountEth] = useState("");
  const [amountBaseUnits, setAmountBaseUnits] = useState("");
  const [note, setNote] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<Record<string, unknown> | null>(null);

  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [transfersError, setTransfersError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [walletBalanceLoading, setWalletBalanceLoading] = useState(false);
  const [walletBalanceError, setWalletBalanceError] = useState<string | null>(null);

  const loadWallets = useCallback(async () => {
    if (!authenticated) return;
    setWalletsLoading(true);
    setWalletsError(null);
    try {
      const res = await fetch(`/api/bitgo/wallets?coin=${encodeURIComponent(COIN)}`, {
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setWalletsError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      const list = Array.isArray(data?.wallets) ? (data.wallets as WalletItem[]) : [];
      setWallets(list);
      if (!walletId && list[0]?.id) {
        setWalletId(list[0].id);
      }
    } catch (err) {
      setWalletsError(err instanceof Error ? err.message : "Failed to load wallets");
    } finally {
      setWalletsLoading(false);
    }
  }, [authenticated, authHeaders, walletId]);

  const loadTransfers = useCallback(async () => {
    const id = walletId.trim();
    if (!authenticated || !id) return;
    setTransfersLoading(true);
    setTransfersError(null);
    try {
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(id)}/transfers?coin=${encodeURIComponent(COIN)}&limit=10`,
        { headers: authHeaders },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTransfersError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setTransfers(Array.isArray(data?.transfers) ? (data.transfers as TransferItem[]) : []);
    } catch (err) {
      setTransfersError(err instanceof Error ? err.message : "Failed to load transfers");
    } finally {
      setTransfersLoading(false);
    }
  }, [authenticated, authHeaders, walletId]);

  const loadWalletBalance = useCallback(async () => {
    const id = walletId.trim();
    if (!authenticated || !id) {
      setWalletBalance(null);
      return;
    }
    setWalletBalanceLoading(true);
    setWalletBalanceError(null);
    try {
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(id)}/balance?coin=${encodeURIComponent(COIN)}`,
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
  }, [authenticated, authHeaders, walletId]);

  useEffect(() => {
    loadWallets();
  }, [loadWallets]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    loadWalletBalance();
  }, [loadWalletBalance]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitResult(null);

    const id = walletId.trim();
    if (!id) {
      setSubmitError("Wallet ID is required.");
      return;
    }
    if (!recipientAddress.trim()) {
      setSubmitError("Recipient address is required.");
      return;
    }

    if (!resolvedAmountBaseUnits) {
      setSubmitError("Enter amount in ETH or base units (wei).");
      return;
    }
    if (walletBalance?.spendableBalanceString) {
      try {
        const spendable = BigInt(walletBalance.spendableBalanceString);
        const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : 0n;
        if (BigInt(resolvedAmountBaseUnits) > maxAfterBuffer) {
          setSubmitError(`Amount exceeds max sendable after gas buffer (${GAS_BUFFER_ETH} ETH).`);
          return;
        }
      } catch {
        // ignore parsing guard failures; API validates final send amount
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/bitgo/wallets/${encodeURIComponent(id)}/send`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coin: COIN,
          recipientAddress: recipientAddress.trim(),
          amountBaseUnits: resolvedAmountBaseUnits,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setSubmitResult(data);
      await loadTransfers();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit transfer");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClaimWallet() {
    const id = walletId.trim();
    if (!id) {
      setClaimError("Wallet ID is required to claim.");
      setClaimMessage(null);
      return;
    }

    setClaiming(true);
    setClaimError(null);
    setClaimMessage(null);
    try {
      const res = await fetch(`/api/bitgo/wallets/${encodeURIComponent(id)}/claim`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ coin: COIN }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setClaimError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setClaimMessage("Wallet mapped to your signed-in user.");
      await loadWallets();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : "Failed to claim wallet");
    } finally {
      setClaiming(false);
    }
  }

  if (!ready) {
    return <main className="mx-auto max-w-4xl px-4 py-10">Loading authentication...</main>;
  }

  if (!authenticated) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-zinc-900 dark:text-zinc-100">
        <h1 className="mb-4 text-2xl font-semibold">Normal Transfer</h1>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">Sign in to send a wallet transaction.</p>
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
        <h1 className="text-2xl font-semibold">Normal Transfer (User + BitGo)</h1>
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
        <h2 className="mb-3 text-lg font-medium">Send funds</h2>
        {walletsLoading && <p className="mb-2 text-sm text-zinc-500">Loading wallets...</p>}
        {walletsError && <p className="mb-2 text-sm text-red-600">{walletsError}</p>}
        <div className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Current wallet balance</p>
            <button
              type="button"
              onClick={loadWalletBalance}
              disabled={walletBalanceLoading || !walletId.trim()}
              className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              {walletBalanceLoading ? "Refreshing..." : "Refresh balance"}
            </button>
          </div>
          {walletBalanceError && <p className="text-sm text-red-600">{walletBalanceError}</p>}
          {!walletBalanceLoading && !walletBalanceError && !walletBalance && (
            <p className="text-sm text-zinc-500">Select/enter wallet ID to load balance.</p>
          )}
          {walletBalance && (
            <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-200">
              <p><span className="font-medium">Balance:</span> {formatWeiToEth(walletBalance.balanceString)}</p>
              <p><span className="font-medium">Confirmed:</span> {formatWeiToEth(walletBalance.confirmedBalanceString)}</p>
              <p><span className="font-medium">Spendable:</span> {formatWeiToEth(walletBalance.spendableBalanceString)}</p>
              <p><span className="font-medium">Maximum spendable:</span> {formatWeiToEth(walletBalance.maximumSpendable)}</p>
              <p><span className="font-medium">Gas buffer reserved:</span> {GAS_BUFFER_ETH} ETH</p>
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Wallet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.label || "Unnamed"} ({wallet.id})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              If this list is empty, paste wallet ID manually below.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Wallet ID (manual override)</label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="69b4..."
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={handleClaimWallet}
              disabled={claiming || !walletId.trim()}
              className="mt-2 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {claiming ? "Claiming..." : "Claim this wallet for current user"}
            </button>
            {claimError && <p className="mt-2 text-sm text-red-600">{claimError}</p>}
            {claimMessage && <p className="mt-2 text-sm text-emerald-700">{claimMessage}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Recipient address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
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
                if (wei) {
                  setAmountBaseUnits(wei);
                }
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
            <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hackathon normal transfer"
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send transfer"}
          </button>
          {isAmountGreaterThanSpendable && (
            <p className="text-sm text-amber-700">
              Entered amount is greater than max sendable after gas buffer ({GAS_BUFFER_ETH} ETH).
            </p>
          )}
        </form>
        {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
        {submitResult && (
          <pre className="mt-3 max-h-80 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
            {JSON.stringify(submitResult, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent transfers</h2>
          <button
            type="button"
            onClick={loadTransfers}
            disabled={transfersLoading || !walletId.trim()}
            className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {transfersLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {transfersError && <p className="text-sm text-red-600">{transfersError}</p>}
        {!transfersLoading && !transfersError && transfers.length === 0 && (
          <p className="text-sm text-zinc-500">No transfers found.</p>
        )}
        {transfers.length > 0 && (
          <ul className="space-y-2">
            {transfers.map((transfer, index) => (
              <li key={transfer.id ?? transfer.txid ?? String(index)} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
                <p className="text-sm"><span className="font-medium">Transfer ID:</span> {transfer.id ?? "n/a"}</p>
                <p className="text-sm"><span className="font-medium">TxID:</span> {transfer.txid ?? "n/a"}</p>
                <p className="text-sm"><span className="font-medium">State:</span> {transfer.state ?? "n/a"}</p>
                <p className="text-sm"><span className="font-medium">Amount:</span> {transfer.valueString ?? "n/a"}</p>
                <p className="text-xs text-zinc-500">{transfer.date ?? ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
