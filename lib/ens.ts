const ENS_RESOLVE_TIMEOUT_MS = 8000;

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function isValidEnsName(value: string): boolean {
  const name = value.trim().toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/.test(name);
}

export async function resolveEnsToAddress(nameInput: string): Promise<string | null> {
  const name = nameInput.trim().toLowerCase();
  if (!isValidEnsName(name)) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENS_RESOLVE_TIMEOUT_MS);
  try {
    const response = await fetch(`https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    const address = typeof data?.address === 'string' ? data.address.trim() : '';
    return isValidEvmAddress(address) ? address : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function parseAddressOrEns(valueInput: string): Promise<{ address: string; ensName?: string } | null> {
  const value = valueInput.trim();
  if (!value) return null;

  if (isValidEvmAddress(value)) {
    return { address: value };
  }

  if (!isValidEnsName(value)) {
    return null;
  }

  const resolved = await resolveEnsToAddress(value);
  if (!resolved) return null;
  return { address: resolved, ensName: value.toLowerCase() };
}
