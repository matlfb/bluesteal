'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import Link from 'next/link'
import ProfileCard from '@/components/ProfileCard'
import { BASE_PRICE } from '@/lib/bsky'
import { useLang } from '@/context/LangContext'
import HistoryTab from '@/components/HistoryTab'

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
}

interface BskyPost {
  uri: string
  text: string
  createdAt: string
  likeCount: number
  repostCount: number
  replyCount: number
}

interface OwnedCard {
  handle: string
  displayName: string
  avatar: string | null
  followersCount: number
  value: number
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



export default function ComptePage() {
  const { user, session, loading: authLoading, jetons } = useAuth()
  const { t, fmtRel, fmtNum } = useLang()
  const [profile, setProfile] = useState<FullProfile | null>(null)
  const [posts, setPosts] = useState<BskyPost[]>([])
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([])
  const [collectionLoading, setCollectionLoading] = useState(false)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [myCardValue, setMyCardValue] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('collection')

  useEffect(() => {
    if (!user?.did) return
    fetch(`/api/owners?subjects=${encodeURIComponent(user.did)}`)
      .then(r => r.json())
      .then(data => { const v = data[user.did]?.value; if (v) setMyCardValue(v) })
      .catch(() => {})
  }, [user?.did])

  useEffect(() => {
    if (!user?.did || !session) return
    setLoading(true)
    Promise.all([
      fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(user.did)}`).then(r => r.json()),
      fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(user.did)}&limit=10&filter=posts_no_replies`).then(r => r.json()),
    ]).then(([p, f]) => {
      setProfile({
        did: p.did, handle: p.handle,
        displayName: p.displayName || p.handle,
        avatar: p.avatar || null,
        banner: p.banner || null,
        description: p.description || null,
        followersCount: p.followersCount || 0,
        followsCount: p.followsCount || 0,
        postsCount: p.postsCount || 0,
      })
      setPosts((f.feed || [])
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
    }).catch(console.error).finally(() => setLoading(false))

    // Fetch collection from backend (source of truth = ownerships.json)
    setCollectionLoading(true)
    fetch(`/api/owned?owner_did=${encodeURIComponent(user.did)}`)
      .then(r => r.json())
      .then(async (data) => {
        const owned: Array<{ subject_did: string; value: number; purchased_at: string }> = (data.owned ?? []).sort((a: any, b: any) => b.purchased_at.localeCompare(a.purchased_at))
        if (owned.length === 0) return []
        const dids = owned.map(o => o.subject_did)
        const profiles: Record<string, any> = {}
        for (let i = 0; i < dids.length; i += 25) {
          const batch = dids.slice(i, i + 25)
          const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
          const pr = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
          const pd = await pr.json()
          for (const p of (pd.profiles ?? [])) profiles[p.did] = p
        }
        return owned.map(o => {
          const p = profiles[o.subject_did]
          return {
            handle: p?.handle || o.subject_did,
            displayName: p?.displayName || p?.handle || o.subject_did,
            avatar: p?.avatar || null,
            followersCount: p?.followersCount || 0,
            value: o.value,
          }
        })
      })
      .then(cards => setOwnedCards(cards || []))
      .catch(() => {})
      .finally(() => setCollectionLoading(false))

    // Fetch history
    fetch(`/api/history?did=${encodeURIComponent(user.did)}`)
      .then(r => r.json())
      .then(data => setHistoryEvents(data.events ?? []))
      .catch(() => {})
  }, [user?.did, session])

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)', letterSpacing: '0.1em' }}>{t('account_loading')}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#e8e6dc', marginBottom: '1rem' }}>{t('account_not_connected_title')}</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--t3)', marginBottom: '2rem', lineHeight: 1.7 }}>
            {t('account_not_connected_sub')}
          </p>
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', padding: '0.75rem 1.75rem',
            background: '#00b4d8', color: '#0a0d11',
            fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
            letterSpacing: '0.05em', textDecoration: 'none',
          }}>
            Connexion Bluesky →
          </Link>
        </div>
      </div>
    )
  }

  const p = profile || { did: user.did, handle: user.handle, displayName: user.displayName || user.handle, avatar: user.avatar || null, banner: null, description: null, followersCount: 0, followsCount: 0, postsCount: 0 }

  return (
    <div>

      {/* Bannière */}
      <div style={{ height: 200, overflow: 'hidden', position: 'relative', background: '#0f1318' }}>
        {p.banner ? (
          <img src={p.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7)' }} />
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
            <div style={{ width: 112, height: 112, flexShrink: 0, border: '3px solid #0e0e0c', background: '#0f1318', position: 'relative', zIndex: 1 }}>
              {p.avatar ? (
                <img src={p.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#14191f' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: '#00e5ff', fontStyle: 'italic', opacity: 0.4 }}>
                    {(p.displayName || p.handle).charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <div className='profile-info'>
              <div className='profile-meta'>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', lineHeight: 1.05, color: '#e8e6dc' }}>
                      {p.displayName || p.handle}
                    </h1>
                    <a
                      href={`https://bsky.app/profile/${p.handle}`}
                      target="_blank" rel="noopener"
                      title={t("account_view_on_bsky")}
                      style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginBottom: '0.1rem', opacity: 0.5, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.5' }}
                    >
                      <svg width="22" height="22" viewBox="0 0 600 530" fill="#0085ff"><path d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.324-9.904 145.45-15.716 166.2-20.189 72.065-93.719 90.463-159.07 79.3 114.25 19.42 143.38 83.786 80.569 148.15-119.35 122.58-171.51-30.749-184.85-70.087-2.567-7.738-3.756-11.342-3.991-8.824-.234-2.518-1.424.086-3.991 8.824-13.337 39.338-65.498 192.67-184.85 70.087-62.809-64.366-33.675-128.73 80.57-148.15-65.351 11.162-138.88-7.235-159.07-79.3C14.908 214.27 5 86.146 5 68.825 5-19.862 82.742 8.009 135.72 44.03z"/></svg>
                    </a>
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--t3)' }}>@{p.handle}</p>
                </div>
                <div className='profile-actions'>
                  <button disabled className='profile-steal-btn' style={{
                    padding: '0.5rem 1.5rem',
                    background: '#0f1318',
                    color: '#8a8878',
                    border: '1px solid rgba(0,229,255,0.2)',
                    fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
                    letterSpacing: '0.1em', cursor: 'default',
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}>
                    {t('profil_your_card')}{myCardValue !== null ? ` — ${fmtNum(myCardValue)} J` : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {p.description && (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8a8878', lineHeight: 1.8, fontWeight: 300, maxWidth: 560, marginTop: '1rem', whiteSpace: 'pre-line' }}>
              {p.description}
            </p>
          )}

          {/* Stats */}
          <div className='profile-stats'>
            {[
              { label: t('account_stat_followers'), value: formatNum(p.followersCount) },
              { label: t('account_stat_following'), value: formatNum(p.followsCount)   },
              { label: t('account_stat_posts'),     value: formatNum(p.postsCount)      },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: '0.35rem' }}>{s.label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 500, color: '#e8e6dc' }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div className='profile-tabs-section'>

        {/* Tab bar */}
        <div style={{ display: 'flex', marginBottom: '2rem', borderBottom: '1px solid rgba(0,229,255,0.08)', paddingBottom: 0, position: 'sticky', top: 60, zIndex: 10, background: 'var(--bg)' }}>
          {([
            { id: 'collection', label: t('account_tab_collection') },
            { id: 'history',    label: t('account_tab_history')    },
            { id: 'posts',      label: t('account_tab_bsky')       },
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

        {/* COLLECTION */}
        {tab === 'collection' && (
          <div>
            {collectionLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'start' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ aspectRatio: '4/5', background: '#0f1318', opacity: 0.5 }} />
                ))}
              </div>
            ) : ownedCards.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'start' }}>
                {ownedCards.map(card => (
                  <Link key={card.handle} href={`/profil/${card.handle}`} style={{ textDecoration: 'none', display: 'block', width: '100%', minWidth: 0 }}>
                    <ProfileCard
                      handle={card.handle}
                      displayName={card.displayName}
                      avatar={card.avatar}
                      followersCount={card.followersCount}
                      price={card.value ?? BASE_PRICE}
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
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--t3)', textAlign: 'center', padding: '3rem 0' }}>
                {t('account_no_cards')}<Link href="/" style={{ color: '#00e5ff', textDecoration: 'none' }}>{t('account_explore_link')}</Link>
              </p>
            )}
          </div>
        )}

        {/* HISTORIQUE */}
        {tab === 'history' && (
          <HistoryTab events={historyEvents} cardHistory={[]} />
        )}

        {/* ACTIVITÉ BSKY */}
        {tab === 'posts' && (
          <div style={{ maxWidth: 1020 }}>
            {posts.length === 0 && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--t3)', padding: '2rem 0' }}>{t('account_no_posts')}</p>
            )}
            <div style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}>
              {posts.map(post => {
                const bskyUrl = `https://bsky.app/profile/${p.handle}/post/${post.uri.split('/').pop()}`
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
    </div>
  )
}
