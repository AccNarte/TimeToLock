/**
 * IPFS Upload Service using Pinata
 * Used for uploading encrypted files to IPFS
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'https://gateway.pinata.cloud';
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || '';

export interface IpfsUploadResult {
  ipfsHash: string;
  pinSize: number;
  timestamp: string;
  gatewayUrl: string;
}

/**
 * Upload an encrypted file buffer to IPFS via Pinata
 */
export async function uploadToIPFS(
  fileBuffer: ArrayBuffer,
  filename: string,
  metadata?: Record<string, string>
): Promise<IpfsUploadResult> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
  formData.append('file', blob, filename);

  // Add metadata if provided
  if (metadata) {
    const pinataMetadata = JSON.stringify({
      name: filename,
      keyvalues: metadata,
    });
    formData.append('pinataMetadata', pinataMetadata);
  }

  // Configure pinning options
  const pinataOptions = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', pinataOptions);

  const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`IPFS upload failed: ${error.error || response.statusText}`);
  }

  const result = await response.json();

  return {
    ipfsHash: result.IpfsHash,
    pinSize: result.PinSize,
    timestamp: result.Timestamp,
    gatewayUrl: getGatewayUrl(result.IpfsHash),
  };
}

/**
 * Upload JSON data to IPFS via Pinata
 */
export async function uploadJsonToIPFS(
  jsonData: Record<string, any>,
  name: string
): Promise<IpfsUploadResult> {
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify({
      pinataContent: jsonData,
      pinataMetadata: {
        name,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`IPFS JSON upload failed: ${error.error || response.statusText}`);
  }

  const result = await response.json();

  return {
    ipfsHash: result.IpfsHash,
    pinSize: result.PinSize,
    timestamp: result.Timestamp,
    gatewayUrl: getGatewayUrl(result.IpfsHash),
  };
}

// Fallback gateways tried in order when the configured gateway returns
// something unusable (auth required, not yet propagated, rate-limited, etc.).
const FALLBACK_GATEWAYS = [
  'https://gateway.pinata.cloud',
  'https://ipfs.io',
  'https://cloudflare-ipfs.com',
  'https://dweb.link',
];

/**
 * Try a single gateway. Returns the body if 2xx, otherwise an error with
 * context to surface in logs.
 */
async function tryGateway(gateway: string, ipfsHash: string): Promise<ArrayBuffer> {
  const url = `${gateway.replace(/\/$/, '')}/ipfs/${ipfsHash}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `${gateway} → HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
    );
  }
  return response.arrayBuffer();
}

/**
 * Fetch a file from IPFS. Tries the configured gateway first, then a series
 * of public fallback gateways. Dedicated Pinata gateways sometimes require an
 * access token or take a few seconds to propagate after a fresh pin — the
 * fallbacks paper over both.
 */
export async function fetchFromIPFS(ipfsHash: string): Promise<ArrayBuffer> {
  const gatewaysToTry = [PINATA_GATEWAY, ...FALLBACK_GATEWAYS].filter(
    (g, i, arr) => g && arr.indexOf(g) === i, // dedupe + drop empty
  );

  const errors: string[] = [];
  for (const gateway of gatewaysToTry) {
    try {
      return await tryGateway(gateway, ipfsHash);
    } catch (err: any) {
      errors.push(err.message || String(err));
    }
  }

  throw new Error(
    `Failed to fetch from IPFS (${ipfsHash}). Tried gateways:\n  - ${errors.join('\n  - ')}`,
  );
}

/**
 * Get the gateway URL for an IPFS hash
 */
export function getGatewayUrl(ipfsHash: string): string {
  // Handle different CID formats
  if (ipfsHash.startsWith('Qm')) {
    // CIDv0
    return `${PINATA_GATEWAY}/ipfs/${ipfsHash}`;
  }
  // CIDv1 or other formats
  return `${PINATA_GATEWAY}/ipfs/${ipfsHash}`;
}

/**
 * Get ipfs:// protocol URL
 */
export function getIpfsProtocolUrl(ipfsHash: string): string {
  return `ipfs://${ipfsHash}`;
}

/**
 * Check if Pinata is configured
 */
export function isPinataConfigured(): boolean {
  return !!PINATA_JWT;
}
