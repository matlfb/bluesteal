'use client'

import Link from 'next/link'
import { useLang } from '@/context/LangContext'

interface HistoryEvent {
  type: 'bought' | 'lost'
  actor_did: string
  subject_did: string
  subject_handle: string
  price: number
  at: string
  counterpart_handle?: string
  subject_avatar?: string | null
  counterpart_avatar?: string | null
}

export default function HistoryTab({ events }: { events: HistoryEvent[] }) {
  const { t, fmtDate, fmtNum } = useLang()

  if (events.length === 0) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(0,229,255,0.1)' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--t4)', fontStyle: 'italic', marginBottom: '0.75rem' }}>{t('history_empty_title')}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t4)', lineHeight: 1.8 }}>{t('history_empty_sub')}</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1020 }}>
      <div style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}>
        {events.map((ev, i) => {
          const isBought = ev.type === 'bought'
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', alignItems: 'start', gap: '1.5rem', padding: '1.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', paddingTop: 3, letterSpacing: '0.04em' }}>
                {fmtDate(ev.at)}
              </span>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', padding: '2px 7px', background: isBought ? 'rgba(0,229,255,0.1)' : 'rgba(224,82,82,0.1)', color: isBought ? 'var(--brand)' : 'var(--danger)', border: `1px solid ${isBought ? 'rgba(0,229,255,0.2)' : 'rgba(224,82,82,0.2)'}` }}>
                    {isBought ? t('history_bought') : t('history_lost')}
                  </span>
                  {ev.subject_avatar && (
                    <img src={ev.subject_avatar} alt="" width={18} height={18} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  )}
                  <Link href={'/profil/' + ev.subject_handle} style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--t1)', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}>
                    @{ev.subject_handle}
                  </Link>
                </div>
                {ev.counterpart_handle && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isBought ? t('history_stolen_from') : t('history_stolen_by')}{' '}
                    {ev.counterpart_avatar && (
                      <img src={ev.counterpart_avatar} alt="" width={14} height={14} style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    )}
                    <Link href={'/profil/' + ev.counterpart_handle} style={{ color: 'var(--t2)', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}>
                      @{ev.counterpart_handle}
                    </Link>
                  </p>
                )}
                {!ev.counterpart_handle && isBought && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>{t('history_first')}</p>
                )}
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color: isBought ? 'var(--danger)' : 'var(--success)', paddingTop: 3, whiteSpace: 'nowrap' }}>
                {isBought ? '-' : '+'}{fmtNum(ev.price)} J
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
