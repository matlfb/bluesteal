'use client'
import Confetti from '@/components/Confetti'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import ProfileCard from '@/components/ProfileCard'
import { BASE_PRICE } from '@/lib/bsky'
import StealModal from '@/components/StealModal'
import { Agent, RichText } from '@atproto/api'
import { useLang } from '@/context/LangContext'

interface Card {
  did: string
  handle: string
  displayName: string
  avatar: string | null
  followersCount: number
  owner: string | null
  price: number
}

function Carousel({ cards, loading, onCardClick, userDid, ownedDids }: { cards: Card[]; loading: boolean; onCardClick?: (card: Card) => void; userDid?: string; ownedDids?: Set<string> }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="carousel-scroll">
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: 200, aspectRatio: '4/5', background: '#0f1318', opacity: 0.5 }} />
          ))
        : cards.map(card => (
            <Link key={card.did} href={`/profil/${card.handle}`} style={{ flexShrink: 0, width: 200, textDecoration: 'none', display: 'block' }}>
              <ProfileCard handle={card.handle} displayName={card.displayName} avatar={card.avatar} followersCount={card.followersCount} price={card.price} owner={card.owner} onPillClick={onCardClick && userDid && !ownedDids?.has(card.did) && userDid !== card.did ? () => onCardClick(card) : undefined} />
            </Link>
          ))
      }
    </div>
  )
}

function CardGrid({ cards, loading, onCardClick, userDid, isMobile }: {
  cards: Card[]
  loading: boolean
  onCardClick?: (card: Card) => void
  userDid?: string
  isMobile: boolean
}) {
  return (
    <div style={{ maxWidth: isMobile ? 'none' : 1100, margin: isMobile ? 0 : '0 auto', padding: isMobile ? 0 : '0 2.5rem', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: isMobile ? '0.75rem' : '1rem', alignItems: 'stretch' }}>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '4/5', background: '#0f1318', opacity: 0.5 }} />
            ))
          : cards.map(card => (
              <Link key={card.did} href={`/profil/${card.handle}`} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
                <ProfileCard handle={card.handle} displayName={card.displayName} avatar={card.avatar} followersCount={card.followersCount} price={card.price} owner={card.owner} onPillClick={onCardClick && userDid && userDid !== card.did ? () => onCardClick(card) : undefined} />
              </Link>
            ))
        }
      </div>
    </div>
  )
}

