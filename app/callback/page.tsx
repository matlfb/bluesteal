'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function CallbackPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const redirected = useRef(false)

  useEffect(() => {
    // AuthContext already calls client.init() which processes the OAuth callback.
    // We just wait for the session to be established, then redirect.
    if (!loading && user && !redirected.current) {
      redirected.current = true
      router.replace('/')
    }
  }, [user, loading, router])

  // Fallback: if loading takes too long (>15s), something went wrong
  useEffect(() => {
    const t = setTimeout(() => {
      if (!redirected.current) router.replace('/login')
    }, 15000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)',
    }}>
      <div style={{ textAlign: 'center', color: 'var(--t3)' }}>
        <p style={{ marginBottom: '0.5rem', color: '#00e5ff', fontSize: '13px', letterSpacing: '0.1em' }}>CONNEXION EN COURS</p>
        <p style={{ fontSize: '12px' }}>Redirection…</p>
      </div>
    </div>
  )
}
