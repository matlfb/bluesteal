'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ProfileCard from '@/components/ProfileCard'
import StealModal from '@/components/StealModal'
import Confetti from '@/components/Confetti'
import { useAuth } from '@/context/AuthContext'
import { Agent, RichText } from '@atproto/api'

const PAGE_SIZE = 100

interface OwnedCard {
  did: string
  handle: string
  displayName: string
  avatar: string | null
  followersCount: number
  value: number
  purchased_at: string
}

async function fetchAllCards(ownerDid: string): Promise<OwnedCard[]> {
  const res = await fetch(`/api/owned?owner_did=${encodeURIComponent(ownerDid)}`)
  if (!res.ok) return []
  const data = await res.json()
  const owned: Array<{ subject_did: string; value: number; purchased_at: string }> = data.owned ?? []
  if (!owned.length) return []

  const sorted = owned.sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))
  const dids = sorted.map(o => o.subject_did)
  const profileMap: Record<string, any> = {}
  for (let i = 0; i < dids.length; i += 25) {
    const batch = dids.slice(i, i + 25)
    try {
      const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
      const pr = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
      const pd = await pr.json()
      for (const p of (pd.profiles ?? [])) profileMap[p.did] = p
    } catch {}
  }

  return sorted.map(o => {
    const p = profileMap[o.subject_did]
    return {
      did: o.subject_did,
      handle: p?.handle || o.subject_did,
      displayName: p?.displayName || p?.handle || o.subject_did,
      avatar: p?.avatar || null,
      followersCount: p?.followersCount || 0,
      value: o.value,
      purchased_at: o.purchased_at,
    }
  })
}

export default function CollectionPage() {
  const params = useParams()
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle as string

  const [cards, setCards] = useState<OwnedCard[]>([])
  const [ownerDid, setOwnerDid] = useState<string | null>(null)
  const [ownerDisplayName, setOwnerDisplayName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [stealModal, setStealModal] = useState<OwnedCard | null>(null)
  const [stealing, setStealing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  const { user, session, deductJetons, addOwned, ownedDids } = useAuth()

  useEffect(() => {
    if (!handle) return
    setLoading(true)
    fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`)
      .then(r => r.json())
      .then(async data => {
        setOwnerDid(data.did)
        setOwnerDisplayName(data.displayName || data.handle)
        const fetched = await fetchAllCards(data.did)
        setCards(fetched)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [handle])

  async function handleSteal(shareOnBsky = false) {
    if (!session || !user || !stealModal || stealing) return
    setStealing(true)
    try {
      deductJetons(stealModal.value)
      addOwned(stealModal.did)
      fetch('/api/own', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_did: stealModal.did, subject_handle: stealModal.handle, owner_did: user.did, owner_handle: user.handle, purchased_at: new Date().toISOString() }),
      }).catch(() => {})
      setCards(prev => prev.filter(c => c.did !== stealModal.did))
      setShowConfetti(true)
      if (shareOnBsky) {
        const agent = new Agent(session)
        const text = `I just bought @${stealModal.handle} from @${handle} for ${stealModal.value.toLocaleString()} tokens on @bluesteal.app 🔥`
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 2.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <Link href={`/profil/${handle}`} style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
            color: 'var(--t3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00e5ff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)' }}
          >
            ← @{handle}
          </Link>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: '#e8e6dc', fontWeight: 400 }}>
            {loading ? '' : `${ownerDisplayName || handle}'s collection`}
          </h1>
          {!loading && cards.length > 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.15em', marginTop: '0.4rem' }}>
              {cards.length} CARDS — RECENTLY COLLECTED
            </p>
          )}
        </div>
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
          No cards in this collection.
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
                  price={card.value}
                  owner={handle}
                  ownerHref={`/profil/${handle}`}
                  onPillClick={user && !ownedDids.has(card.did) && user.did !== card.did && ownerDid !== user.did
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
        price={stealModal?.value ?? 0}
        prevOwnerHandle={handle}
        isOwned={!!stealModal && ownedDids.has(stealModal.did)}
        stealing={stealing}
        onConfirm={(share) => handleSteal(share)}
        onClose={() => setStealModal(null)}
      />
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
    </div>
  )
}
