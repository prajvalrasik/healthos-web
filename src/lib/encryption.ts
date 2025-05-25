// Client-side encryption utilities for sensitive health data

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): string {
  const array = new Uint8Array(32) // 256-bit key
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to hex string
 */
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Encrypt a file using AES-GCM
 */
export async function encryptFile(file: File, encryptionKey: string): Promise<{
  encryptedData: Uint8Array
  iv: string
  originalName: string
  originalSize: number
}> {
  try {
    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(fileBuffer)

    // Generate random IV (Initialization Vector)
    const iv = new Uint8Array(12) // 96-bit IV for GCM
    crypto.getRandomValues(iv)

    // Import the encryption key
    const keyData = hexToUint8Array(encryptionKey)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )

    // Encrypt the file data
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      cryptoKey,
      fileData
    )

    return {
      encryptedData: new Uint8Array(encryptedBuffer),
      iv: uint8ArrayToHex(iv),
      originalName: file.name,
      originalSize: file.size
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt file')
  }
}

/**
 * Decrypt a file using AES-GCM
 */
export async function decryptFile(
  encryptedData: Uint8Array,
  encryptionKey: string,
  iv: string,
  originalName: string
): Promise<File> {
  try {
    // Import the decryption key
    const keyData = hexToUint8Array(encryptionKey)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )

    // Convert IV back to Uint8Array
    const ivData = hexToUint8Array(iv)

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData
      },
      cryptoKey,
      encryptedData
    )

    // Create a new File object
    const decryptedFile = new File([decryptedBuffer], originalName, {
      type: 'application/pdf'
    })

    return decryptedFile
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt file')
  }
}

/**
 * Create an encrypted file blob for upload
 */
export async function createEncryptedBlob(file: File): Promise<{
  blob: Blob
  metadata: {
    iv: string
    originalName: string
    originalSize: number
    encryptionKey: string
  }
}> {
  const encryptionKey = generateEncryptionKey()
  const encrypted = await encryptFile(file, encryptionKey)

  // Create metadata object
  const metadata = {
    iv: encrypted.iv,
    originalName: encrypted.originalName,
    originalSize: encrypted.originalSize,
    encryptionKey // In production, store this securely, not with the file
  }

  // Create blob from encrypted data
  const blob = new Blob([encrypted.encryptedData], {
    type: 'application/octet-stream'
  })

  return { blob, metadata }
}

/**
 * Simple key derivation for user-specific encryption
 * In production, use a proper key derivation function like PBKDF2
 */
export function deriveUserKey(userId: string, masterKey: string): string {
  // This is a simplified version - use proper KDF in production
  const combined = userId + masterKey
  const encoder = new TextEncoder()
  const data = encoder.encode(combined)
  
  // Simple hash - replace with proper KDF
  return Array.from(data)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64) // 256-bit key
} 