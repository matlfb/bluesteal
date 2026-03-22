"use client"

import { useState, useEffect } from 'react'
import { useLang } from '@/context/LangContext'

interface Props {
  open: boolean
  handle: string
  displayName: string
  avatar: string | null
  price: number
  prevOwnerHandle?: string | null
  isOwned: boolean
  stealing: boolean
  onConfirm: (shareOnBsky: boolean) => void
  onClose: () => void
}

let _hapticLabel: HTMLLabelElement | null = null

function ensureHapticDOM() {
  if (_hapticLabel || typeof document === 'undefined') return
  const id = 'bs-haptic'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  input.id = id
  input.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:0;height:0;'
  const label = document.createElement('label')
  label.setAttribute('for', id)
  label.style.cssText = 'position:fixed;opacity:0;pointer-events:none;'
  label.appendChild(input)
  document.body.appendChild(label)
  _hapticLabel = label
}

function hapticSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([30, 60, 40])
    return
  }
  // iOS: checkbox switch trick triggers Taptic Engine
  ensureHapticDOM()
  if (!_hapticLabel) return
  _hapticLabel.click()
  setTimeout(() => _hapticLabel?.click(), 90)
}

export default function StealModal({ open, handle, displayName, avatar, price, prevOwnerHandle, isOwned, stealing, onConfirm, onClose }: Props) {
  const [share, setShare] = useState(false)
  const { t, fmtNum } = useLang()

  useEffect(() => { if (open) setShare(false) }, [open])
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(10,13,17,0.75)', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 501, background: 'var(--surface)', border: '1px solid rgba(0,229,255,0.2)', width: 340, overflow: 'hidden' }}>
        <div style={{ height: 2, background: 'var(--brand)', width: '100%' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem 1.5rem 1.25rem' }}>
          <div style={{ width: 52, height: 52, flexShrink: 0, background: 'var(--elevated)', overflow: 'hidden' }}>
            {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--brand)', fontStyle: 'italic', opacity: 0.4 }}>{displayName.charAt(0)}</span></div>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, color: 'var(--t1)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>@{handle}</p>
            {prevOwnerHandle && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t4)', marginTop: 3 }}>
                {t('modal_currently_at', { handle: prevOwnerHandle })}
              </p>
            )}
          </div>
        </div>
        <div style={{ margin: '0 1.5rem', padding: '0.9rem 1rem', background: 'var(--elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.08em' }}>{t('modal_cost')}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--t1)' }}>
            {fmtNum(price)} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--t3)' }}>T</span>
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1.5rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
          <div onClick={() => setShare(s => !s)} style={{ width: 18, height: 18, flexShrink: 0, border: `1.5px solid ${share ? 'var(--brand)' : 'rgba(0,229,255,0.25)'}`, background: share ? 'rgba(0,229,255,0.12)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.15s, background 0.15s', cursor: 'pointer' }}>
            {share && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 4.5,9 10.5,2.5" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span onClick={() => setShare(s => !s)} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t2)', letterSpacing: '0.03em', cursor: 'pointer' }}>
            {t('modal_share')}
          </span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={onClose} disabled={stealing} style={{ padding: '0.9rem', background: 'none', border: 'none', borderRight: '1px solid rgba(255,255,255,0.05)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', color: 'var(--t3)', cursor: 'pointer', transition: 'color 0.15s, background 0.15s' }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'var(--t1)'; (e.currentTarget).style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'var(--t3)'; (e.currentTarget).style.background = 'none' }}>
            {t('modal_cancel')}
          </button>
          <button
            onClick={() => { hapticSuccess(); onConfirm(share) }}
            disabled={isOwned || stealing}
            style={{ padding: '0.9rem', border: 'none', background: isOwned ? 'transparent' : 'rgba(0,229,255,0.08)', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em', color: isOwned ? 'var(--t4)' : stealing ? 'var(--t3)' : 'var(--brand)', cursor: isOwned || stealing ? 'default' : 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => { if (!isOwned && !stealing) (e.currentTarget).style.background = 'rgba(0,229,255,0.15)' }}
            onMouseLeave={e => { if (!isOwned && !stealing) (e.currentTarget).style.background = 'rgba(0,229,255,0.08)' }}>
            {stealing ? t('modal_confirming') : isOwned ? t('modal_owned') : t('modal_confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
