/**
 * File Encryption Service using Web Crypto API
 * Uses AES-256-GCM for encryption (same as backend)
 */

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Convert hex string to ArrayBuffer
function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

// Convert ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive encryption key from password using PBKDF2
async function deriveKey(
  password: string,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as raw key
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Generate SHA-256 hash of data
async function hashData(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

export interface EncryptedFile {
  ciphertext: string; // Base64 encoded
  iv: string; // Hex encoded
  salt: string; // Hex encoded
  authTag: string; // Hex encoded (included in ciphertext for Web Crypto)
  hashChecksum: string; // SHA-256 of original file
}

export interface DecryptedFile {
  data: ArrayBuffer;
  filename: string;
}

/**
 * Encrypt a file using AES-256-GCM
 * @param file The file to encrypt
 * @param password The encryption password (derived from unlock date + user secret)
 */
export async function encryptFile(
  file: File,
  password: string
): Promise<EncryptedFile> {
  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(32)); // 256 bits
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96 bits for GCM

  // Derive key from password
  const key = await deriveKey(password, salt.buffer);

  // Encrypt the file
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit auth tag
    },
    key,
    fileBuffer
  );

  // Calculate hash of original file for integrity verification
  const hashChecksum = await hashData(fileBuffer);

  // Web Crypto API appends the auth tag to the ciphertext
  // Extract it for compatibility with backend format
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const ciphertextWithoutTag = encryptedArray.slice(0, -16);
  const authTag = encryptedArray.slice(-16);

  return {
    ciphertext: bufferToBase64(ciphertextWithoutTag.buffer),
    iv: bufferToHex(iv.buffer),
    salt: bufferToHex(salt.buffer),
    authTag: bufferToHex(authTag.buffer),
    hashChecksum,
  };
}

/**
 * Decrypt a file using AES-256-GCM
 * @param encrypted The encrypted file data
 * @param password The decryption password
 */
export async function decryptFile(
  encrypted: EncryptedFile,
  password: string
): Promise<ArrayBuffer> {
  // Convert from storage format
  const salt = hexToBuffer(encrypted.salt);
  const iv = hexToBuffer(encrypted.iv);
  const ciphertextBuffer = base64ToBuffer(encrypted.ciphertext);
  const authTagBuffer = hexToBuffer(encrypted.authTag);

  // Reconstruct ciphertext with auth tag appended (Web Crypto format)
  const ciphertextArray = new Uint8Array(ciphertextBuffer);
  const authTagArray = new Uint8Array(authTagBuffer);
  const combinedBuffer = new Uint8Array(
    ciphertextArray.length + authTagArray.length
  );
  combinedBuffer.set(ciphertextArray);
  combinedBuffer.set(authTagArray, ciphertextArray.length);

  // Derive key from password
  const key = await deriveKey(password, salt);

  // Decrypt the file
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(iv),
      tagLength: 128,
    },
    key,
    combinedBuffer.buffer
  );

  // Verify hash
  const computedHash = await hashData(decryptedBuffer);
  if (computedHash !== encrypted.hashChecksum) {
    throw new Error('File integrity check failed - hash mismatch');
  }

  return decryptedBuffer;
}

/**
 * Generate encryption password from unlock date and user ID
 * This ensures only the correct user can decrypt after unlock time
 */
export function generateEncryptionPassword(
  unlockDate: Date,
  userId: string,
  fileId?: string
): string {
  // Combine unlock timestamp, user ID, and optional file ID
  const timestamp = unlockDate.getTime().toString();
  const combined = `${timestamp}-${userId}-${fileId || 'new'}-timelock-file-encryption`;
  return combined;
}

/**
 * Download decrypted file to user's device
 */
export function downloadFile(
  data: ArrayBuffer,
  filename: string,
  mimeType: string
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
