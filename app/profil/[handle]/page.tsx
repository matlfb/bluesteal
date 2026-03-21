'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ProfileCard from '@/components/ProfileCard'
import { BASE_PRICE } from '@/lib/bsky'
import { Agent, RichText } from '@atproto/api'
import { useLang } from '@/context/LangContext'
import HistoryTab from '@/components/HistoryTab'
import StealModal from '@/components/StealModal'
import { useAuth } from '@/context/AuthContext'
import Confetti from '@/components/Confetti'

interface FullProfile {
  did: string
  handle: string
  displayName: string
  avatar: string | null
  banner: string | null
  description: string | null
  followersCount: number
  followsCount: number
  postsCount: number
  verified: boolean
}

interface OwnedCard {
  handle: string
  displayName: string
  avatar: string | null
  followersCount: number
  value: number
  purchased_at: string
}

interface HistoryEvent {
  type: 'bought' | 'lost'
  actor_did: string
  subject_did: string
  subject_handle: string
  price: number
  at: string
  counterpart_handle?: string
}

type Tab = 'collection' | 'history' | 'posts'



function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1000).toFixed(0)}K`
  return String(n)
}


async function fetchOwnedCards(ownerDid: string): Promise<OwnedCard[]> {
  const res = await fetch(`/api/owned?owner_did=${encodeURIComponent(ownerDid)}`)
  if (!res.ok) return []
  const data = await res.json()
  const owned: Array<{ subject_did: string; value: number; purchased_at: string }> = data.owned ?? []
  if (owned.length === 0) return []

  const dids = owned.map(o => o.subject_did)
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

  return owned
    .sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))
    .map(o => {
      const p = profileMap[o.subject_did]
      return {
        handle: p?.handle || o.subject_did,
        displayName: p?.displayName || p?.handle || o.subject_did,
        avatar: p?.avatar || null,
        followersCount: p?.followersCount || 0,
        value: o.value,
        purchased_at: o.purchased_at,
      }
    })
}

export default function ProfilPage() {
  const params = useParams()
  const handle = Array.isArray(params.handle) ? params.handle[0] : params.handle as string

  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [posts, setPosts] = useState<{ uri: string; text: string; createdAt: string; likeCount: number; repostCount: number; replyCount: number }[]>([])
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([])
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const { user, session, deductJetons, addJetons, ownedDids, addOwned } = useAuth()
  const { t, fmtRel, fmtNum } = useLang()
  const [stolen, setStolen] = useState(false)
  const [cardValue, setCardValue] = useState<number | null>(null)
  const [currentOwner, setCurrentOwner] = useState<{ owner_did: string; owner_handle: string } | null>(null)
  const [ownerLoading, setOwnerLoading] = useState(false)

  // Owned by me = context says so OR just stole it this session
  const isOwned = (!!profile && ownedDids.has(profile.did)) || stolen
  const isOwnProfile = !!user && !!profile && user.did === profile.did
  const [stealing, setStealing] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [tab, setTab] = useState<Tab>('collection')

  useEffect(() => {
    if (!handle) return
    setLoading(true)
    setNotFound(false)
    setOwnedCards([])
    setStolen(false)
    setCurrentOwner(null)
    const actor = encodeURIComponent(handle)
    Promise.all([
      fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${actor}`)
        .then(r => { if (!r.ok) throw new Error('not found'); return r.json() }),
      fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${actor}&limit=10&filter=posts_no_replies`)
        .then(r => r.json()).catch(() => ({ feed: [] })),
    ]).then(async ([data, feedData]) => {
      const p: FullProfile = {
        did: data.did, handle: data.handle,
        displayName: data.displayName || data.handle,
        avatar: data.avatar || null, banner: data.banner || null,
        description: data.description || null,
        followersCount: data.followersCount || 0,
        followsCount: data.followsCount || 0,
        postsCount: data.postsCount || 0,
        verified: data.verification?.verifiedStatus === 'valid',
      }
      // Check blacklist before displaying
      const bl = await fetch('/api/blacklist?did=' + encodeURIComponent(data.did)).then(r => r.json()).catch(() => ({ blacklisted: false }))
      if (bl.blacklisted) { setNotFound(true); return }

      setProfile(p)

      // Fetch current owner from backend
      setOwnerLoading(true)
      fetch(`/api/own?subject=${encodeURIComponent(data.did)}`)
        .then(r => r.json())
        .then(owner => {
          if (owner?.owner_did) setCurrentOwner(owner)
          if (owner?.value) setCardValue(owner.value)
        })
        .catch(() => {})
        .finally(() => setOwnerLoading(false))

      setPosts((feedData.feed || [])
        .filter((item: any) => !item.reply)
        .slice(0, 8)
        .map((item: any) => ({
          uri: item.post.uri,
          text: item.post.record?.text || '',
          createdAt: item.post.record?.createdAt || item.post.indexedAt,
          likeCount: item.post.likeCount || 0,
          repostCount: item.post.repostCount || 0,
          replyCount: item.post.replyCount || 0,
        })))

      // Fetch collection
      setCollectionLoading(true)
      fetchOwnedCards(data.did)
        .then(cards => setOwnedCards(cards))
        .catch(() => {})
        .finally(() => setCollectionLoading(false))

      // Fetch history
      fetch(`/api/history?did=${encodeURIComponent(data.did)}`)
        .then(r => r.json())
        .then(d => setHistoryEvents(d.events ?? []))
        .catch(() => {})
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [handle])

  // Real-time collection polling
  useEffect(() => {
    if (!profile) return
    const interval = setInterval(() => {
      fetchOwnedCards(profile.did)
        .then(cards => setOwnedCards(cards))
        .catch(() => {})
    }, 15000)
    return () => clearInterval(interval)
  }, [profile])



    if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)', letterSpacing: '0.1em' }}>
          {t('profil_loading')}
        </p>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#e8e6dc', marginBottom: '1rem' }}>
            {t('profil_not_found')}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)', marginBottom: '2rem' }}>
            @{handle} n'existe pas sur Bluesky.
          </p>
          <Link href="/" style={{
            padding: '0.6rem 1.5rem', background: '#00b4d8', color: '#0a0d11',
            fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.08em',
            textDecoration: 'none',
          }}>
            ← MARCHÉ
          </Link>
        </div>
      </div>
    )
  }

  async function handleSteal(shareOnBsky = false) {
    if (!session || !user || !profile || stolen || stealing) return
    setStealing(true)
    try {
      const agent = new Agent(session)
      await agent.com.atproto.repo.createRecord({
        repo: user.did,
        collection: 'blue.steal.card',
        record: {
          $type: 'blue.steal.card',
          subject: { did: profile.did, handle: profile.handle },
          price: BASE_PRICE,
          purchasedAt: new Date().toISOString(),
        },
      })
      const price = cardValue ?? BASE_PRICE
      deductJetons(price)
      addOwned(profile.did)
      const prevOwner = currentOwner
      setCurrentOwner({ owner_did: user.did, owner_handle: user.handle })
      fetch('/api/own', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_did: profile.did,
          subject_handle: profile.handle,
          owner_did: user.did,
          owner_handle: user.handle,
          purchased_at: new Date().toISOString(),
        }),
      }).then(r => r.json()).then(data => {
        if (data.newValue) setCardValue(data.newValue)
      }).catch(() => {})
      if (shareOnBsky) {
        const priceStr = price.toLocaleString()
        const emoji = ['🥳', '🔥', '🤯'][Math.floor(Math.random() * 3)]
        const text = prevOwner?.owner_handle
          ? `I just bought @${profile.handle} from @${prevOwner.owner_handle} for ${priceStr} tokens on @bluesteal.app ${emoji}\n\nPlay on https://bluesteal.app`
          : `I bought @${profile.handle} for ${priceStr} tokens on @bluesteal.app ${emoji}\n\nPlay on https://bluesteal.app`
        const rt = new RichText({ text })
        await rt.detectFacets(agent)
        agent.post({ text: rt.text, facets: rt.facets }).catch(() => {})
      }
      setShowConfetti(true)
      setStolen(true)
      setModalOpen(false)
    } catch (e) {
      console.error('Steal failed:', e)
    } finally {
      setStealing(false)
    }
  }

  return (
    <div>

      {/* Bannière */}
      <div style={{ height: 200, overflow: 'hidden', position: 'relative', background: '#0f1318' }}>
        {profile.banner ? (
          <img src={profile.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,

          }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0e0e0c)' }} />
      </div>

      {/* Profile header */}
      <div style={{ borderBottom: '1px solid rgba(0,229,255,0.08)', position: 'relative', zIndex: 1 }}>
        <div className='profile-header-wrap'>
          <div className='profile-header-row'>

            {/* Avatar */}
            <div style={{
              width: 112, height: 112, flexShrink: 0,
              border: '3px solid #0e0e0c',
              background: '#0f1318', position: 'relative', zIndex: 1,
            }}>
              {profile.avatar ? (
                <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#14191f' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: '#00e5ff', fontStyle: 'italic', opacity: 0.4 }}>
                    {profile.displayName.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Name + actions */}
            <div className='profile-info'>
              <div className='profile-meta'>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', lineHeight: 1.05, color: '#e8e6dc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {profile.displayName}
                      {profile.verified && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }} aria-label="Verified">
                          <circle cx="12" cy="12" r="12" fill="#0085ff"/>
                          <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </h1>
                    <a
                      href={`https://bsky.app/profile/${profile.handle}`}
                      target="_blank"
                      rel="noopener"
                      title={t("profil_view_on_bsky")}
                      style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: '0.1rem', opacity: 0.5, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5' }}
                    >
                      <svg width="22" height="22" viewBox="0 0 600 530" fill="#0085ff"><path d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.324-9.904 145.45-15.716 166.2-20.189 72.065-93.719 90.463-159.07 79.3 114.25 19.42 143.38 83.786 80.569 148.15-119.35 122.58-171.51-30.749-184.85-70.087-2.567-7.738-3.756-11.342-3.991-8.824-.234-2.518-1.424.086-3.991 8.824-13.337 39.338-65.498 192.67-184.85 70.087-62.809-64.366-33.675-128.73 80.57-148.15-65.351 11.162-138.88-7.235-159.07-79.3C14.908 214.27 5 86.146 5 68.825 5-19.862 82.742 8.009 135.72 44.03z"/></svg>
                    </a>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--t3)' }}>
                    @{profile.handle}
                  </p>
                </div>

                {/* Actions */}
                <div className='profile-actions'>
                  {user ? (
                    <button
                      onClick={() => { if (!isOwned && !isOwnProfile && !stolen && !stealing) setModalOpen(true) }}
                      disabled={isOwned || isOwnProfile || stolen || stealing}
                      className='profile-steal-btn'
                      style={{
                        padding: '0.5rem 1.5rem',
                        background: (isOwned || isOwnProfile || stolen) ? '#0f1318' : stealing ? '#003d52' : '#00b4d8',
                        color: (isOwned || isOwnProfile || stolen) || stealing ? '#8a8878' : '#0a0d11',
                        border: (isOwned || isOwnProfile || stolen) || stealing ? '1px solid rgba(0,229,255,0.2)' : '1px solid #00b4d8',
                        fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
                        letterSpacing: '0.1em', cursor: (isOwned || isOwnProfile || stolen) || stealing ? 'default' : 'pointer',
                        transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={e => { if (!isOwned && !isOwnProfile && !stolen && !stealing) (e.currentTarget as HTMLElement).style.background = '#00e5ff' }}
                      onMouseLeave={e => { if (!isOwned && !isOwnProfile && !stolen && !stealing) (e.currentTarget as HTMLElement).style.background = '#00b4d8' }}
                    >
                      {isOwnProfile ? `${t('profil_your_card')} — ${fmtNum(cardValue ?? BASE_PRICE)} J` : (isOwned || stolen) ? `${t('profil_owned')} — ${fmtNum(cardValue ?? BASE_PRICE)} J` : stealing ? t('profil_stealing') : currentOwner ? t('profil_steal_owner', { owner: currentOwner.owner_handle, price: fmtNum(cardValue ?? BASE_PRICE) }) : t('profil_steal_noowner', { price: fmtNum(cardValue ?? BASE_PRICE) })}
                    </button>
                  ) : (
                    <Link href="/login" style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '0.5rem 1.5rem',
                      background: '#00b4d8', color: '#0a0d11',
                      border: '1px solid #00b4d8',
                      fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
                      letterSpacing: '0.1em', textDecoration: 'none',
                    }}>
                      CONNEXION POUR STEAL →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {profile.description && (
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8a8878',
              lineHeight: 1.8, fontWeight: 300, maxWidth: 560,
              marginTop: '1rem', whiteSpace: 'pre-line',
            }}>
              {profile.description}
            </p>
          )}

          {/* Stats */}
          <div className='profile-stats'>
            {[
              { label: t('profil_stat_followers'), value: formatNum(profile.followersCount) },
              { label: t('profil_stat_following'), value: formatNum(profile.followsCount)   },
              { label: t('profil_stat_posts'),     value: formatNum(profile.postsCount)     },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: '0.35rem' }}>
                  {s.label}
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 500, color: '#e8e6dc' }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className='profile-tabs-section'>

        {/* Tab bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '2rem', borderBottom: '1px solid rgba(0,229,255,0.08)',
          paddingBottom: 0, position: 'sticky', top: 60, zIndex: 10, background: 'var(--bg)',
        }}>
          <div style={{ display: 'flex', gap: 0 }}>
            {([
              { id: 'collection', label: t('profil_tab_collection') },
              { id: 'history',    label: t('profil_tab_history')    },
              { id: 'posts',      label: t('profil_tab_bsky')       },
            ] as { id: Tab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '0.6rem 1.25rem',
                fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em',
                background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.id ? '#00e5ff' : 'var(--t3)',
                borderBottom: `2px solid ${tab === t.id ? '#00e5ff' : 'transparent'}`,
                transition: 'color 0.15s, border-color 0.15s',
                marginBottom: '-1px',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* COLLECTION */}
        {tab === 'collection' && (
          <div>
            {collectionLoading ? (
              <div className="collection-grid">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '4/5', background: '#0f1318', opacity: 0.5 }} />
                ))}
              </div>
            ) : ownedCards.length > 0 ? (
              <div className="collection-grid">
                {ownedCards.map(card => (
                  <Link key={card.handle} href={`/profil/${card.handle}`} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
                    <ProfileCard
                      handle={card.handle}
                      displayName={card.displayName}
                      avatar={card.avatar}
                      followersCount={card.followersCount}
                      price={card.value}
                      owner={profile.handle}
                      ownerHref={`/profil/${profile.handle}`}
                      onPillClick={() => { window.location.href = `/profil/${card.handle}` }}
                    />
                  </Link>
                ))}
                <Link href="/" style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
                  <div
                    style={{ border: '1px dashed rgba(0,229,255,0.12)', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s', position: 'relative' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.02)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.12)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ aspectRatio: '3/4' }} />
                    <div style={{ height: '88px' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--t4)', fontStyle: 'italic' }}>+</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t4)', letterSpacing: '0.2em' }}>{t('account_explore_label')}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(0,229,255,0.1)' }}>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--t4)', fontStyle: 'italic', marginBottom: '0.75rem' }}>{t('profil_no_cards')}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t4)', lineHeight: 1.8 }}>
                  {t('profil_no_cards_sub', { handle: profile.handle })}
                </p>
              </div>
            )}
          </div>
        )}

        {/* HISTORIQUE */}
        {tab === 'history' && (
          <HistoryTab events={historyEvents} />
        )}

        {/* ACTIVITÉ BSKY */}
        {tab === 'posts' && (
          <div style={{ maxWidth: 1020 }}>
            {posts.length === 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--t3)', padding: '2rem 0' }}>{t('profil_no_posts')}</p>
            )}
            <div style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}>
              {posts.map(post => {
                const bskyUrl = `https://bsky.app/profile/${profile!.handle}/post/${post.uri.split('/').pop()}`
                return (
                  <a key={post.uri} href={bskyUrl} target="_blank" rel="noopener" className="post-row"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', paddingTop: 2 }}>
                      {fmtRel(post.createdAt)}
                    </span>
                    <div>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#e8e6dc', fontWeight: 300, lineHeight: 1.7, marginBottom: '0.5rem' }}>{post.text}</p>
                      <div style={{ display: 'flex', gap: '1.5rem' }}>
                        {[{ label: '♥', value: post.likeCount }, { label: '↺', value: post.repostCount }, { label: '↩', value: post.replyCount }].map(s => (
                          <span key={s.label} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>{s.label} {s.value}</span>
                        ))}
                      </div>
                    </div>
                    <span className="post-row-arrow" style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--t3)', paddingTop: 2 }}>→</span>
                  </a>
                )
              })}
            </div>
          </div>
        )}

      </div>


      {/* Steal modal */}
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      <StealModal
        open={modalOpen}
        handle={profile?.handle ?? ''}
        displayName={profile?.displayName ?? ''}
        avatar={profile?.avatar ?? null}
        price={cardValue ?? BASE_PRICE}
        prevOwnerHandle={currentOwner?.owner_handle}
        isOwned={isOwned || isOwnProfile || stolen}
        stealing={stealing}
        onConfirm={(share) => handleSteal(share)}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}

