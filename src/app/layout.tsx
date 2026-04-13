import type { Metadata } from 'next'
import { Inter, DM_Serif_Display, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import QueryProvider from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-dm-serif',
  display: 'swap',
})
const ibmMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-ibm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Painel',
  description: 'Plataforma de automação de workflows',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${dmSerif.variable} ${ibmMono.variable} ${inter.className} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
