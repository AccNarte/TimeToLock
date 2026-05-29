import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `standalone` produces a self-contained `.next/standalone/` folder with a
  // tiny `server.js` and only the runtime deps the app actually imports.
  // Drastically smaller deploy artifact, run with: `node .next/standalone/server.js`
  output: 'standalone',
  // Silence Turbopack warning (webpack config is present but works fine with Turbopack)
  turbopack: {},
  // Transpile wagmi and related packages for compatibility
  transpilePackages: [
    'wagmi',
    '@wagmi/core',
    '@wagmi/connectors',
    '@rainbow-me/rainbowkit',
    '@walletconnect/ethereum-provider',
    '@walletconnect/universal-provider',
  ],
  webpack: (config, { isServer }) => {
    // Handle Node.js polyfills for client-side
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      crypto: false,
    };
    
    // Externalize server-side only packages
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // Ignore optional React Native dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };
    
    return config;
  },
};

export default nextConfig;
