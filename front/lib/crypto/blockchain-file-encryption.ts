/**
 * Blockchain File Encryption Service
 *
 * Encrypts files using AES-256-GCM with a random key.
 * The AES key is then encrypted using the wallet signature.
 * The encrypted key is stored on blockchain, the encrypted file on IPFS.
 */

// Message to sign for key derivation - must be consistent
const KEY_DERIVATION_MESSAGE = 'TimeLock File Encryption Key Derivation v1';

/**
 * Convert ArrayBuffer to Hex string
 */
function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert Hex string to Uint8Array
 */
function hexToBuffer(hex: string): Uint8Array {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert ArrayBuffer to Base64
 */
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to ArrayBuffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Uint8Array to proper ArrayBuffer for Web Crypto API
 * This ensures compatibility with TypeScript strict mode
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return new Uint8Array(data).buffer as ArrayBuffer;
}

/**
 * Generate a random AES-256 key
 */
export async function generateAESKey(): Promise<Uint8Array> {
  const key = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  return key;
}

/**
 * Import raw AES key bytes as CryptoKey
 */
async function importAESKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  // Create a new ArrayBuffer copy to ensure compatibility
  const keyBuffer = new Uint8Array(keyBytes).buffer as ArrayBuffer;
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive an encryption key from wallet signature using PBKDF2
 */
async function deriveKeyFromSignature(signature: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const signatureBytes = hexToBuffer(signature);

  // Import signature as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(signatureBytes),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use a fixed salt for deterministic key derivation
  const salt = encoder.encode('timelock-file-key-derivation-salt-v1');

  // Derive AES key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt the AES key with the wallet signature
 * Returns the encrypted key as hex string (for blockchain storage)
 */
export async function encryptKeyForBlockchain(
  aesKey: Uint8Array,
  walletSignature: string
): Promise<string> {
  const derivedKey = await deriveKeyFromSignature(walletSignature);

  // Use a fixed IV for the key encryption (since the signature is unique per user)
  const iv = new TextEncoder().encode('tlk-key-iv01'); // 12 bytes

  const encryptedKey = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    derivedKey,
    toArrayBuffer(aesKey)
  );

  // Return as hex (0x prefixed for blockchain)
  return '0x' + bufferToHex(encryptedKey);
}

/**
 * Decrypt the AES key using the wallet signature
 * Returns the raw AES key bytes
 */
export async function decryptKeyFromBlockchain(
  encryptedKeyHex: string,
  walletSignature: string
): Promise<Uint8Array> {
  const derivedKey = await deriveKeyFromSignature(walletSignature);
  const encryptedKeyBytes = hexToBuffer(encryptedKeyHex);

  // Same fixed IV as encryption
  const iv = new TextEncoder().encode('tlk-key-iv01');

  const decryptedKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    derivedKey,
    toArrayBuffer(encryptedKeyBytes)
  );

  return new Uint8Array(decryptedKey);
}

/**
 * Encrypt a file with AES-256-GCM
 */
export interface EncryptedFileData {
  encryptedFile: ArrayBuffer;
  iv: string; // Hex encoded
  fileHash: string; // SHA-256 of original file
}

export async function encryptFileWithKey(
  fileBuffer: ArrayBuffer,
  aesKeyBytes: Uint8Array
): Promise<EncryptedFileData> {
  const key = await importAESKey(aesKeyBytes);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    key,
    fileBuffer
  );

  // Calculate hash of original file
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
  const fileHash = bufferToHex(hashBuffer);

  // Prepend IV to encrypted data for storage
  const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encryptedBuffer), iv.length);

  return {
    encryptedFile: toArrayBuffer(result),
    iv: bufferToHex(iv),
    fileHash,
  };
}

/**
 * Decrypt a file with AES-256-GCM
 */
export async function decryptFileWithKey(
  encryptedData: ArrayBuffer,
  aesKeyBytes: Uint8Array
): Promise<ArrayBuffer> {
  const key = await importAESKey(aesKeyBytes);

  // Extract IV (first 12 bytes)
  const encryptedArray = new Uint8Array(encryptedData);
  const iv = encryptedArray.slice(0, 12);
  const ciphertext = encryptedArray.slice(12);

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toArrayBuffer(iv),
      tagLength: 128,
    },
    key,
    toArrayBuffer(ciphertext)
  );

  return decryptedBuffer;
}

/**
 * Complete encryption flow for blockchain file locking
 *
 * 1. Generates random AES key
 * 2. Encrypts file with AES key
 * 3. Encrypts AES key with wallet signature
 */
export interface BlockchainFileEncryptionResult {
  encryptedFile: ArrayBuffer;
  encryptedKey: string; // Hex with 0x prefix (for blockchain)
  iv: string;
  fileHash: string;
  originalSize: number;
}

export async function encryptFileForBlockchain(
  file: File,
  walletSignature: string
): Promise<BlockchainFileEncryptionResult> {
  // Read file
  const fileBuffer = await file.arrayBuffer();
  const originalSize = fileBuffer.byteLength;

  // Generate random AES key
  const aesKey = await generateAESKey();

  // Encrypt file with AES key
  const { encryptedFile, iv, fileHash } = await encryptFileWithKey(fileBuffer, aesKey);

  // Encrypt AES key with wallet signature
  const encryptedKey = await encryptKeyForBlockchain(aesKey, walletSignature);

  return {
    encryptedFile,
    encryptedKey,
    iv,
    fileHash,
    originalSize,
  };
}

/**
 * Complete decryption flow for blockchain file unlocking
 *
 * 1. Decrypts AES key using wallet signature
 * 2. Decrypts file with AES key
 */
export async function decryptFileFromBlockchain(
  encryptedFile: ArrayBuffer,
  encryptedKeyHex: string,
  walletSignature: string
): Promise<ArrayBuffer> {
  // Decrypt AES key
  const aesKey = await decryptKeyFromBlockchain(encryptedKeyHex, walletSignature);

  // Decrypt file
  const decryptedFile = await decryptFileWithKey(encryptedFile, aesKey);

  return decryptedFile;
}

/**
 * Download decrypted file
 */
export function downloadDecryptedFile(
  data: ArrayBuffer,
  filename: string,
  mimeType: string = 'application/octet-stream'
): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get the message to sign for key derivation
 */
export function getKeyDerivationMessage(): string {
  return KEY_DERIVATION_MESSAGE;
}
