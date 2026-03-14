import { BitGoAPI, type BitGoAPIOptions } from '@bitgo/sdk-api';
import { register as registerEth } from '@bitgo/sdk-coin-eth';
import { register as registerArbeth } from '@bitgo/sdk-coin-arbeth';

const ENV_DEFAULT = 'test';
/** Arbitrum Testnet (BitGo coin id: tarbeth). */
const COIN_DEFAULT = 'tarbeth';

let bitgoPromise: Promise<BitGoAPI> | null = null;

async function initBitGo(): Promise<BitGoAPI> {
  const accessToken = process.env.ACCESS_TOKEN;
  const env = ((process.env.ENV as string | undefined) ??
    ENV_DEFAULT) as NonNullable<BitGoAPIOptions['env']>;

  if (!accessToken) {
    throw new Error('BitGo ACCESS_TOKEN is not set in environment variables');
  }

  const sdk = new BitGoAPI({ env });
  registerEth(sdk);
  registerArbeth(sdk);

  await sdk.authenticateWithAccessToken({ accessToken });

  return sdk;
}

export function getBitGo(): Promise<BitGoAPI> {
  if (!bitgoPromise) {
    bitgoPromise = initBitGo();
  }
  return bitgoPromise;
}

/** Default coin for wallet ops (e.g. tarbeth). Override with BITGO_COIN. */
export function getDefaultCoin(): string {
  return (process.env.BITGO_COIN as string | undefined) ?? COIN_DEFAULT;
}

/** Allowed coins: Arbitrum Testnet only. */
export const ALLOWED_COINS = ['tarbeth'] as const;
export type AllowedCoin = (typeof ALLOWED_COINS)[number];

export function isAllowedCoin(coin: string): coin is AllowedCoin {
  return ALLOWED_COINS.includes(coin as AllowedCoin);
}



