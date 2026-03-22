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
  title: 'BlueSTEAL',
  description: 'Trade Bluesky profiles as collectible cards',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${dmSerif.variable} ${manrope.variable} ${dmMono.variable}`}>
      <body>
        <AuthProvider>
          <LangProvider>
            <Navbar />
            <main style={{ paddingTop: '60px' }}>{children}</main>
            <footer style={{ borderTop: '1px solid rgba(0,229,255,0.08)', padding: '1.5rem', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t4)', letterSpacing: '0.1em' }}>
                © BLUESTEAL 2026 ·{' '}
                <Link href="/terms" style={{ color: 'var(--t3)', textDecoration: 'none' }}>TERMS OF SERVICE</Link>
                {' '}· NOT AFFILIATED WITH BLUESKY SOCIAL PBC
              </p>
            </footer>
          </LangProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
