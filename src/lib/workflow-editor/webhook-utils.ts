/**
 * Lightweight webhook utilities safe for client-side imports.
 * Extracted from webhook-executor.ts to avoid pulling Node-only
 * dependencies (composio-core, crypto) into the browser bundle.
 */

export function generateWebhookToken(): string {
  return crypto.randomUUID()
}

export function buildWebhookUrl(token: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${baseUrl}/api/workflows/webhook/${token}`
}
