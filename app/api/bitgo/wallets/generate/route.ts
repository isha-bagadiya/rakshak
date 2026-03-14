import { NextResponse } from 'next/server';
import { getBitGo, getDefaultCoin, isAllowedCoin } from '@/lib/bitgo';
import { toUserMessage } from '@/lib/bitgoErrors';
import { getRequestIdentity } from '@/lib/requestIdentity';
import { setWalletOwner } from '@/lib/walletOwnersDb';
import { getRequiredUserGuardians, hasRequiredUserGuardians } from '@/lib/userGuardiansDb';
import { saveKeyExportRecord } from '@/lib/keyExportDb';
import { encryptBackupPrivateKey } from '@/lib/backupKeyCrypto';
import { storeBackupKeyRecord } from '@/lib/backupKeyStore';

const LABEL_MAX_LENGTH = 256;

type BitGo = Awaited<ReturnType<typeof getBitGo>>;
type PublicKeychain = { id: string; pub: string; encryptedPrv: string };
type PrivateMaterial = { userPrv: string; backupPrv: string };

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function getWalletIdFromResult(result: { wallet: unknown }): string | null {
  const wallet = result.wallet;
  if (!wallet || typeof wallet !== 'object') {
    return null;
  }

  const maybeId = (wallet as { id?: unknown }).id;
  return typeof maybeId === 'string' && maybeId.trim() ? maybeId : null;
}

/** BitGo server v2 flow: create user/backup/bitgo independent keys then add wallet (for coins that support onchain multisig). */
async function createWalletWithKeychainsServer(
  bitgo: BitGo,
  coin: string,
  params: { label: string; passphrase: string; enterprise: string },
): Promise<{
  wallet: unknown;
  userKeychain: PublicKeychain;
  backupKeychain: PublicKeychain;
  bitgoKeychain: unknown;
  privateMaterial: PrivateMaterial;
}> {
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
    backupKeychain: { ...backupKeychain, pub: backupKey.xpub, encryptedPrv: encryptedBackupPrv },
    bitgoKeychain,
    privateMaterial: {
      userPrv: userKey.xprv,
      backupPrv: backupKey.xprv,
    },
  };
}

export async function POST(request: Request) {
  try {
    const identity = getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const coin = typeof body.coin === 'string' ? body.coin.trim().toLowerCase() : getDefaultCoin();
    const receiverAddress = typeof body.receiverAddress === 'string' ? body.receiverAddress.trim() : '';

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
        { error: `Invalid "coin". Only Arbitrum Testnet (tarbeth) is allowed.` },
        { status: 400 },
      );
    }
    if (receiverAddress && !isValidEvmAddress(receiverAddress)) {
      return NextResponse.json(
        { error: 'Invalid "receiverAddress". Must be a valid EVM address.' },
        { status: 400 },
      );
    }

    const hasGuardians = await hasRequiredUserGuardians(identity.email);
    if (!hasGuardians) {
      return NextResponse.json(
        { error: 'Please add exactly 3 guardian addresses before creating a wallet.' },
        { status: 400 },
      );
    }
    const guardians = await getRequiredUserGuardians(identity.email);
    const receiver = receiverAddress || guardians[0].address;

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
    const result = await createWalletWithKeychainsServer(bitgo, coin, {
      label,
      passphrase,
      enterprise,
    });
    const walletId = getWalletIdFromResult(result);
    let keyExportExpiresAt: string | null = null;
    if (walletId) {
      await setWalletOwner(walletId, identity.email);
      await storeBackupKeyRecord({
        walletId,
        ownerEmail: identity.email,
        coin,
        backupKeychainId: result.backupKeychain.id,
        backupPub: result.backupKeychain.pub,
        backupEncryptedPrv: result.backupKeychain.encryptedPrv,
        encryptedBackupPrv: encryptBackupPrivateKey(result.privateMaterial.backupPrv),
        guardians,
        receiverAddress: receiver,
      });
      const exportRecord = await saveKeyExportRecord({
        walletId,
        ownerEmail: identity.email,
        payload: {
          userKeychain: {
            ...result.userKeychain,
            prv: result.privateMaterial.userPrv,
          },
        },
      });
      keyExportExpiresAt = exportRecord.expiresAt;
    }

    return NextResponse.json({
      wallet: result.wallet,
      bitgoKeychain: result.bitgoKeychain,
      keyExport: walletId
        ? {
            path: `/api/bitgo/wallets/${walletId}/key-export`,
            method: 'POST',
            expiresAt: keyExportExpiresAt,
          }
        : null,
      _warning:
        'Sensitive private keys are not returned here. Use the one-time key export endpoint immediately.',
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


