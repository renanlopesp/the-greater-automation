import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const SALT = 'relay-webhook-secret-v1'

let _cachedKey: Buffer | null = null

function getEncryptionKey(): Buffer {
  if (_cachedKey) return _cachedKey
  const source = process.env.WEBHOOK_SECRET_ENCRYPTION_KEY
  if (!source) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('WEBHOOK_SECRET_ENCRYPTION_KEY is required in production')
    }
    // Dev-only fallback — never used in production
    return scryptSync('relay-dev-fallback-key', SALT, 32) as unknown as Buffer
  }
  _cachedKey = scryptSync(source, SALT, 32)
  return _cachedKey
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64 string containing IV + auth tag + ciphertext.
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

/**
 * Decrypt an AES-256-GCM encrypted string (base64-encoded).
 * Returns the plaintext or empty string on failure.
 */
export function decryptSecret(encoded: string): string {
  try {
    const key = getEncryptionKey()
    const buf = Buffer.from(encoded, 'base64')
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) return ''
    const iv = buf.subarray(0, IV_LENGTH)
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
  } catch {
    return ''
  }
}

/**
 * Generate a cryptographically secure webhook secret (64-char hex string).
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex')
}
