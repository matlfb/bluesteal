import type { Metadata } from 'next'
import { DM_Serif_Display, Manrope, DM_Mono } from 'next/font/google'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { AuthProvider } from '@/context/AuthContext'
import { LangProvider } from '@/context/LangContext'
import './globals.css'

const dmSerif = DM_Serif_Display({
  subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'],
  variable: '--font-serif', display: 'swap',
})
const manrope = Manrope({
  subsets: ['latin'], weight: ['300', '400', '500', '600'],
  variable: '--font-sans', display: 'swap',
})
const dmMono = DM_Mono({
  subsets: ['latin'], weight: ['400', '500'],
  variable: '--font-mono', display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://bluesteal.app'),
  title: {
    default: 'BlueSTEAL — Trade Bluesky Profiles as Cards',
    template: '%s | BlueSTEAL',
  },
  description: 'BlueSTEAL is a trading card game built on Bluesky. Collect, steal, and trade Bluesky profiles as collectible cards. Join the game at bluesteal.app.',
  keywords: ['bluesteal', 'bluesteal.app', 'bluesky', 'trading cards', 'bluesky game', 'collect profiles', 'bluesky profiles', 'card game'],
  authors: [{ name: 'BlueSTEAL', url: 'https://bluesteal.app' }],
  creator: 'BlueSTEAL',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: 'https://bluesteal.app',
  },
  openGraph: {
    type: 'website',
    url: 'https://bluesteal.app',
    siteName: 'BlueSTEAL',
    title: 'BlueSTEAL — Trade Bluesky Profiles as Cards',
    description: 'Collect, steal, and trade Bluesky profiles as collectible cards. The trading card game built on Bluesky.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BlueSTEAL' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlueSTEAL — Trade Bluesky Profiles as Cards',
    description: 'Collect, steal, and trade Bluesky profiles as collectible cards. The trading card game built on Bluesky.',
    images: ['/og-image.png'],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'BlueSTEAL',
  url: 'https://bluesteal.app',
  description: 'BlueSTEAL is a trading card game built on Bluesky. Collect, steal, and trade Bluesky profiles as collectible cards.',
  applicationCategory: 'GameApplication',
  operatingSystem: 'Web',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSerif.variable} ${manrope.variable} ${dmMono.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <AuthProvider>
          <LangProvider>
            <Navbar />
            <main style={{ paddingTop: '60px' }}>{children}</main>
            <footer style={{ borderTop: '1px solid rgba(0,229,255,0.08)', padding: '1.5rem', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t4)', letterSpacing: '0.1em' }}>
                © BLUESTEAL 2026 ·{' '}
                <Link href="/terms" style={{ color: 'var(--t3)', textDecoration: 'none' }} className="footer-link">TERMS OF SERVICE</Link>
                {' '}·{' '}
                <Link href="/privacy" style={{ color: 'var(--t3)', textDecoration: 'none' }} className="footer-link">PRIVACY POLICY</Link>
                {' '}· NOT AFFILIATED WITH BLUESKY SOCIAL PBC
              </p>
            </footer>
          </LangProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
