"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'

const packs = [
  { id: 'starter',  name: 'STARTER',  jetons: 5000,   price: '0,99 €',  bonus: null,   popular: false, ratio: '5 051 T/€'  },
  { id: 'standard', name: 'STANDARD', jetons: 33000,  price: '4,99 €',  bonus: '+10%', popular: true,  ratio: '6 613 T/€'  },
  { id: 'pro',      name: 'PRO',      jetons: 93750,  price: '9,99 €',  bonus: '+25%', popular: false, ratio: '9 384 T/€'  },
  { id: 'elite',    name: 'ELITE',    jetons: 300000, price: '19,99 €', bonus: '+50%', popular: false, ratio: '15 007 T/€' },
]

export default function JetonsPage() {
  const { user, jetons } = useAuth()
  const { t, fmtNum } = useLang()
  const [cardCount, setCardCount]     = useState<number | null>(null)
  const [hourlyIncome, setHourlyIncome] = useState<number | null>(null)

  useEffect(() => {
    if (!user?.did) return
    fetch(`/api/owned?owner_did=${encodeURIComponent(user.did)}`)
      .then(r => r.json())
      .then(data => {
        const owned: Array<{ value: number }> = data.owned ?? []
        setCardCount(owned.length)
        const income = owned.reduce((sum, c) => sum + (c.value > 600 ? Math.round(c.value * 0.015) : 0), 0)
        setHourlyIncome(income)
      })
      .catch(() => {})
  }, [user?.did])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '4rem 2.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3.2rem', fontWeight: 400, color: '#e8e6dc' }}>
          {t('jetons_title_pre')} <em style={{ fontStyle: 'italic', color: '#00e5ff' }}>{t('jetons_title_em')}</em>
        </h1>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.1)', marginLeft: 'auto', maxWidth: 200 }} />
      </div>

      {/* Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '3.5rem' }}>

        {/* Solde */}
        <div style={{ background: '#0f1318', padding: '2.5rem', border: '1px solid rgba(0,229,255,0.12)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#00b4d8' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: '1.25rem' }}>{t('jetons_balance')}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '5rem', lineHeight: 1, color: '#e8e6dc' }}>
              {fmtNum(jetons)}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--t3)' }}>T</span>
          </div>
        </div>

        {/* Revenu passif */}
        <div style={{ background: '#0f1318', padding: '2.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: '1.25rem' }}>{t('jetons_passive')}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3.5rem', lineHeight: 1, color: '#38bdf8' }}>
              {hourlyIncome !== null ? `+${fmtNum(hourlyIncome)}` : '…'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#003d52' }}>{t('jetons_per_hour')}</span>
          </div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.8 }}>
            {cardCount !== null ? t('jetons_based', { count: cardCount, s: cardCount !== 1 ? 's' : '' }) : t('jetons_based_loading')}
          </p>
        </div>
      </div>

      {/* Packs header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400, color: '#e8e6dc' }}>{t('jetons_recharge')}</h2>
        <div style={{ flex: 1, height: 1, background: 'rgba(0,229,255,0.1)', marginLeft: 'auto', maxWidth: 200 }} />
      </div>

      {/* Packs grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {packs.map((pack) => (
          <div key={pack.id} style={{
            background: pack.popular ? '#14191f' : '#0f1318',
            padding: '1.5rem',
            border: `1px solid ${pack.popular ? 'rgba(0,229,255,0.25)' : 'rgba(255,255,255,0.04)'}`,
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1f1f18')}
          onMouseLeave={e => (e.currentTarget.style.background = pack.popular ? '#14191f' : '#0f1318')}
          >
            {pack.popular && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#00e5ff' }} />
            )}
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: pack.popular ? '#00e5ff' : 'var(--t3)', letterSpacing: '0.2em', marginBottom: '1.25rem' }}>
              {pack.name}{pack.popular ? ' ★' : ''}
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', lineHeight: 1, color: '#e8e6dc', marginBottom: '0.25rem' }}>
              {pack.jetons >= 1000 ? `${(pack.jetons / 1000).toFixed(0)}K` : pack.jetons}
            </p>
            {pack.bonus
              ? <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#38bdf8', marginBottom: '1rem' }}>{t('jetons_bonus', { bonus: pack.bonus })}</p>
              : <div style={{ marginBottom: '1.8rem' }} />
            }
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>{pack.ratio}</p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '1.3rem', fontWeight: 600, color: '#e8e6dc', marginBottom: '1.25rem' }}>{pack.price}</p>
            <a href="#" style={{
              display: 'block', textAlign: 'center',
              padding: '0.6rem',
              background: pack.popular ? '#00b4d8' : 'transparent',
              color: pack.popular ? '#0a0d11' : '#8a8878',
              border: `1px solid ${pack.popular ? '#00b4d8' : 'rgba(0,229,255,0.2)'}`,
              fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em',
              textDecoration: 'none',
            }}>
              {t('jetons_buy')}
            </a>
          </div>
        ))}
      </div>

    </div>
  )
}