function SectionTitle({ children, isMobile, isTablet, compact }: { children: React.ReactNode; isMobile?: boolean; isTablet?: boolean; compact?: boolean }) {
  return (
    <div style={{ maxWidth: (isMobile && compact) ? 'none' : 1100, margin: (isMobile && compact) ? 0 : '0 auto', padding: isMobile ? (compact ? 0 : '20px 20px 12px') : isTablet ? (compact ? '0 2.5rem' : '24px 2.5rem 0') : '0 2.5rem', marginBottom: isMobile ? (compact ? '12px' : 0) : '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? '2rem' : '2.4rem', fontWeight: 400, color: '#e8e6dc', flexShrink: 0 }}>{children}</h2>
      </div>
    </div>
  )
}

function Divider() {
  return (
    <div style={{ maxWidth: 1100, margin: '1.5rem auto 0', padding: '0 2.5rem' }}>
      <div style={{ height: 1, background: 'rgba(0,229,255,0.08)' }} />
    </div>
  )
}

function SegmentedControl({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid rgba(0,229,255,0.15)', background: '#0a0d11', marginBottom: '2rem' }}>
      {tabs.map((tab, i) => (
        <button key={i} onClick={() => onChange(i)} style={{ padding: '0.55rem 1.5rem', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, border: 'none', borderRight: i < tabs.length - 1 ? '1px solid rgba(0,229,255,0.15)' : 'none', cursor: 'pointer', background: active === i ? 'rgba(0,229,255,0.1)' : 'transparent', color: active === i ? '#00e5ff' : '#5a6270', transition: 'background 0.15s, color 0.15s' }}>
          {tab}
        </button>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { user, session, loading: authLoading, deductJetons, ownedDids, addOwned } = useAuth()
  const { t } = useLang()

  const [hotCards,      setHotCards]      = useState<Card[]>([])
  const [hotLoading,    setHotLoading]    = useState(true)
  const [recentCards,   setRecentCards]   = useState<Card[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [modalCard,     setModalCard]     = useState<Card | null>(null)
  const [stealing,      setStealing]      = useState(false)
  const [showConfetti,  setShowConfetti]  = useState(false)
  const [friendCards,   setFriendCards]   = useState<Card[]>([])
  const [friendLoading, setFriendLoading] = useState(false)
  const [activeTab,     setActiveTab]     = useState(0)
  const [isMobile,      setIsMobile]      = useState(false)
  const [isTablet,      setIsTablet]      = useState(false)

  useEffect(() => {
    const check = () => { setIsMobile(window.innerWidth < 640); setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/hot')
      .then(r => r.json())
      .then(data => setHotCards((data.cards ?? []).map((c: any) => ({ did: c.did, handle: c.handle, displayName: c.displayName || c.handle, avatar: c.avatar, followersCount: c.followersCount, owner: c.owner_handle, price: c.value }))))
      .catch(() => {})
      .finally(() => setHotLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/recent?limit=8')
      .then(r => r.json())
      .then(data => setRecentCards((data.cards ?? []).map((c: any) => ({ did: c.subject_did, handle: c.handle, displayName: c.displayName || c.handle, avatar: c.avatar, followersCount: c.followersCount, owner: c.owner_handle, price: c.value ?? BASE_PRICE }))))
      .catch(() => {})
      .finally(() => setRecentLoading(false))
  }, [])

  useEffect(() => {
    if (!user?.did) return
    setFriendLoading(true)
    async function load() {
      const dids: string[] = []
      let cursor: string | undefined
      do {
        const url = `https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows?actor=${encodeURIComponent(user!.did)}&limit=100${cursor ? `&cursor=${cursor}` : ''}`
        try { const r = await fetch(url); const data = await r.json(); for (const f of (data.follows ?? [])) dids.push(f.did); cursor = data.cursor }
        catch { break }
      } while (cursor && dids.length < 200)
      if (dids.length === 0) { setFriendLoading(false); return }
      const profileMap: Record<string, any> = {}
      for (let i = 0; i < dids.length; i += 25) {
        try { const batch = dids.slice(i, i + 25); const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&'); const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`); const data = await r.json(); for (const p of (data.profiles ?? [])) profileMap[p.did] = p } catch {}
      }
      let ownerMap: Record<string, { owner: string | null; value: number }> = {}
      try { const res = await fetch(`/api/owners?subjects=${dids.join(',')}`); ownerMap = await res.json() } catch {}
      const cards: Card[] = dids.map(did => { const p = profileMap[did]; if (!p) return null; return { did, handle: p.handle, displayName: p.displayName || p.handle, avatar: p.avatar || null, followersCount: p.followersCount || 0, owner: ownerMap[did]?.owner ?? null, price: ownerMap[did]?.value ?? BASE_PRICE } }).filter(Boolean) as Card[]
      setFriendCards(cards)
      setFriendLoading(false)
    }
    load().catch(() => setFriendLoading(false))
  }, [user?.did])

  async function handleSteal(shareOnBsky = false) {
    if (!session || !user || !modalCard || stealing) return
    setStealing(true)
    try {
      const agent = new Agent(session)
      await agent.com.atproto.repo.createRecord({ repo: user.did, collection: 'blue.steal.card', record: { $type: 'blue.steal.card', subject: { did: modalCard.did, handle: modalCard.handle }, price: modalCard.price, purchasedAt: new Date().toISOString() } })
      deductJetons(modalCard.price)
      addOwned(modalCard.did)
      fetch('/api/own', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject_did: modalCard.did, subject_handle: modalCard.handle, owner_did: user.did, owner_handle: user.handle, purchased_at: new Date().toISOString() }) }).catch(() => {})
      const updateOwner = (cards: Card[]) => cards.map(c => c.did === modalCard.did ? { ...c, owner: user.handle } : c)
      setHotCards(updateOwner); setRecentCards(updateOwner); setFriendCards(updateOwner)
      setShowConfetti(true)
      setModalCard(null)
      if (shareOnBsky) {
        const price = modalCard.price.toLocaleString()
        const emoji = ['🥳', '🔥', '🤯'][Math.floor(Math.random() * 3)]
        const text = modalCard.owner
          ? `I just bought @${modalCard.handle} from @${modalCard.owner} for ${price} tokens on @bluesteal.app ${emoji}`
          : `I bought @${modalCard.handle} for ${price} tokens on @bluesteal.app ${emoji}`
        const rt = new RichText({ text })
        rt.detectFacets(agent).then(() => agent.post({ text: rt.text, facets: rt.facets })).catch(() => {})
      }
    } catch (e) { console.error('Steal failed:', e) }
    finally { setStealing(false) }
  }

  if (authLoading) return null

  const tabLabels = [t('home_tab_following'), 'Hot']

  return (
    <div>
      {!user && (
        <div style={{ minHeight: '100vh', marginTop: '-60px', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', padding: isMobile ? '2rem 1.5rem' : '2rem' }}>
          <div style={{ textAlign: isMobile ? 'left' : 'center', maxWidth: isMobile ? 'none' : 600 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#00e5ff', letterSpacing: '0.2em', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'center', gap: '1rem' }}>
              {!isMobile && <span style={{ display: 'block', width: 40, height: 1, background: '#00b4d8' }} />}
              {t('home_label')}
              <span style={{ display: 'block', width: 40, height: 1, background: '#00b4d8' }} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: isMobile ? '3rem' : '4rem', lineHeight: 1.1, fontWeight: 400, color: '#e8e6dc', marginBottom: '1.25rem' }}>
              {t('home_h1a')} <em style={{ fontStyle: 'italic', color: '#00e5ff' }}>{t('home_h1b')}</em>
            </h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: isMobile ? '1rem' : '1.05rem', color: '#8a8878', lineHeight: 1.8, fontWeight: 300, marginBottom: '2.5rem' }}>
              {t('home_sub')}
            </p>
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.75rem 1.75rem', background: '#00b4d8', color: '#0a0d11', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, letterSpacing: '0.05em', textDecoration: 'none' }}>
              {t('home_sign_in')}
            </Link>
          </div>
        </div>
      )}

      {user && (recentCards.length > 0 || recentLoading) && (
        <div style={{ padding: (isMobile || isTablet) ? 0 : '3.5rem 0 0' }}>
          <SectionTitle isMobile={isMobile} isTablet={isTablet}>Collectés récemment</SectionTitle>
          <Carousel cards={recentCards} loading={recentLoading} onCardClick={setModalCard} userDid={user.did} ownedDids={ownedDids} />
          <Divider />
        </div>
      )}

      {user && <div id="explorer" style={{ padding: isMobile ? '20px' : '3.5rem 0 4rem' }}>
        <SectionTitle isMobile={isMobile} isTablet={isTablet} compact>Explorer</SectionTitle>
        <div style={{ maxWidth: isMobile ? 'none' : 1100, margin: isMobile ? 0 : '0 auto', padding: isMobile ? 0 : '0 2.5rem' }}>
          <SegmentedControl tabs={tabLabels} active={activeTab} onChange={setActiveTab} />
        </div>

        {activeTab === 0 && (
          !user ? (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2.5rem' }}>
              <div style={{ background: '#0f1318', padding: '2rem', border: '1px solid rgba(0,229,255,0.1)', maxWidth: 400, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#00b4d8' }} />
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#e8e6dc', marginBottom: '0.5rem' }}>{t('home_friends_login_title')}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{t('home_friends_login_sub')}</p>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.6rem 1.25rem', background: '#00b4d8', color: '#0a0d11', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.05em', textDecoration: 'none' }}>{t('home_friends_login_btn')}</Link>
              </div>
            </div>
          ) : friendCards.length === 0 && !friendLoading ? (
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 2.5rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)' }}>{t('home_no_following')}</p>
            </div>
          ) : (
            <CardGrid cards={friendCards} loading={friendLoading} onCardClick={user ? setModalCard : undefined} userDid={user?.did} isMobile={isMobile} />
          )
        )}

        {activeTab === 1 && (
          <CardGrid cards={hotCards} loading={hotLoading} onCardClick={user ? setModalCard : undefined} userDid={user?.did} isMobile={isMobile} />
        )}
      </div>}

      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      <StealModal
        open={!!modalCard}
        handle={modalCard?.handle ?? ''}
        displayName={modalCard?.displayName ?? ''}
        avatar={modalCard?.avatar ?? null}
        price={modalCard?.price ?? 0}
        prevOwnerHandle={modalCard?.owner}
        isOwned={!!modalCard && ownedDids.has(modalCard.did)}
        stealing={stealing}
        onConfirm={(share) => handleSteal(share)}
        onClose={() => setModalCard(null)}
      />
    </div>
  )
}
