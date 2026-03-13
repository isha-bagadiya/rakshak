"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

  if (!appId) {
    throw new Error("Missing NEXT_PUBLIC_PRIVY_APP_ID. Add it to your environment before starting the app.");
  }

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        loginMethods: ["email", "wallet"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
