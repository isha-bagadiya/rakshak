import { BitGoAPI, type BitGoAPIOptions } from '@bitgo/sdk-api';
import { register, Teth } from '@bitgo/sdk-coin-eth';

const ENV_DEFAULT = 'test';
/** Base Ethereum Testnet only (BitGo coin id: tbaseeth). */
const COIN_DEFAULT = 'tbaseeth';

let bitgoPromise: Promise<BitGoAPI> | null = null;

async function initBitGo(): Promise<BitGoAPI> {
  const accessToken = process.env.ACCESS_TOKEN;
  const env = ((process.env.ENV as string | undefined) ??
    ENV_DEFAULT) as NonNullable<BitGoAPIOptions['env']>;

  if (!accessToken) {
    throw new Error('BitGo ACCESS_TOKEN is not set in environment variables');
  }

  const sdk = new BitGoAPI({ env });
  register(sdk);
  // Base uses same EVM/TSS stack as Ethereum testnet; register so coin('tbaseeth') works for createMpc
  sdk.register('tbaseeth', Teth.createInstance);
  sdk.register('baseeth', Teth.createInstance);

  await sdk.authenticateWithAccessToken({ accessToken });

  return sdk;
}

export function getBitGo(): Promise<BitGoAPI> {
  if (!bitgoPromise) {
    bitgoPromise = initBitGo();
  }
  return bitgoPromise;
}

/** Default coin for wallet ops (e.g. teth, hteth). Override with BITGO_COIN. */
export function getDefaultCoin(): string {
  return (process.env.BITGO_COIN as string | undefined) ?? COIN_DEFAULT;
}

/** Allowed coins: Base Ethereum Testnet only. */
export const ALLOWED_COINS = ['tbaseeth'] as const;
export type AllowedCoin = (typeof ALLOWED_COINS)[number];

export function isAllowedCoin(coin: string): coin is AllowedCoin {
  return ALLOWED_COINS.includes(coin as AllowedCoin);
}

