"use client"
import { useLang } from '@/context/LangContext'

const players = [
  { rank: 1,  name: 'mathieu',  handle: 'mathieu.bsky.social',  cards: 23, value: 284500, gain: 12.4, steals: 45 },
  { rank: 2,  name: 'alex',     handle: 'alex.bsky.social',     cards: 18, value: 198200, gain: 8.1,  steals: 32 },
  { rank: 3,  name: 'sophie',   handle: 'sophie.bsky.social',   cards: 21, value: 176400, gain: -2.3, steals: 28 },
  { rank: 4,  name: 'theo',     handle: 'theo.bsky.social',     cards: 15, value: 142800, gain: 5.6,  steals: 21 },
  { rank: 5,  name: 'emma',     handle: 'emma.bsky.social',     cards: 12, value: 118600, gain: 3.2,  steals: 18 },
  { rank: 6,  name: 'lucas',    handle: 'lucas.bsky.social',    cards: 9,  value: 94200,  gain: -1.1, steals: 14 },
  { rank: 7,  name: 'pauline',  handle: 'pauline.bsky.social',  cards: 11, value: 87500,  gain: 6.8,  steals: 16 },
  { rank: 8,  name: 'marc',     handle: 'marc.bsky.social',     cards: 7,  value: 65300,  gain: 0.4,  steals: 10 },
  { rank: 9,  name: 'remi',     handle: 'remi.bsky.social',     cards: 6,  value: 58400,  gain: 2.1,  steals: 9  },
  { rank: 10, name: 'claire',   handle: 'claire.bsky.social',   cards: 5,  value: 42100,  gain: -0.8, steals: 7  },
]

export default function LeaderboardPage() {
  const { t, fmtNum } = useLang()
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 2.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '3rem' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#00e5ff', letterSpacing: '0.2em' }}>01</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.2rem', fontWeight: 400, color: '#e8e6dc' }}>
          {t('lb_title')}
        </h1>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.1)', marginLeft: 'auto', maxWidth: 200 }} />
        <div style={{ display: 'flex', gap: 0, fontFamily: 'var(--font-mono)', fontSize: '11px', border: '1px solid rgba(0,229,255,0.15)' }}>
          {[t('lb_tab_global'), t('lb_tab_friends')].map((t, i) => (
            <button key={t} style={{
              padding: '0.3rem 0.8rem',
              background: i === 0 ? 'rgba(0,229,255,0.1)' : 'none',
              color: i === 0 ? '#00e5ff' : 'var(--t3)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Top 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        {players.slice(0, 3).map((p, i) => {
          const rankColors = ['#f5c842', '#8a8878', '#7a5a30']
          return (
            <div key={p.rank} style={{
              background: '#0f1318',
              padding: '2rem',
              border: `1px solid ${i === 0 ? 'rgba(245,200,66,0.2)' : 'rgba(255,255,255,0.04)'}`,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {i === 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#f5c842' }} />
              )}
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', color: rankColors[i], lineHeight: 1, marginBottom: '1rem' }}>
                #{p.rank}
              </div>
              <div style={{ width: 48, height: 48, background: '#161d26', border: '1px solid rgba(0,229,255,0.1)', margin: '0 auto 1rem' }} />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: '#e8e6dc', marginBottom: '0.25rem' }}>{p.name}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', marginBottom: '1.25rem' }}>@{p.handle}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ background: '#0a0d11', padding: '0.6rem' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#e8e6dc', fontWeight: 500 }}>{fmtNum(p.value)}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.15em', marginTop: '2px' }}>JETONS</p>
                </div>
                <div style={{ background: '#0a0d11', padding: '0.6rem' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: p.gain >= 0 ? '#38bdf8' : '#e05252', fontWeight: 500 }}>
                    {p.gain >= 0 ? '+' : ''}{p.gain}%
                  </p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--t3)', letterSpacing: '0.15em', marginTop: '2px' }}>24H</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ border: '1px solid rgba(0,229,255,0.1)', background: '#0f1318' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 80px 160px 80px 80px', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {[t('lb_rank'), t('lb_player'), t('lb_cards'), t('lb_portfolio'), '24H', t('lb_steals')].map((h) => (
            <span key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.2em' }}>{h}</span>
          ))}
        </div>
        {players.map((p) => (
          <div key={p.rank} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 80px 160px 80px 80px',
            gap: '1rem', padding: '1rem', alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#0f1318')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)' }}>#{p.rank}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 32, height: 32, background: '#161d26', border: '1px solid rgba(0,229,255,0.08)', flexShrink: 0 }} />
              <div>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: '#e8e6dc' }}>{p.name}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)' }}>@{p.handle}</p>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#8a8878' }}>{p.cards}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#e8e6dc' }}>{fmtNum(p.value)} J</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: p.gain >= 0 ? '#38bdf8' : '#e05252' }}>
              {p.gain >= 0 ? '+' : ''}{p.gain}%
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#8a8878' }}>{p.steals}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
