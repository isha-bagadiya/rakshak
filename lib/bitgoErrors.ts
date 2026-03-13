export function toUserMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('IP-restricted') || raw.includes('unauthorized IP')) {
    return 'BitGo token is IP-restricted. Add this server\'s IP to the token allowlist in the BitGo dashboard (or use a token without IP restriction).';
  }
  if (raw.includes('ACCESS_TOKEN') || raw.includes('access token') || raw.includes('Unauthorized')) {
    return 'Invalid or missing BitGo access token. Set ACCESS_TOKEN in your environment and ensure the token is valid in the BitGo dashboard.';
  }
  if (raw.includes('ECONNREFUSED') || raw.includes('network') || raw.includes('fetch')) {
    return 'Could not reach BitGo. Check your network and BitGo service status.';
  }
  if (raw.includes('insufficient funds in fee address') || raw.includes('fee address')) {
    return 'Enterprise gas tank (fee address) has insufficient funds. Fund it in BitGo: app.bitgo-test.com → Gas Tanks → select tbaseeth (Base Ethereum Testnet) → Deposit. Send at least ~0.01 testnet Base ETH to the shown address. See: https://developers.bitgo.com/docs/get-started-gas-tanks';
  }
  if (raw.includes('Independent keys are not support') || raw.includes('independent keys')) {
    return 'This coin (Base/tbaseeth) requires TSS/MPC keys, not independent keys. The app should use the TSS flow; if you still see this, the TSS key creation may have failed. Check server logs.';
  }
  return raw || 'Unknown BitGo error';
}
