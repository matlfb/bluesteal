'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ProfileCard from '@/components/ProfileCard'
import StealModal from '@/components/StealModal'
import Confetti from '@/components/Confetti'
import { useAuth } from '@/context/AuthContext'
import { Agent, RichText } from '@atproto/api'

const PAGE_SIZE = 100

interface Card {
  did: string
  handle: string
  displayName: string
  avatar: string | null
  followersCount: number
  owner: string | null
  ownerDid: string | null
  price: number
  purchased_at: string
  verified?: boolean
}

export default function RecentlyCollectedPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [stealModal, setStealModal] = useState<Card | null>(null)
  const [stealing, setStealing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const { user, session, deductJetons, addOwned, ownedDids } = useAuth()

  useEffect(() => {
    fetch('/api/recent-all')
      .then(r => r.json())
      .then(async data => {
        const raw: Array<{ subject_did: string; owner_did: string; purchased_at: string; value: number }> = data.cards ?? []
        if (!raw.length) { setLoading(false); return }

        const allDids = [...new Set([...raw.map(c => c.subject_did), ...raw.map(c => c.owner_did)].filter(Boolean))]
        const profileMap: Record<string, any> = {}
        for (let i = 0; i < allDids.length; i += 25) {
          const batch = allDids.slice(i, i + 25)
          try {
            const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
            const pr = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
            const pd = await pr.json()
            for (const p of (pd.profiles ?? [])) profileMap[p.did] = p
          } catch {}
        }

        setCards(raw.map(c => {
          const p = profileMap[c.subject_did]
          const o = profileMap[c.owner_did]
          return {
            did: c.subject_did,
            handle: p?.handle || c.subject_did,
            displayName: p?.displayName || p?.handle || c.subject_did,
            avatar: p?.avatar || null,
            followersCount: p?.followersCount || 0,
            owner: o?.handle || c.owner_did || null,
            ownerDid: c.owner_did,
            price: c.value,
            purchased_at: c.purchased_at,
            verified: p?.verification?.verifiedStatus === 'valid' || p?.verification?.trustedVerifierStatus === 'valid',
          }
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSteal(shareOnBsky = false) {
    if (!session || !user || !stealModal || stealing) return
    setStealing(true)
    try {
      deductJetons(stealModal.price)
      addOwned(stealModal.did)
      fetch('/api/own', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_did: stealModal.did, subject_handle: stealModal.handle, owner_did: user.did, owner_handle: user.handle, purchased_at: new Date().toISOString() }),
      }).catch(() => {})
      setCards(prev => prev.map(c => c.did === stealModal.did ? { ...c, owner: user.handle, ownerDid: user.did } : c))
      setShowConfetti(true)
      if (shareOnBsky) {
        const agent = new Agent(session)
        const text = stealModal.owner
          ? `I just bought @${stealModal.handle} from @${stealModal.owner} for ${stealModal.price.toLocaleString()} tokens on @bluesteal.app 🔥`
          : `I bought @${stealModal.handle} for ${stealModal.price.toLocaleString()} tokens on @bluesteal.app 🔥`
        const rt = new RichText({ text })
        await rt.detectFacets(agent)
        agent.post({ text: rt.text, facets: rt.facets }).catch(() => {})
      }
      setStealModal(null)
    } catch {}
    finally { setStealing(false) }
  }

  const displayed = cards.slice(0, visible)
  const hasMore = visible < cards.length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 2.5rem 4rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
          color: 'var(--t3)', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00e5ff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
        >← HOME</Link>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400, color: '#e8e6dc' }}>
          Recently collected
        </h1>
        {!loading && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.15em', marginTop: '0.4rem' }}>
            {cards.length} CARDS
          </p>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="collection-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '4/5', background: '#0f1318', animation: 'skeleton 1.4s ease-in-out infinite' }} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)', padding: '4rem 0', textAlign: 'center' }}>
          No cards yet.
        </p>
      ) : (
        <>
          <div className="collection-grid">
            {displayed.map(card => (
              <Link key={card.did} href={`/profil/${card.handle}`} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
                <ProfileCard
                  handle={card.handle}
                  displayName={card.displayName}
                  avatar={card.avatar}
                  followersCount={card.followersCount}
                  price={card.price}
                  owner={card.owner}
                  ownerHref={card.owner ? `/profil/${card.owner}` : null}
                  verified={card.verified}
                  onPillClick={user && !ownedDids.has(card.did) && user.did !== card.did
                    ? () => setStealModal(card)
                    : undefined}
                />
              </Link>
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button
                onClick={() => setVisible(v => v + PAGE_SIZE)}
                style={{
                  padding: '0.7rem 2.5rem',
                  fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.15em',
                  background: 'transparent', color: '#00e5ff',
                  border: '1px solid rgba(0,229,255,0.3)', cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = '#00e5ff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)' }}
              >
                LOAD MORE ({Math.min(PAGE_SIZE, cards.length - visible)} more)
              </button>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.1em', marginTop: '0.75rem' }}>
                {visible} / {cards.length}
              </p>
            </div>
          )}
        </>
      )}

      <StealModal
        open={!!stealModal}
        handle={stealModal?.handle ?? ''}
        displayName={stealModal?.displayName ?? ''}
        avatar={stealModal?.avatar ?? null}
        price={stealModal?.price ?? 0}
        prevOwnerHandle={stealModal?.owner ?? undefined}
        isOwned={!!stealModal && ownedDids.has(stealModal.did)}
        stealing={stealing}
        onConfirm={handleSteal}
        onClose={() => setStealModal(null)}
      />
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
    </div>
  )
}
