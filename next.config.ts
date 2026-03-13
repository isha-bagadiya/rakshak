import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't bundle BitGo SDK and its WASM-dependent deps; run them in Node
  serverExternalPackages: [
    "@bitgo/sdk-api",
    "@bitgo/sdk-coin-eth",
    "@bitgo/sdk-lib-mpc",
    "@wasmer/wasi",
  ],
};

export default nextConfig;
