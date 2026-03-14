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
    return 'Enterprise fee address has insufficient funds. Fund your enterprise in BitGo test before retrying.';
  }
  if (raw.includes('Independent keys are not support') || raw.includes('independent keys')) {
    return 'This coin does not support independent key creation in this flow. Use a coin that supports Self-Custody Multisig Hot (Simple), such as tarbeth.';
  }
  return raw || 'Unknown BitGo error';
}



