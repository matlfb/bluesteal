'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'

function LoginForm() {
  const { signIn } = useAuth()
  const { t } = useLang()
  const searchParams = useSearchParams()
  const [handle, setHandle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('blocked') === '1' ? 'Impossible de se connecter à BlueSTEAL. Vérifiez que vous n'avez pas bloqué le compte @bluesteal.app sur Bluesky.' : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!handle.trim()) return
    setLoading(true)
    setError(null)
    try {
      const normalized = handle.trim().replace(/^@/, '')
      const check = await fetch(`/api/check-blocked?handle=${encodeURIComponent(normalized)}`).then(r => r.json()).catch(() => ({ blocked: false }))
      if (check.blocked) {
        setError('Impossible de se connecter à BlueSTEAL. Vérifiez que vous n'avez pas bloqué le compte @bluesteal.app sur Bluesky.')
        setLoading(false)
        return
      }
      await signIn(normalized)
    } catch (e: any) {
      setError(e?.message || t('sign_in_error'))
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', marginTop: '-60px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#00e5ff', letterSpacing: '0.2em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          BLUESTEAL
          <span style={{ display: 'block', flex: 1, height: 1, background: '#00b4d8', maxWidth: 60 }} />
        </Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', lineHeight: 1.1, color: '#e8e6dc', marginBottom: '0.5rem' }}>{t('sign_in_title')}</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', color: '#8a8878', fontWeight: 300, marginBottom: '2.5rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {t('sign_in_subtitle')}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: '0.6rem' }}>
              {t('sign_in_handle_label')}
            </label>
            <input
              type="text" value={handle} onChange={e => setHandle(e.target.value)}
              placeholder={t('sign_in_placeholder')} autoFocus disabled={loading}
              style={{ width: '100%', padding: '0.75rem 1rem', background: '#0f1318', border: '1px solid rgba(0,229,255,0.2)', color: '#e8e6dc', fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', opacity: loading ? 0.5 : 1 }}
              onFocus={e => { e.target.style.borderColor = '#00e5ff' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(0,229,255,0.2)' }}
            />
          </div>
          {error && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#e05252', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" disabled={loading || !handle.trim()} style={{ width: '100%', padding: '0.75rem', background: loading || !handle.trim() ? '#003d52' : '#00b4d8', color: '#0a0d11', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.08em', border: 'none', cursor: loading || !handle.trim() ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
            {loading ? t('sign_in_loading') : t('sign_in_submit')}
          </button>
        </form>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t4)', marginTop: '2rem', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
          {t('sign_in_disclaimer')}
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
