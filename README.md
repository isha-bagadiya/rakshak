This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Privy Authentication Setup

1. Create a Privy app in the [Privy dashboard](https://dashboard.privy.io/) and copy:
   - `App ID`
   - `Client ID` (if enabled for your app)
2. Add these to your env file:

   ```bash
   NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
   NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id
   ```

3. Install the SDK:

   ```bash
   npm install @privy-io/react-auth
   ```

The app now requires Privy sign-in before showing the existing BitGo wallet and guardian flows.

## BitGo Testnet Setup

1. Create a BitGo test account at [https://app.bitgo-test.com](https://app.bitgo-test.com) (OTP in test is `0000000`).
2. **Create a long-lived access token** (in the BitGo test app, go to **User Menu → Developer → Access Tokens → Add**, or similar). Use this as a checklist:

   | Field | What to fill (test environment) |
   |-------|----------------------------------|
   | **Label** | Any name, e.g. `Hackathon Dev` or `Catchup API` |
   | **OTP** | Always `0000000` in test |
   | **Expiration / Duration** | e.g. 90 days or 1 year (avoid 10 years) |
   | **Enterprise** | Select your only enterprise (or copy its ID from the URL or from login API response: `user.enterprises[0].id`) |
   | **Scopes / Permissions** | For this project, enable at least: **wallet_create**, **wallet_view_all**, **wallet_spend_all**, **wallet_manage_all**, **wallet_edit_all**, **wallet_approve_all**. You can also enable **enterprise_view_all** if you use enterprise APIs. |
   | **Spending limit** | Add a limit so you don’t need to “unlock” the token for each send. **Coin**: pick a testnet coin (e.g. **tarbeth** for Arbitrum Testnet or **tbtc4** for Bitcoin testnet). **Limit**: e.g. `1000000000000000000` (1e18 wei for tarbeth) or `100000000` (1 BTC in satoshis for tbtc4). You can add multiple coins if needed. |
   | **IP restriction** | In **test** you can often leave empty. If required, you can use your current IP or a CIDR like `0.0.0.0/0` only for local/dev (never in production). |
   | **Admin** | Leave **unchecked** (no need for user management). |

   After saving, **copy the token once** (it’s shown only at creation) into your `.env` as `ACCESS_TOKEN`.  
   More detail: [Create Access Tokens](https://developers.bitgo.com/docs/get-started-access-tokens).
3. Copy `.env.example` to `.env` in the project root and fill in:
   - `ACCESS_TOKEN`
   - `ENV` (keep as `test` for the BitGo test environment)
   - `WALLET_PASSPHRASE`
   - `ENTERPRISE_ID`
   - `BITGO_EXPRESS_URL` (optional, for when you run BitGo Express)
   - `BITGO_COIN` (optional; this app uses **Arbitrum Testnet** only, `tarbeth`)
4. Install dependencies (if not already done):

   ```bash
   yarn
   ```

5. **Use a simple on-chain multisig coin in test**  
   This app is configured for **Arbitrum Testnet (`tarbeth`)** and uses Self-Custody Multisig Hot (Simple) keychains.

6. Start the dev server and visit `/api/bitgo/status` to confirm BitGo testnet connectivity:

   ```bash
   yarn dev
   ```

   The endpoint should return `ok: true` when your environment variables are correctly configured.



