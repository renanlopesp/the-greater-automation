'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
// Button removed — using native <a> tags for OAuth redirect

function ShopifyIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#96BF48" />
      <path
        d="M22.3 8.7c0 0-.1-.2-.3-.2-.2 0-3.1-.2-3.1-.2s-2-2-2.2-2.2c-.2-.2-.6-.1-.7-.1L15 7c-.1 0-.2.1-.4.1C14.4 7.6 14 8.6 14 9.7c-1.1.4-1.9.6-1.9.6l-.9 10.6 7.8 1.4 4.2-1.1c.1 0-1-11.5-.9-12.5zM17.6 7.3c0 0-.8.3-1.8.6 0-.5.1-1.2.3-1.8.4.1.9.5 1.5 1.2zm-.8-1.6c.2 0 .4.1.5.2-.5.7-.7 1.7-.8 2.5-.7.2-1.4.4-2 .6.2-1.3 1.1-3.2 2.3-3.3zm1.2 7.9s-.6-.3-1.4-.3c-1.1 0-1.2.7-1.2.9 0 1 2.7 1.4 2.7 3.7 0 1.8-1.2 3-2.7 3-.6 0-1.2-.1-1.7-.4l.3-1.5s.5.3 1.1.3c.5 0 .7-.3.7-.5 0-1.3-2.4-1.6-2.4-3.7 0-1.9 1.4-3.3 3.1-3.3.6 0 1.1.1 1.5.3l-.2 1.5z"
        fill="white"
      />
    </svg>
  )
}

function NuvemshopIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#1FBBDE" />
      <text x="6" y="22" fontSize="16" fontWeight="bold" fill="white">
        N
      </text>
    </svg>
  )
}

export function ConnectScreen() {
  const nuvemshopUrl = `/api/nuvemshop/connect?redirect_uri=${encodeURIComponent('/onboarding/analyzing')}`
  const shopifyUrl = nuvemshopUrl // TODO: Replace with Composio Shopify flow

  return (
    <div className="flex w-full flex-col gap-8">
      {/* Back */}
      <div>
        <Link
          href="/onboarding"
          className="text-muted-foreground inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-[24px] leading-tight font-semibold tracking-tight">
          Connect your store
        </h1>
        <p className="text-muted-foreground text-[14px] leading-relaxed">
          We&apos;ll analyze your products, sales history, and brand identity.
        </p>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Shopify */}
        <a
          href={shopifyUrl}
          className="bg-card flex cursor-pointer flex-col items-center gap-4 rounded-2xl border p-6 transition-shadow hover:shadow-md"
        >
          <ShopifyIcon />
          <span className="text-foreground text-[14px] font-semibold">Shopify</span>
          <span className="bg-primary text-primary-foreground inline-flex h-8 w-full items-center justify-center rounded-md text-[13px] font-medium">
            Connect via Shopify
          </span>
        </a>

        {/* Nuvemshop */}
        <a
          href={nuvemshopUrl}
          className="bg-card flex cursor-pointer flex-col items-center gap-4 rounded-2xl border p-6 transition-shadow hover:shadow-md"
        >
          <NuvemshopIcon />
          <span className="text-foreground text-[14px] font-semibold">Nuvemshop</span>
          <span className="bg-primary text-primary-foreground inline-flex h-8 w-full items-center justify-center rounded-md text-[13px] font-medium">
            Connect via Nuvemshop
          </span>
        </a>
      </div>

      <p className="text-muted-foreground text-center text-[12px]">
        We support Shopify and Nuvemshop. More platforms coming soon.
      </p>
    </div>
  )
}
