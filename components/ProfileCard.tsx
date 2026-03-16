'use client'

import { useState, useEffect } from 'react'
import { useLang } from '@/context/LangContext'

export interface CardProps {
  handle: string
  displayName: string
  avatar: string | null
  followersCount: number
  price: number
  priceChange?: number
  owner?: string | null
  onPillClick?: (e: React.MouseEvent) => void
}

export default function ProfileCard({ handle, displayName, avatar, followersCount, price, priceChange = 0, owner, onPillClick }: CardProps) {
  const [hovered, setHovered] = useState(false)
  const [ownerAvatar, setOwnerAvatar] = useState<string | null>(null)
  const { t, fmtNum } = useLang()

  useEffect(() => {
    if (!owner) { setOwnerAvatar(null); return }
    fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(owner)}`)
      .then(r => r.json())
      .then(data => setOwnerAvatar(data.avatar ?? null))
      .catch(() => {})
  }, [owner])

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: 'relative', background: 'var(--surface)', cursor: 'pointer', overflow: 'hidden', transition: 'background 0.2s', userSelect: 'none' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--brand)', transform: hovered ? 'scaleX(1)' : 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.3s', zIndex: 3 }} />
      <div style={{ position: 'absolute', inset: 0, border: `1.5px solid ${hovered ? 'var(--brand)' : 'transparent'}`, transition: 'border-color 0.2s', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'relative', aspectRatio: '4/5', overflow: 'hidden', background: 'var(--elevated)' }}>
        {avatar ? (
          <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s', transform: hovered ? 'scale(1.04)' : 'scale(1)' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '5rem', color: 'var(--brand)', opacity: 0.12, fontStyle: 'italic' }}>{displayName.charAt(0)}</span>
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(to top, var(--surface), transparent)' }} />
        <div
          onClick={onPillClick ? (e) => { e.preventDefault(); e.stopPropagation(); onPillClick(e) } : undefined}
          style={{ position: 'absolute', top: '9px', right: '9px', background: 'rgba(14,14,12,0.78)', backdropFilter: 'blur(6px)', padding: '3px 9px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '5px', border: onPillClick ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.07)', zIndex: 4, cursor: onPillClick ? 'pointer' : 'default', transition: 'border-color 0.15s' }}
          onMouseEnter={onPillClick ? e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,229,255,0.65)' } : undefined}
          onMouseLeave={onPillClick ? e => { (e.currentTarget as HTMLElement).style.border = '1px solid rgba(0,229,255,0.35)' } : undefined}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t1)' }}>{fmtNum(price)} J</span>
          {priceChange !== 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: priceChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>{priceChange >= 0 ? '+' : ''}{priceChange}%</span>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: '10px', left: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(232,230,220,0.45)' }}>
          {t('pc_followers', { n: followersCount >= 1_000_000 ? `${(followersCount / 1_000_000).toFixed(1)}M` : followersCount >= 1_000 ? `${(followersCount / 1000).toFixed(0)}K` : String(followersCount) })}
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{displayName}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>@{handle}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', visibility: owner ? 'visible' : 'hidden', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: 'var(--t4)' }}>&#8627;</span>
          {ownerAvatar && (
            <img src={ownerAvatar} alt={owner ?? ''} style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          )}
          {owner || ''}
        </div>
      </div>
    </div>
  )
}
