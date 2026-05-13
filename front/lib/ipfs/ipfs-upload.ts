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

/**
 * Fetch a file from IPFS via gateway
 */
export async function fetchFromIPFS(ipfsHash: string): Promise<ArrayBuffer> {
  const url = getGatewayUrl(ipfsHash);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
  }

  return response.arrayBuffer();
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
