import { ethers } from 'ethers';

/**
 * Embedded Wallet Utilities
 *
 * Provides client-side wallet generation and encryption/decryption
 * using the user's password. The backend never sees the plaintext
 * private key - true self-custody.
 */

// ============================================
// CRYPTO UTILITIES (Web Crypto API)
// ============================================

/**
 * Derive an encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES-GCM key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000, // High iteration count for security
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data with AES-256-GCM
 */
async function encrypt(plaintext: string, password: string): Promise<{
  encrypted: string;
  salt: string;
  iv: string;
}> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Convert to base64 for storage
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypt data with AES-256-GCM
 */
async function decrypt(
  encryptedBase64: string,
  saltBase64: string,
  ivBase64: string,
  password: string
): Promise<string> {
  // Convert from base64
  const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// ============================================
// WALLET GENERATION
// ============================================

export interface GeneratedWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

export interface EncryptedWalletData {
  address: string;
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
  salt: string;
}

/**
 * Generate a new random wallet
 */
export function generateWallet(): GeneratedWallet {
  const wallet = ethers.Wallet.createRandom();

  return {
    address: wallet.address.toLowerCase(),
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || '',
  };
}

/**
 * Generate and encrypt a new wallet with the user's password
 * Returns encrypted data ready to be stored on the backend
 */
export async function generateEncryptedWallet(password: string): Promise<{
  walletData: EncryptedWalletData;
  mnemonic: string; // Return mnemonic for one-time display to user
}> {
  // Generate wallet
  const wallet = generateWallet();

  // Encrypt private key
  const encryptedPK = await encrypt(wallet.privateKey, password);

  // Encrypt mnemonic
  const encryptedMnemonic = await encrypt(wallet.mnemonic, password);

  // Combine encrypted data (format: encrypted:salt:iv)
  const encryptedPrivateKey = `${encryptedPK.encrypted}:${encryptedPK.salt}:${encryptedPK.iv}`;
  const encryptedMnemonicStr = `${encryptedMnemonic.encrypted}:${encryptedMnemonic.salt}:${encryptedMnemonic.iv}`;

  return {
    walletData: {
      address: wallet.address,
      encryptedPrivateKey,
      encryptedMnemonic: encryptedMnemonicStr,
      salt: encryptedPK.salt, // Primary salt for reference
    },
    mnemonic: wallet.mnemonic, // One-time display
  };
}

// ============================================
// WALLET DECRYPTION & USAGE
// ============================================

/**
 * Decrypt a private key from stored encrypted data
 */
export async function decryptPrivateKey(
  encryptedData: string,
  password: string
): Promise<string> {
  const [encrypted, salt, iv] = encryptedData.split(':');
  if (!encrypted || !salt || !iv) {
    throw new Error('Format de données chiffrées invalide');
  }
  return decrypt(encrypted, salt, iv, password);
}

/**
 * Decrypt a mnemonic from stored encrypted data
 */
export async function decryptMnemonic(
  encryptedData: string,
  password: string
): Promise<string> {
  return decryptPrivateKey(encryptedData, password); // Same format
}

/**
 * Get an ethers Wallet instance from encrypted data
 * Use this to sign transactions
 */
export async function getWalletFromEncrypted(
  encryptedPrivateKey: string,
  password: string,
  provider?: ethers.Provider
): Promise<ethers.Wallet> {
  const privateKey = await decryptPrivateKey(encryptedPrivateKey, password);

  if (provider) {
    return new ethers.Wallet(privateKey, provider);
  }
  return new ethers.Wallet(privateKey);
}

/**
 * Sign a message with the embedded wallet
 */
export async function signMessage(
  encryptedPrivateKey: string,
  password: string,
  message: string
): Promise<string> {
  const wallet = await getWalletFromEncrypted(encryptedPrivateKey, password);
  return wallet.signMessage(message);
}

/**
 * Sign a transaction with the embedded wallet
 */
export async function signTransaction(
  encryptedPrivateKey: string,
  password: string,
  transaction: ethers.TransactionRequest,
  provider: ethers.Provider
): Promise<string> {
  const wallet = await getWalletFromEncrypted(encryptedPrivateKey, password, provider);
  const tx = await wallet.sendTransaction(transaction);
  return tx.hash;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate that the password can decrypt the wallet
 */
export async function validatePassword(
  encryptedPrivateKey: string,
  password: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const privateKey = await decryptPrivateKey(encryptedPrivateKey, password);
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Check if a wallet is an embedded wallet (has encrypted data)
 */
export function isEmbeddedWallet(wallet: { type?: string; encryptedPrivateKey?: string }): boolean {
  return wallet.type === 'internal' && !!wallet.encryptedPrivateKey;
}
