"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";

const COIN = "tarbeth";
const GAS_BUFFER_ETH = "0.00012";
const GAS_BUFFER_WEI = BigInt("120000000000000");
const ZERO_WEI = BigInt(0);
const TEN_WEI = BigInt(10);
const ETH_DECIMALS = BigInt(18);
const WEI_PER_ETH = TEN_WEI ** ETH_DECIMALS;

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
      const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : ZERO_WEI;
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
        const maxAfterBuffer = spendable > GAS_BUFFER_WEI ? spendable - GAS_BUFFER_WEI : ZERO_WEI;
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
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D6BCE5]/75">Transfer</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Normal Transfer</h1>
            <p className="mt-3 max-w-xl text-sm text-[#C6B2D6]">Sign in to send a wallet transaction through Rakshak.</p>
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
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#D6BCE5]/75">Treasury Transfer</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">Normal Transfer (User + BitGo)</h1>
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
        <h2 className="text-xl font-semibold tracking-tight text-[#F3E9FA]">Send Funds</h2>
        {walletsLoading && <p className="mt-2 text-sm text-[#D6BCE5]/80">Loading wallets...</p>}
        {walletsError && <p className="mt-2 text-sm text-rose-300">{walletsError}</p>}

        <div className="mt-4 rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-[rgb(65_8_65_/_0.25)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#F3E9FA]">Current Wallet Balance</p>
            <button
              type="button"
              onClick={loadWalletBalance}
              disabled={walletBalanceLoading || !walletId.trim()}
              className="rounded-md border border-[rgb(122_27_122_/_0.6)] bg-[rgb(122_27_122)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition-colors disabled:opacity-50 hover:bg-[rgb(101_19_101)]"
            >
              {walletBalanceLoading ? "Refreshing..." : "Refresh Balance"}
            </button>
          </div>

          {walletBalanceError && <p className="text-sm text-rose-300">{walletBalanceError}</p>}
          {!walletBalanceLoading && !walletBalanceError && !walletBalance && (
            <p className="text-sm text-[#D6BCE5]/75">Select or enter a wallet ID to load balance.</p>
          )}
          {walletBalance && (
            <div className="grid gap-2 text-sm text-[#EBDDF7] sm:grid-cols-2">
              <p><span className="text-[#C6B2D6]">Balance:</span> {formatWeiToEth(walletBalance.balanceString)}</p>
              <p><span className="text-[#C6B2D6]">Confirmed:</span> {formatWeiToEth(walletBalance.confirmedBalanceString)}</p>
              <p><span className="text-[#C6B2D6]">Spendable:</span> {formatWeiToEth(walletBalance.spendableBalanceString)}</p>
              <p><span className="text-[#C6B2D6]">Maximum spendable:</span> {formatWeiToEth(walletBalance.maximumSpendable)}</p>
              <p className="sm:col-span-2"><span className="text-[#C6B2D6]">Gas buffer reserved:</span> {GAS_BUFFER_ETH} ETH</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Wallet</label>
            <select
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] outline-none transition-colors focus:border-[rgb(122_27_122)]"
            >
              <option value="">Select wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.label || "Unnamed"} ({wallet.id})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#C6B2D6]">If this list is empty, paste wallet ID manually below.</p>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Wallet ID (Manual Override)</label>
            <input
              type="text"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              placeholder="69b4..."
              className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
            />
            <button
              type="button"
              onClick={handleClaimWallet}
              disabled={claiming || !walletId.trim()}
              className="mt-2 rounded-md border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#EBDDF7] transition-colors disabled:opacity-50 hover:bg-[rgb(122_27_122_/_0.35)]"
            >
              {claiming ? "Claiming..." : "Claim Wallet"}
            </button>
            {claimError && <p className="mt-2 text-sm text-rose-300">{claimError}</p>}
            {claimMessage && <p className="mt-2 text-sm text-emerald-300">{claimMessage}</p>}
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Recipient Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
            />
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
                  if (wei) {
                    setAmountBaseUnits(wei);
                  }
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
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#D6BCE5]/80">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Hackathon normal transfer"
              className="w-full rounded-md border border-[rgb(122_27_122_/_0.55)] bg-black/40 px-3 py-2.5 text-sm text-[#F3E9FA] placeholder:text-[#C6B2D6]/60 outline-none transition-colors focus:border-[rgb(122_27_122)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border border-[rgb(122_27_122_/_0.65)] bg-[rgb(122_27_122)] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors disabled:opacity-50 hover:bg-[rgb(101_19_101)]"
          >
            {submitting ? "Sending..." : "Send Transfer"}
          </button>

          {isAmountGreaterThanSpendable && (
            <p className="text-sm text-amber-300">
              Entered amount is greater than max sendable after gas buffer ({GAS_BUFFER_ETH} ETH).
            </p>
          )}
        </form>

        {submitError && <p className="mt-4 text-sm text-rose-300">{submitError}</p>}
        {submitResult && (
          <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-black/35 p-4 text-xs text-[#EBDDF7]">
            {JSON.stringify(submitResult, null, 2)}
          </pre>
        )}
      </section>

      <section className="rounded-2xl border border-[rgb(122_27_122_/_0.55)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-5 shadow-[0_20px_55px_rgba(0,0,0,0.3)] sm:p-7">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-[#F3E9FA]">Recent Transfers</h2>
          <button
            type="button"
            onClick={loadTransfers}
            disabled={transfersLoading || !walletId.trim()}
            className="rounded-md border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#EBDDF7] transition-colors disabled:opacity-50 hover:bg-[rgb(122_27_122_/_0.35)]"
          >
            {transfersLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {transfersError && <p className="text-sm text-rose-300">{transfersError}</p>}
        {!transfersLoading && !transfersError && transfers.length === 0 && (
          <p className="text-sm text-[#D6BCE5]/75">No transfers found.</p>
        )}
        {transfers.length > 0 && (
          <ul className="space-y-3">
            {transfers.map((transfer, index) => (
              <li
                key={transfer.id ?? transfer.txid ?? String(index)}
                className="rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-black/30 p-4"
              >
                <p className="text-sm"><span className="text-[#C6B2D6]">Transfer ID:</span> {transfer.id ?? "n/a"}</p>
                <p className="text-sm"><span className="text-[#C6B2D6]">TxID:</span> {transfer.txid ?? "n/a"}</p>
                <p className="text-sm"><span className="text-[#C6B2D6]">State:</span> {transfer.state ?? "n/a"}</p>
                <p className="text-sm"><span className="text-[#C6B2D6]">Amount:</span> {transfer.valueString ?? "n/a"}</p>
                <p className="mt-1 text-xs text-[#D6BCE5]/75">{transfer.date ?? ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>
    </main>
  );
}
