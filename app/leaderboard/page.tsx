'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLang } from '@/context/LangContext'

interface Player {
  rank: number
  did: string
  handle: string
  displayName: string
  avatar: string | null
  cards: number
  portfolio: number
  steals: number
}

export default function LeaderboardPage() {
  const { t, fmtNum } = useLang()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => setPlayers(data.players ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rankColors = ['#f5c842', '#9ba3af', '#c07830']

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '2rem 1.25rem 6rem' : '4rem 2.5rem' }}>

      {/* Header */}
      <div style={{ marginBottom: isMobile ? '2rem' : '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: 400, color: '#e8e6dc' }}>
          {t('lb_title')}
        </h1>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ background: '#0f1318', height: 180, opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      )}

      {/* Top 3 */}
      {!loading && players.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
          {players.slice(0, 3).map((p, i) => (
            <Link key={p.did} href={`/profil/${p.handle}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#0f1318',
                padding: isMobile ? '1.25rem' : '2rem',
                border: `1px solid ${i === 0 ? 'rgba(245,200,66,0.2)' : 'rgba(255,255,255,0.04)'}`,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'background 0.15s',
                display: isMobile ? 'flex' : 'block',
                alignItems: isMobile ? 'center' : undefined,
                gap: isMobile ? '1rem' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#141a21')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0f1318')}
              >
                {i === 0 && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#f5c842' }} />
                )}
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? '2.2rem' : '3.5rem', color: rankColors[i], lineHeight: 1, marginBottom: isMobile ? 0 : '1rem', flexShrink: 0 }}>
                  #{p.rank}
                </div>
                {isMobile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: 40, height: 40, background: '#161d26', border: '1px solid rgba(0,229,255,0.1)', flexShrink: 0, overflow: 'hidden' }}>
                      {p.avatar && <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#e8e6dc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.displayName}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)' }}>@{p.handle}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#e8e6dc', fontWeight: 500 }}>{fmtNum(p.portfolio)} J</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t3)', marginTop: '2px' }}>{p.cards} cartes</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ width: 48, height: 48, background: '#161d26', border: '1px solid rgba(0,229,255,0.1)', margin: '0 auto 1rem', overflow: 'hidden' }}>
                      {p.avatar && <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                    </div>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: '#e8e6dc', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.displayName}</p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', marginBottom: '1.25rem' }}>@{p.handle}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ background: '#0a0d11', padding: '0.6rem' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#e8e6dc', fontWeight: 500 }}>{fmtNum(p.portfolio)}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.15em', marginTop: '2px' }}>TOKENS</p>
                      </div>
                      <div style={{ background: '#0a0d11', padding: '0.6rem' }}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#38bdf8', fontWeight: 500 }}>{p.cards}</p>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.15em', marginTop: '2px' }}>CARDS</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && players.length > 3 && (
        <div style={{ border: '1px solid rgba(0,229,255,0.1)', background: '#0f1318' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr 90px' : '60px 1fr 80px 160px 80px', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {(isMobile
              ? [t('lb_rank'), t('lb_player'), t('lb_portfolio')]
              : [t('lb_rank'), t('lb_player'), t('lb_cards'), t('lb_portfolio'), t('lb_steals')]
            ).map(h => (
              <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.2em' }}>{h}</span>
            ))}
          </div>
          {players.slice(3).map(p => (
            <Link key={p.did} href={`/profil/${p.handle}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{ display: 'grid', gridTemplateColumns: isMobile ? '44px 1fr 90px' : '60px 1fr 80px 160px 80px', gap: '0.75rem', padding: isMobile ? '0.75rem 1rem' : '1rem', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#141a21')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)' }}>#{p.rank}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{ width: 32, height: 32, background: '#161d26', border: '1px solid rgba(0,229,255,0.08)', flexShrink: 0, overflow: 'hidden' }}>
                    {p.avatar && <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#e8e6dc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.displayName}</p>
                    {!isMobile && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)' }}>@{p.handle}</p>}
                  </div>
                </div>
                {!isMobile && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#8a8878' }}>{p.cards}</span>}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#e8e6dc' }}>{fmtNum(p.portfolio)} J</span>
                {!isMobile && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#8a8878' }}>{p.steals}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && players.length === 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)' }}>Aucun joueur pour l&apos;instant.</p>
      )}

    </div>
  )
}
