import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';

const LABEL_MAX_LENGTH = 256;

type BitGo = Awaited<ReturnType<typeof getBitGo>>;

/** Coins that require TSS/MPC keys (e.g. Base). Independent keys not supported. */
const TSS_COINS = ['tbaseeth', 'baseeth'];

/** TSS flow for Base: create MPC keys via SDK then add wallet (multisigType: tss). */
async function createWalletTSS(
  bitgo: BitGo,
  coin: string,
  params: { label: string; passphrase: string; enterprise: string },
): Promise<{ wallet: unknown; userKeychain: unknown; backupKeychain: unknown; bitgoKeychain: unknown }> {
  type CoinWithMpc = {
    coin(name: string): { keychains(): { createMpc(opts: { multisigType: string; passphrase: string; enterprise: string }): Promise<{ userKeychain: { id: string }; backupKeychain: { id: string }; bitgoKeychain: { id: string } }> } };
  };
  const bg = bitgo as unknown as CoinWithMpc;
  const coinObj = bg.coin(coin);
  const keychains = await coinObj.keychains().createMpc({
    multisigType: 'tss',
    passphrase: params.passphrase,
    enterprise: params.enterprise,
  });

  const url = (path: string) => (bitgo as { url(path: string, version?: number): string }).url(path, 2);
  const post = (path: string, body: object) =>
    (bitgo as { post(u: string): { send(b: object): { result(): Promise<unknown> } } })
      .post(url(path))
      .send(body)
      .result();

  // Omit walletVersion so BitGo server picks the valid default for tbaseeth (sending 4 can cause "Invalid wallet version: 4")
  const walletBody: Record<string, unknown> = {
    label: params.label,
    enterprise: params.enterprise,
    m: 2,
    n: 3,
    keys: [keychains.userKeychain.id, keychains.backupKeychain.id, keychains.bitgoKeychain.id],
    type: 'hot',
    multisigType: 'tss',
  };
  const wallet = await post(`/${coin}/wallet/add`, walletBody);

  return {
    wallet,
    userKeychain: keychains.userKeychain,
    backupKeychain: keychains.backupKeychain,
    bitgoKeychain: keychains.bitgoKeychain,
  };
}

/** BitGo server v2 flow: create user/backup/bitgo independent keys then add wallet (for coins that support onchain multisig). */
async function createWalletWithKeychainsServer(
  bitgo: BitGo,
  coin: string,
  params: { label: string; passphrase: string; enterprise: string },
): Promise<{ wallet: unknown; userKeychain: unknown; backupKeychain: unknown; bitgoKeychain: unknown }> {
  const url = (path: string) => (bitgo as { url(path: string, version?: number): string }).url(path, 2);
  const post = (path: string, body: object) =>
    (bitgo as { post(u: string): { send(b: object): { result(): Promise<unknown> } } })
      .post(url(path))
      .send(body)
      .result();

  // 1. Create user key locally (SDK), encrypt, upload to BitGo server
  const keychains = (bitgo as unknown as { keychains(): { create(): { xpub: string; xprv: string }; encrypt(opts: { password: string; input: string }): string } }).keychains();
  const userKey = keychains.create();
  const encryptedUserPrv = (bitgo as { encrypt(params: { password: string; input: string }): string }).encrypt({
    password: params.passphrase,
    input: userKey.xprv,
  });
  const userKeychain = (await post(`/${coin}/key`, {
    enterprise: params.enterprise,
    source: 'user',
    pub: userKey.xpub,
    encryptedPrv: encryptedUserPrv,
  })) as { id: string };

  // 2. Create backup key locally, encrypt, upload (hot = we store encrypted backup)
  const backupKey = keychains.create();
  const encryptedBackupPrv = (bitgo as { encrypt(params: { password: string; input: string }): string }).encrypt({
    password: params.passphrase,
    input: backupKey.xprv,
  });
  const backupKeychain = (await post(`/${coin}/key`, {
    enterprise: params.enterprise,
    source: 'backup',
    pub: backupKey.xpub,
    encryptedPrv: encryptedBackupPrv,
  })) as { id: string };

  // 3. Create BitGo key on server (source: bitgo, no pub/encryptedPrv)
  const bitgoKeychain = (await post(`/${coin}/key`, {
    enterprise: params.enterprise,
    source: 'bitgo',
  })) as { id: string };

  // 4. Add wallet with the three key IDs (BitGo server wallet/add, not Express generate)
  const walletBody: Record<string, unknown> = {
    label: params.label,
    enterprise: params.enterprise,
    m: 2,
    n: 3,
    keys: [userKeychain.id, backupKeychain.id, bitgoKeychain.id],
    type: 'hot',
    multisigType: 'onchain',
  };
  const wallet = await post(`/${coin}/wallet/add`, walletBody);

  return {
    wallet,
    userKeychain: { ...userKeychain, pub: userKey.xpub, encryptedPrv: encryptedUserPrv },
    backupKeychain: { ...backupKeychain, pub: backupKey.xpub, encryptedPrv: encryptedBackupPrv, prv: backupKey.xprv },
    bitgoKeychain,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const coin = typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();

    if (!label) {
      return NextResponse.json(
        { error: 'Missing or empty "label" in request body.' },
        { status: 400 },
      );
    }
    if (label.length > LABEL_MAX_LENGTH) {
      return NextResponse.json(
        { error: `"label" must be at most ${LABEL_MAX_LENGTH} characters.` },
        { status: 400 },
      );
    }
    if (!isAllowedCoin(coin)) {
      return NextResponse.json(
        { error: `Invalid "coin". Only Base Ethereum Testnet (tbaseeth) is allowed.` },
        { status: 400 },
      );
    }

    const enterprise = process.env.ENTERPRISE_ID;
    const passphrase = process.env.WALLET_PASSPHRASE;

    if (!enterprise) {
      return NextResponse.json(
        { error: 'ENTERPRISE_ID is not set in environment.' },
        { status: 500 },
      );
    }
    if (!passphrase) {
      return NextResponse.json(
        { error: 'WALLET_PASSPHRASE is not set in environment.' },
        { status: 500 },
      );
    }

    const bitgo = await getBitGo();
    const result = TSS_COINS.includes(coin)
      ? await createWalletTSS(bitgo, coin, { label, passphrase, enterprise })
      : await createWalletWithKeychainsServer(bitgo, coin, { label, passphrase, enterprise });

    return NextResponse.json({
      ...result,
      _warning:
        'Backup the backup keychain once; it is not stored anywhere else. This response may contain sensitive key material.',
    });
  } catch (error) {
    const message = toUserMessage(error);
    const status = (error as { status?: number })?.status;
    return NextResponse.json(
      { error: message },
      { status: typeof status === 'number' && status >= 400 && status < 600 ? status : 500 },
    );
  }
}
