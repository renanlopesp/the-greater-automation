import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function deriveKey(userId: string): Buffer {
  const masterKey = process.env.MASTER_ENCRYPTION_KEY
  if (!masterKey) {
    throw new Error('Missing MASTER_ENCRYPTION_KEY environment variable')
  }
  return createHmac('sha256', Buffer.from(masterKey, 'hex')).update(userId).digest()
}

export async function saveSecret(userId: string, key: string, value: string): Promise<void> {
  const derivedKey = deriveKey(userId)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, derivedKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  const encryptedValue = Buffer.concat([authTag, encrypted]).toString('base64')

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('snewclaw_secrets').upsert(
    {
      user_id: userId,
      key,
      encrypted_value: encryptedValue,
      iv: iv.toString('base64'),
    },
    { onConflict: 'user_id,key' }
  )

  if (error) throw new Error(`Failed to save secret: ${error.message}`)
}

export async function getDecryptedSecrets(userId: string): Promise<Record<string, string>> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('snewclaw_secrets')
    .select('key, encrypted_value, iv')
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to fetch secrets: ${error.message}`)
  if (!data?.length) return {}

  const derivedKey = deriveKey(userId)
  const result: Record<string, string> = {}

  for (const row of data) {
    try {
      const iv = Buffer.from(row.iv, 'base64')
      const encBuf = Buffer.from(row.encrypted_value, 'base64')
      const authTag = encBuf.subarray(0, 16)
      const ciphertext = encBuf.subarray(16)

      const decipher = createDecipheriv(ALGORITHM, derivedKey, iv)
      decipher.setAuthTag(authTag)
      result[row.key] = decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
    } catch {
      // Skip corrupted secrets
    }
  }

  return result
}
