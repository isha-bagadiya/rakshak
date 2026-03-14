"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { DashboardSignInPrompt } from "@/components/dashboard/DashboardSignInPrompt";

/** Arbitrum Testnet only (BitGo: tarbeth). */
const COIN = "tarbeth";
const MAX_GUARDIANS = 3;

const LAST_WALLET_KEY_PREFIX = "catchup_last_wallet_id";

type WalletItem = {
  id: string;
  label?: string;
  receiveAddress?: { address?: string };
};

type GuardiansState = {
  guardians: string[];
  threshold: number;
};

type GuardianSetupInput = {
  addressOrEns: string;
  email: string;
};

export default function Home() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const currentUserEmail = user?.email?.address?.trim().toLowerCase() ?? "";

  const authHeaders = useCallback((extra?: Record<string, string>): Record<string, string> => {
    const base: Record<string, string> = {};
    if (currentUserEmail) {
      base["x-user-email"] = currentUserEmail;
    }

    if (!extra) return base;
    return { ...base, ...extra };
  }, [currentUserEmail]);

  const getLastWalletStorageKey = useCallback((): string => {
    return currentUserEmail
      ? `${LAST_WALLET_KEY_PREFIX}:${currentUserEmail}`
      : LAST_WALLET_KEY_PREFIX;
  }, [currentUserEmail]);

  const [label, setLabel] = useState("");
  const [generateResult, setGenerateResult] = useState<unknown>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [keyExportResult, setKeyExportResult] = useState<unknown>(null);
  const [keyExportError, setKeyExportError] = useState<string | null>(null);
  const [keyExportLoading, setKeyExportLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [addrWalletId, setAddrWalletId] = useState("");
  const [addressResult, setAddressResult] = useState<unknown>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const [guardianWalletId, setGuardianWalletId] = useState("");
  const [guardiansState, setGuardiansState] = useState<GuardiansState | null>(null);
  const [guardianAddressInput, setGuardianAddressInput] = useState("");
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [guardianError, setGuardianError] = useState<string | null>(null);
  const [guardianSetupInputs, setGuardianSetupInputs] = useState<GuardianSetupInput[]>([
    { addressOrEns: "", email: "" },
    { addressOrEns: "", email: "" },
    { addressOrEns: "", email: "" },
  ]);
  const [guardianSetupCompleted, setGuardianSetupCompleted] = useState(false);
  const [guardianSetupLoading, setGuardianSetupLoading] = useState(false);
  const [guardianSetupError, setGuardianSetupError] = useState<string | null>(null);
  const [guardianSetupSuccess, setGuardianSetupSuccess] = useState<string | null>(null);
  const [receiverAddressInput, setReceiverAddressInput] = useState("");

  const [walletsList, setWalletsList] = useState<WalletItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(true);
  const [walletsError, setWalletsError] = useState<string | null>(null);
  const [guardiansByWalletId, setGuardiansByWalletId] = useState<
    Record<string, GuardiansState | "loading">
  >({});

  useEffect(() => {
    if (!ready || !authenticated) {
      setWalletsList([]);
      setWalletsLoading(false);
      return;
    }
    let cancelled = false;
    setWalletsLoading(true);
    setWalletsError(null);
    fetch(`/api/bitgo/wallets?coin=${encodeURIComponent(COIN)}`, {
      headers: authHeaders(),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        if (data?.error) {
          setWalletsError(data.error);
          setWalletsList([]);
          return;
        }
        const list = (data?.wallets ?? []) as WalletItem[];
        setWalletsList(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setWalletsError(err instanceof Error ? err.message : "Failed to load wallets");
          setWalletsList([]);
        }
      })
      .finally(() => {
        if (!cancelled) setWalletsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated, currentUserEmail, authHeaders]);

  useEffect(() => {
    if (!authenticated) return;
    if (walletsList.length === 0) return;
    let cancelled = false;
    const ids = walletsList.map((w) => w.id);
    ids.forEach((id) =>
      setGuardiansByWalletId((prev) => ({ ...prev, [id]: "loading" })),
    );
    Promise.all(
      ids.map((id) =>
        fetch(`/api/bitgo/wallets/${encodeURIComponent(id)}/guardians?coin=${encodeURIComponent(COIN)}`, {
          headers: authHeaders(),
        })
          .then((res) => res.json().catch(() => ({})))
          .then((data) => {
            if (cancelled) return { id, data: null };
            const guardians = (data?.guardians ?? []) as string[];
            const threshold = typeof data?.threshold === "number" ? data.threshold : 0;
            return { id, data: { guardians, threshold } };
          })
          .catch(() => ({ id, data: { guardians: [] as string[], threshold: 0 } })),
      ),
    ).then((results) => {
      if (cancelled) return;
      setGuardiansByWalletId((prev) => {
        const next = { ...prev };
        results.forEach(({ id, data }) => {
          if (data) next[id] = data;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [walletsList, authenticated, currentUserEmail, authHeaders]);

  useEffect(() => {
    if (!authenticated) return;
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(getLastWalletStorageKey());
    if (saved && saved.trim()) {
      setAddrWalletId(saved);
      setGuardianWalletId(saved);
    }
  }, [authenticated, currentUserEmail, getLastWalletStorageKey]);

  useEffect(() => {
    if (!authenticated) {
      setGuardianSetupCompleted(false);
      setGuardianSetupInputs([
        { addressOrEns: "", email: "" },
        { addressOrEns: "", email: "" },
        { addressOrEns: "", email: "" },
      ]);
      setGuardianSetupError(null);
      setGuardianSetupSuccess(null);
      return;
    }
    let cancelled = false;
    setGuardianSetupLoading(true);
    setGuardianSetupError(null);
    fetch("/api/guardians/profile", {
      headers: authHeaders(),
    })
      .then((res) => res.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return;
        if (data?.error) {
          setGuardianSetupError(data.error);
          return;
        }
        const guardians = Array.isArray(data?.guardians)
          ? (data.guardians as Array<{ address?: string; ensName?: string; email?: string }>)
          : [];
        const completed = Boolean(data?.completed) && guardians.length === MAX_GUARDIANS;
        setGuardianSetupCompleted(completed);
        setGuardianSetupInputs([
          {
            addressOrEns: guardians[0]?.ensName ?? guardians[0]?.address ?? "",
            email: guardians[0]?.email ?? "",
          },
          {
            addressOrEns: guardians[1]?.ensName ?? guardians[1]?.address ?? "",
            email: guardians[1]?.email ?? "",
          },
          {
            addressOrEns: guardians[2]?.ensName ?? guardians[2]?.address ?? "",
            email: guardians[2]?.email ?? "",
          },
        ]);
        setReceiverAddressInput(guardians[0]?.ensName ?? guardians[0]?.address ?? "");
      })
      .catch((err) => {
        if (!cancelled) {
          setGuardianSetupError(
            err instanceof Error ? err.message : "Failed to load guardian setup",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setGuardianSetupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated, authHeaders]);

  function updateGuardianSetupInput(
    index: number,
    key: keyof GuardianSetupInput,
    value: string,
  ) {
    setGuardianSetupInputs((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    );
  }

  async function handleSaveGuardianSetup(e: React.FormEvent) {
    e.preventDefault();
    const guardians = guardianSetupInputs.map((g) => ({
      addressOrEns: g.addressOrEns.trim(),
      email: g.email.trim().toLowerCase(),
    }));
    if (guardians.some((g) => !g.addressOrEns || !g.email)) {
      setGuardianSetupError("Please enter all 3 guardian address/ENS values and guardian emails.");
      setGuardianSetupSuccess(null);
      return;
    }

    setGuardianSetupLoading(true);
    setGuardianSetupError(null);
    setGuardianSetupSuccess(null);
    try {
      const res = await fetch("/api/guardians/profile", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ guardians }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuardianSetupError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setGuardianSetupCompleted(true);
      const saved = Array.isArray(data?.guardians)
        ? (data.guardians as Array<{ address?: string; ensName?: string; email?: string }>)
        : [];
      setGuardianSetupInputs([
        { addressOrEns: saved[0]?.ensName ?? saved[0]?.address ?? guardians[0].addressOrEns, email: saved[0]?.email ?? guardians[0].email },
        { addressOrEns: saved[1]?.ensName ?? saved[1]?.address ?? guardians[1].addressOrEns, email: saved[1]?.email ?? guardians[1].email },
        { addressOrEns: saved[2]?.ensName ?? saved[2]?.address ?? guardians[2].addressOrEns, email: saved[2]?.email ?? guardians[2].email },
      ]);
      setReceiverAddressInput((prev) => prev.trim() || (saved[0]?.ensName ?? saved[0]?.address ?? ""));
      setGuardianSetupSuccess("Guardian setup completed. You can now create wallet.");
    } catch (err) {
      setGuardianSetupError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setGuardianSetupLoading(false);
    }
  }

  function selectWallet(id: string) {
    const tid = id.trim();
    if (!tid) return;
    setAddrWalletId(tid);
    setGuardianWalletId(tid);
    if (typeof window !== "undefined") {
      localStorage.setItem(getLastWalletStorageKey(), tid);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!guardianSetupCompleted) {
      setGenerateError("Please complete guardian setup with 3 addresses first.");
      return;
    }
    setGenerateError(null);
    setGenerateResult(null);
    setKeyExportResult(null);
    setKeyExportError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bitgo/wallets/generate", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          label: label.trim() || "My Wallet",
          coin: COIN,
          receiverAddress: receiverAddressInput.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenerateError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setGenerateResult(data);
      if (data && typeof data === "object" && "wallet" in data) {
        const walletObj = (data as { wallet?: { id?: string } }).wallet;
        if (walletObj?.id) {
          selectWallet(walletObj.id);
        }
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadGuardians() {
    const id = guardianWalletId.trim();
    if (!id) {
      setGuardianError("Enter a wallet ID to load guardians.");
      return;
    }
    setGuardianError(null);
    setGuardianLoading(true);
    try {
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(id)}/guardians?coin=${encodeURIComponent(
          COIN,
        )}`,
        {
          headers: authHeaders(),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuardianError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      const guardians = (data as { guardians?: string[] }).guardians ?? [];
      const threshold = (data as { threshold?: number }).threshold ?? 0;
      setGuardiansState({ guardians, threshold });
      setGuardiansByWalletId((prev) => ({ ...prev, [id]: { guardians, threshold } }));
    } catch (err) {
      setGuardianError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setGuardianLoading(false);
    }
  }

  async function handleAddGuardian(e: React.FormEvent) {
    e.preventDefault();
    const id = guardianWalletId.trim();
    const address = guardianAddressInput.trim();
    if (!id) {
      setGuardianError("Enter a wallet ID first.");
      return;
    }
    if (!address) {
      setGuardianError("Enter a guardian address.");
      return;
    }
    if ((guardiansState?.guardians.length ?? 0) >= MAX_GUARDIANS) {
      setGuardianError(`You can add only ${MAX_GUARDIANS} guardians per wallet.`);
      return;
    }
    setGuardianError(null);
    setGuardianLoading(true);
    try {
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(id)}/guardians`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ address, coin: COIN }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuardianError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      const guardians = (data as { guardians?: string[] }).guardians ?? [];
      const threshold = (data as { threshold?: number }).threshold ?? 0;
      setGuardiansState({ guardians, threshold });
      setGuardiansByWalletId((prev) => ({ ...prev, [id]: { guardians, threshold } }));
      setGuardianAddressInput("");
    } catch (err) {
      setGuardianError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setGuardianLoading(false);
    }
  }

  async function handleRemoveGuardian(address: string) {
    const id = guardianWalletId.trim();
    if (!id) {
      setGuardianError("Enter a wallet ID first.");
      return;
    }
    if (!address) {
      return;
    }
    setGuardianError(null);
    setGuardianLoading(true);
    try {
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(id)}/guardians`,
        {
          method: "DELETE",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ address, coin: COIN }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGuardianError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      const guardians = (data as { guardians?: string[] }).guardians ?? [];
      const threshold = (data as { threshold?: number }).threshold ?? 0;
      setGuardiansState({ guardians, threshold });
      setGuardiansByWalletId((prev) => ({ ...prev, [id]: { guardians, threshold } }));
    } catch (err) {
      setGuardianError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setGuardianLoading(false);
    }
  }

  async function handleCreateAddress(e: React.FormEvent) {
    e.preventDefault();
    const id = addrWalletId.trim();
    if (!id) {
      setAddressError("Enter a wallet ID.");
      return;
    }
    setAddressError(null);
    setAddressResult(null);
    setAddressLoading(true);
    try {
      const res = await fetch(`/api/bitgo/wallets/${encodeURIComponent(id)}/addresses`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ coin: COIN }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddressError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setAddressResult(data);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleExportKeysOnce() {
    if (!wallet?.id) {
      setKeyExportError("No wallet found to export keys.");
      return;
    }
    setKeyExportError(null);
    setKeyExportResult(null);
    setKeyExportLoading(true);
    try {
      const res = await fetch(
        `/api/bitgo/wallets/${encodeURIComponent(wallet.id)}/key-export`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setKeyExportError(data?.error ?? `Request failed: ${res.status}`);
        return;
      }
      setKeyExportResult(data);
    } catch (err) {
      setKeyExportError(err instanceof Error ? err.message : "Network or unknown error");
    } finally {
      setKeyExportLoading(false);
    }
  }

  const wallet = generateResult && typeof generateResult === "object" && "wallet" in generateResult
    ? (generateResult as { wallet?: { id?: string; label?: string; receiveAddress?: { address?: string }; coin?: string } }).wallet
    : null;

  if (!ready) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black font-sans">
        <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12 text-[#EBDDF7]">
          <p className="text-sm text-[#BDA9CC]">Loading authentication...</p>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return <DashboardSignInPrompt onSignIn={login} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-sans">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="pointer-events-none absolute -top-28 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[rgb(122_27_122_/_0.22)] blur-3xl" />
      <main className="relative z-10 mx-auto max-w-6xl px-4 py-12 text-[#EBDDF7]">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] px-4 py-3 text-sm">
          <p className="truncate text-[#C6B2D6]">
            Signed in as{" "}
            <span className="font-medium text-[#F3E9FA]">
              {user?.email?.address ?? user?.id ?? "Privy user"}
            </span>
          </p>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-3 py-1.5 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)]"
          >
            Sign out
          </button>
        </div>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[#F3E9FA]">
          BitGo Self-Custody Multisig Hot (Simple)
        </h1>
        <p className="mb-8 text-[#BDA9CC]">
          Create a 2-of-3 multisig hot wallet on <strong>Arbitrum Testnet</strong> (tarbeth) and receive addresses.
        </p>
        <div className="mb-6 flex flex-wrap gap-3">
          <Link href="/demo-flow" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Open Demo Flow
          </Link>
          <Link href="/transfer" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Open Normal Transfer
          </Link>
          <Link href="/recover-address" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Open Recovery Request Page
          </Link>
          <Link href="/guardian/requests" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Open Guardian Requests
          </Link>
          <Link href="/recovery-execute" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Open Recovery Transfer
          </Link>
          <Link href="/audit" className="text-xs font-mono uppercase tracking-[0.18em] text-[#D6BCE5] transition-colors hover:text-white">
            Open Audit Timeline
          </Link>
        </div>

        <section className="mb-10 grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-6">
          <div className="rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.78)] p-4 lg:sticky lg:top-24 lg:h-fit">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#BDA9CC]">Step 01</p>
            <h2 className="mt-2 text-lg font-semibold text-[#F3E9FA]">Add Guardians</h2>
          </div>
          <div className="rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <p className="mb-4 text-sm text-[#BDA9CC]">
            Before wallet creation, add exactly 3 guardian wallet identities and guardian emails.
          </p>
          <form onSubmit={handleSaveGuardianSetup} className="space-y-3">
            {guardianSetupInputs.map((value, index) => (
              <div key={`guardian-setup-${index}`}>
                <label
                  htmlFor={`guardian-setup-${index}`}
                  className="mb-1 block text-sm text-[#BDA9CC]"
                >
                  Guardian {index + 1} address or ENS
                </label>
                <input
                  id={`guardian-setup-${index}`}
                  type="text"
                  value={value.addressOrEns}
                  onChange={(e) => updateGuardianSetupInput(index, "addressOrEns", e.target.value)}
                  placeholder="0x... or guardian.eth"
                  className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
                />
                <label
                  htmlFor={`guardian-setup-email-${index}`}
                  className="mb-1 mt-2 block text-sm text-[#BDA9CC]"
                >
                  Guardian {index + 1} email
                </label>
                <input
                  id={`guardian-setup-email-${index}`}
                  type="email"
                  value={value.email}
                  onChange={(e) => updateGuardianSetupInput(index, "email", e.target.value)}
                  placeholder="guardian@example.com"
                  className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
                />
              </div>
            ))}
            <div>
              <label
                htmlFor="receiver-address"
                className="mb-1 block text-sm text-[#BDA9CC]"
              >
                Receiver address or ENS (optional, fallback destination)
              </label>
              <input
                id="receiver-address"
                type="text"
                value={receiverAddressInput}
                onChange={(e) => setReceiverAddressInput(e.target.value)}
                placeholder="0x... or receiver.eth (defaults to Guardian 1)"
                className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
              />
            </div>
            <button
              type="submit"
              disabled={guardianSetupLoading}
              className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
            >
              {guardianSetupLoading ? "Saving..." : "Save guardians"}
            </button>
          </form>
          {guardianSetupError && (
            <p className="mt-3 text-sm text-[#FF8CA9]">{guardianSetupError}</p>
          )}
          {guardianSetupSuccess && (
            <p className="mt-3 text-sm text-[#6FE6B4]">{guardianSetupSuccess}</p>
          )}
          <p className="mt-3 text-sm text-[#BDA9CC]">
            Status:{" "}
            <span className="font-medium">
              {guardianSetupCompleted ? "Completed (3/3 guardians added)" : "Pending guardian setup"}
            </span>
          </p>
          </div>
        </section>


        <section className="mb-10 grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-6">
          <div className="rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.78)] p-4 lg:sticky lg:top-24 lg:h-fit">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#BDA9CC]">Step 02</p>
            <h2 className="mt-2 text-lg font-semibold text-[#F3E9FA]">Create Wallet</h2>
          </div>
          <div className="rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          {!guardianSetupCompleted && (
            <p className="mb-4 text-sm text-[#F7C47B]">
              Complete Step 1 (add 3 guardians) to enable wallet creation.
            </p>
          )}
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div>
              <label htmlFor="label" className="mb-1 block text-sm text-[#BDA9CC]">
                Wallet label
              </label>
              <input
                id="label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="My Hot Wallet"
                disabled={!guardianSetupCompleted}
                className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !guardianSetupCompleted}
              className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create wallet"}
            </button>
          </form>
          {generateError && (
            <p className="mt-4 text-sm text-[#FF8CA9]">{generateError}</p>
          )}
          {generateResult ? (
            <div className="mt-4 rounded-lg border border-[rgb(122_27_122_/_0.5)] bg-[rgb(65_8_65_/_0.3)] p-4">
              <p className="mb-2 text-sm font-medium text-[#F7C47B]">
                Wallet created. Export user/backup keys once and store them in a secure vault.
              </p>
              {wallet && (
                <div className="space-y-1 text-sm text-[#D6BCE5]">
                  <p><span className="font-medium">Wallet ID:</span> {wallet.id ?? "-"}</p>
                  <p><span className="font-medium">Label:</span> {wallet.label ?? "-"}</p>
                  <p><span className="font-medium">Receive address:</span> {wallet.receiveAddress?.address ?? "-"}</p>
                </div>
              )}
              {wallet?.id && (
                <div className="mt-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleExportKeysOnce}
                    disabled={keyExportLoading}
                    className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
                  >
                    {keyExportLoading ? "Exporting..." : "Export user key once"}
                  </button>
                  {keyExportError && (
                    <p className="text-sm text-[#FF8CA9]">{keyExportError}</p>
                  )}
                  {Boolean(keyExportResult) && (
                    <pre className="max-h-80 overflow-auto rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.75)] p-3 text-xs text-[#D6BCE5]">
                      {JSON.stringify(keyExportResult, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : null}
          </div>
        </section>

        <section className="mb-10 grid gap-4 lg:grid-cols-[220px_1fr] lg:gap-6">
          <div className="rounded-xl border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.78)] p-4 lg:sticky lg:top-24 lg:h-fit">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#BDA9CC]">Step 03</p>
            <h2 className="mt-2 text-lg font-semibold text-[#F3E9FA]">Create Address</h2>
          </div>
          <div className="rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <form onSubmit={handleCreateAddress} className="flex flex-col gap-4">
            <div>
              <label htmlFor="addrWalletId" className="mb-1 block text-sm text-[#BDA9CC]">
                Wallet ID
              </label>
              <input
                id="addrWalletId"
                type="text"
                value={addrWalletId}
                onChange={(e) => setAddrWalletId(e.target.value)}
                placeholder="Wallet ID from create above"
                className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
              />
            </div>
            <button
              type="submit"
              disabled={addressLoading}
              className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
            >
              {addressLoading ? "Creating..." : "Create address"}
            </button>
          </form>
          {addressError && (
            <p className="mt-4 text-sm text-[#FF8CA9]">{addressError}</p>
          )}
          {addressResult && typeof addressResult === "object" && "address" in addressResult ? (
            <p className="mt-4 text-sm text-[#D6BCE5]">
              <span className="font-medium">New address:</span>{" "}
              {(addressResult as { address: string }).address}
            </p>
          ) : null}
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-[rgb(122_27_122_/_0.35)] bg-[linear-gradient(160deg,rgba(65,8,65,0.45),rgba(10,10,10,0.92))] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <p className="mb-4 text-sm text-[#BDA9CC]">
            Add exactly 3 trusted guardian addresses to a wallet and define a recovery threshold (for
            example, <span className="font-semibold">2-of-3</span> guardians required).
          </p>

          <div className="mb-4 space-y-2">
            <label
              htmlFor="guardianWalletId"
              className="mb-1 block text-sm text-[#BDA9CC]"
            >
              Wallet ID
            </label>
            <input
              id="guardianWalletId"
              type="text"
              value={guardianWalletId}
              onChange={(e) => setGuardianWalletId(e.target.value)}
              placeholder="Wallet ID to manage guardians"
              className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
            />
            <button
              type="button"
              onClick={loadGuardians}
              disabled={guardianLoading || !guardianWalletId.trim()}
              className="mt-2 inline-flex rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-3 py-1.5 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
            >
              {guardianLoading ? "Loading..." : "Load guardians"}
            </button>
          </div>

          {guardianError && (
            <p className="mb-4 text-sm text-[#FF8CA9]">{guardianError}</p>
          )}

          {guardiansState && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#D6BCE5]">
                  Current guardians
                </h3>
                {guardiansState.guardians.length === 0 ? (
                  <p className="text-sm text-[#BDA9CC]/90">
                    No guardians added for this wallet yet.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm text-[#D6BCE5]">
                    {guardiansState.guardians.map((g) => (
                      <li
                        key={g}
                        className="flex items-center justify-between rounded-lg border border-[rgb(122_27_122_/_0.35)] bg-[rgb(10_10_10_/_0.7)] px-3 py-2"
                      >
                        <span className="break-all">{g}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveGuardian(g)}
                          disabled={guardianLoading}
                          className="ml-3 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={handleAddGuardian} className="space-y-2">
                <label
                  htmlFor="guardianAddress"
                  className="mb-1 block text-sm text-[#BDA9CC]"
                >
                  Add guardian address
                </label>
                <p className="text-xs text-[#BDA9CC]/90">
                  Guardians added:{" "}
                  <span className="font-medium">
                    {guardiansState.guardians.length}/{MAX_GUARDIANS}
                  </span>
                </p>
                <input
                  id="guardianAddress"
                  type="text"
                  value={guardianAddressInput}
                  onChange={(e) => setGuardianAddressInput(e.target.value)}
                  placeholder="0xguardian..."
                  disabled={guardianLoading || guardiansState.guardians.length >= MAX_GUARDIANS}
                  className="w-full rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.8)] px-3 py-2 text-[#EBDDF7] placeholder:text-[#9D86B2]"
                />
                <button
                  type="submit"
                  disabled={guardianLoading || guardiansState.guardians.length >= MAX_GUARDIANS}
                  className="rounded border border-[rgb(122_27_122_/_0.6)] bg-[rgb(65_8_65_/_0.45)] px-4 py-2 text-sm font-medium text-[#EBDDF7] transition-colors hover:border-[rgb(122_27_122)] hover:bg-[rgb(122_27_122_/_0.3)] disabled:opacity-50"
                >
                  {guardianLoading
                    ? "Saving..."
                    : guardiansState.guardians.length >= MAX_GUARDIANS
                      ? "3 guardians added"
                      : "Add guardian"}
                </button>
              </form>
              <div className="rounded-lg border border-[rgb(122_27_122_/_0.45)] bg-[rgb(10_10_10_/_0.7)] px-3 py-2 text-sm text-[#D6BCE5]">
                Recovery threshold is compulsory and fixed at{" "}
                <span className="font-semibold">2 approvals</span>
                {guardiansState.guardians.length > 0
                  ? ` (${guardiansState.threshold}-of-${guardiansState.guardians.length})`
                  : "."}
              </div>
            </div>
          )}
          
        </section>
      </main>
    </div>
  );
}
















