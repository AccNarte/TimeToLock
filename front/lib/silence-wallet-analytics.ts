// Short-circuit fetch calls to wallet-SDK telemetry endpoints so they neither
// hit the network nor surface "Analytics SDK: Failed to fetch" in the console.
// These come from transitive deps (Coinbase Wallet SDK, MetaMask SDK) pulled in
// by RainbowKit; they have no impact on wallet functionality.

const BLOCKED_HOSTS = [
  'as.coinbase.com',
  'analytics-service-dev.cbhq.net',
  'analytics-service-internal-dev.cbhq.net',
  'analytics-service-internal.cbhq.net',
  'cca-lite.coinbase.com',
  'mm-sdk-analytics.api.cx.metamask.io',
  'metamask-sdk-analytics.api.cx.metamask.io',
];

let patched = false;

export function silenceWalletAnalytics() {
  if (patched || typeof window === 'undefined') return;
  patched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    let url = '';
    try {
      url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    } catch {
      return originalFetch(input, init);
    }

    if (url && BLOCKED_HOSTS.some((host) => url.includes(host))) {
      return new Response(null, { status: 204, statusText: 'No Content' });
    }

    return originalFetch(input, init);
  };
}
