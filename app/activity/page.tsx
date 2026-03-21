'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'

interface ActivityEvent {
  buyer_did: string
  buyer_handle: string
  subject_did: string
  subject_handle: string
  prev_owner_did?: string | null
  prev_owner_handle?: string | null
  price: number
  at: string
}

interface Profile {
  did: string
  handle: string
  displayName: string
  avatar: string | null
}

type Tab = 'global' | 'friends' | 'mine'



function Avatar({ profile, handle, size = 36 }: { profile: Profile | null; handle: string; size?: number }) {
  const letter = profile?.displayName?.charAt(0) || handle?.charAt(0) || '?'
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      background: '#14191f', overflow: 'hidden', borderRadius: 0,
      border: '1px solid rgba(0,229,255,0.08)',
    }}>
      {profile?.avatar
        ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: size * 0.4, color: '#00e5ff', fontStyle: 'italic', opacity: 0.5 }}>{letter}</span>
          </div>
      }
    </div>
  )
}

function EventRow({ ev, profileCache, isFriendsTab, followingSet, isMineTab, myDid }: {
  ev: ActivityEvent
  profileCache: Record<string, Profile>
  isFriendsTab: boolean
  followingSet: Set<string>
  isMineTab?: boolean
  myDid?: string
}) {
  const { t, fmtDate, fmtNum } = useLang()
  const buyer   = profileCache[ev.buyer_did]
  const subject = profileCache[ev.subject_did]

  // In friends tab: if subject is a friend (but buyer isn't), frame as "was bought by"
  const subjectIsFriend = isFriendsTab && followingSet.has(ev.subject_did) && !followingSet.has(ev.buyer_did)

  // In mine tab: distinguish "you bought" vs "someone bought from you"
  const youBought = isMineTab && ev.buyer_did === myDid
  const soldFromYou = isMineTab && !youBought

  let verb: string
  if (isMineTab) {
    verb = youBought ? t('activity_you_bought') : t('activity_you_sold', { buyer: ev.buyer_handle ?? ev.buyer_did })
  } else {
    verb = subjectIsFriend ? t('activity_bought_by') : t('activity_bought')
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '36px 1fr auto',
      alignItems: 'center',
      gap: '1rem',
      padding: '1rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Buyer avatar */}
      <Link href={`/profil/${ev.buyer_handle}`} style={{ textDecoration: 'none' }}>
        <Avatar profile={buyer} handle={ev.buyer_handle} size={36} />
      </Link>

      {/* Text */}
      <div style={{ minWidth: 0 }}>
        {isMineTab ? (
          /* Mine tab: show simplified sentence */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', lineHeight: 1.5 }}>
            {youBought ? (
              <>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', flexShrink: 0 }}>
                  {t('activity_you_bought')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, background: '#14191f', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,229,255,0.08)' }}>
                    {subject?.avatar
                      ? <img src={subject.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 9, color: '#00e5ff', fontStyle: 'italic', opacity: 0.5 }}>{ev.subject_handle.charAt(0)}</span>
                        </div>
                    }
                  </div>
                  <Link href={`/profil/${ev.subject_handle}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
                  >
                    @{ev.subject_handle}
                  </Link>
                </div>
                {ev.prev_owner_handle && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', flexShrink: 0 }}>
                    {t('activity_from')}{' '}
                    <Link href={`/profil/${ev.prev_owner_handle}`} style={{ color: 'var(--t2)', textDecoration: 'none' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}
                    >
                      @{ev.prev_owner_handle}
                    </Link>
                  </span>
                )}
              </>
            ) : (
              /* Sold from you */
              <>
                <Link href={`/profil/${ev.buyer_handle}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--t1)', textDecoration: 'none', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                >
                  @{ev.buyer_handle}
                </Link>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#e05252', flexShrink: 0 }}>
                  bought
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                  <div style={{ width: 20, height: 20, background: '#14191f', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,229,255,0.08)' }}>
                    {subject?.avatar
                      ? <img src={subject.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-serif)', fontSize: 9, color: '#00e5ff', fontStyle: 'italic', opacity: 0.5 }}>{ev.subject_handle.charAt(0)}</span>
                        </div>
                    }
                  </div>
                  <Link href={`/profil/${ev.subject_handle}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--brand)', textDecoration: 'none' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
                  >
                    @{ev.subject_handle}
                  </Link>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#e05252', flexShrink: 0 }}>
                  from your collection
                </span>
              </>
            )}
          </div>
        ) : (
          /* Global / Friends tab: original layout */
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', lineHeight: 1.5 }}>
            <Link href={`/profil/${ev.buyer_handle}`} style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
              color: 'var(--t1)', textDecoration: 'none', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
            >
              @{ev.buyer_handle}
            </Link>

            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', flexShrink: 0 }}>
              {subjectIsFriend ? t('activity_bought_by') : t('activity_bought')}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
              <div style={{
                width: 20, height: 20, background: '#14191f', overflow: 'hidden', flexShrink: 0,
                border: '1px solid rgba(0,229,255,0.08)',
              }}>
                {subject?.avatar
                  ? <img src={subject.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 9, color: '#00e5ff', fontStyle: 'italic', opacity: 0.5 }}>
                        {ev.subject_handle.charAt(0)}
                      </span>
                    </div>
                }
              </div>
              <Link href={`/profil/${ev.subject_handle}`} style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
                color: 'var(--brand)', textDecoration: 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
              >
                @{ev.subject_handle}
              </Link>
            </div>

            {ev.prev_owner_handle && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', flexShrink: 0 }}>
                {t('activity_from')}{' '}
                <Link href={`/profil/${ev.prev_owner_handle}`} style={{ color: 'var(--t2)', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)' }}
                >
                  @{ev.prev_owner_handle}
                </Link>
              </span>
            )}
          </div>
        )}

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t4)', marginTop: '2px' }}>
          {fmtDate(ev.at)}
        </p>
      </div>

      {/* Price */}
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500,
        color: soldFromYou ? '#e05252' : 'var(--t3)', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {fmtNum(ev.price)} J
      </span>
    </div>
  )
}

export default function ActivityPage() {
  const { user } = useAuth()
  const { t } = useLang()
  const [tab, setTab]                     = useState<Tab>('mine')
  const [globalEvents, setGlobalEvents]   = useState<ActivityEvent[]>([])
  const [friendsEvents, setFriendsEvents] = useState<ActivityEvent[]>([])
  const [mineEvents, setMineEvents]       = useState<ActivityEvent[]>([])
  const [following, setFollowing]         = useState<string[]>([])
  const [followingSet, setFollowingSet]   = useState<Set<string>>(new Set())
  const [profileCache, setProfileCache]   = useState<Record<string, Profile>>({})
  const [loading, setLoading]             = useState(true)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [mineLoading, setMineLoading]     = useState(false)
  const [unseenMine, setUnseenMine]       = useState(0)
  const lastMineAt = useRef<string | null>(null)
  const notifGranted = useRef(false)

  // Fetch and cache profiles for a list of handles/dids
  const cacheProfiles = useCallback(async (events: ActivityEvent[]) => {
    const dids = [...new Set(events.flatMap(e => [e.buyer_did, e.subject_did]))]
    const missing = dids.filter(d => !profileCache[d])
    if (!missing.length) return
    const fetched: Record<string, Profile> = {}
    for (let i = 0; i < missing.length; i += 25) {
      const batch = missing.slice(i, i + 25)
      try {
        const params = batch.map(d => `actors=${encodeURIComponent(d)}`).join('&')
        const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfiles?${params}`)
        const data = await r.json()
        for (const p of (data.profiles ?? [])) {
          fetched[p.did] = { did: p.did, handle: p.handle, displayName: p.displayName || p.handle, avatar: p.avatar || null }
        }
      } catch {}
    }
    setProfileCache(prev => ({ ...prev, ...fetched }))
  }, [profileCache])

  // Request notification permission when user logs in
  useEffect(() => {
    if (!user) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') { notifGranted.current = true; return }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { notifGranted.current = p === 'granted' })
    }
  }, [user?.did])

  // Load global feed
  useEffect(() => {
    setLoading(true)
    fetch('/api/activity?type=global&limit=60')
      .then(r => r.json())
      .then(async data => {
        const events: ActivityEvent[] = data.events ?? []
        setGlobalEvents(events)
        await cacheProfiles(events)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Load following list when user logs in
  useEffect(() => {
    if (!user?.did) return
    async function loadFollowing() {
      const dids: string[] = [user!.did]
      let cursor: string | undefined
      do {
        const url = `https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows?actor=${encodeURIComponent(user!.did)}&limit=100${cursor ? `&cursor=${cursor}` : ''}`
        try {
          const r = await fetch(url)
          const data = await r.json()
          for (const f of (data.follows ?? [])) dids.push(f.did)
          cursor = data.cursor
        } catch { break }
      } while (cursor)
      setFollowing(dids)
      setFollowingSet(new Set(dids))
    }
    loadFollowing()
  }, [user?.did])

  // Load friends feed when following list is ready and tab switches
  useEffect(() => {
    if (tab !== 'friends' || !following.length) return
    setFriendsLoading(true)
    fetch(`/api/activity?type=friends&dids=${following.join(',')}&limit=60`)
      .then(r => r.json())
      .then(async data => {
        const events: ActivityEvent[] = data.events ?? []
        setFriendsEvents(events)
        await cacheProfiles(events)
      })
      .catch(() => {})
      .finally(() => setFriendsLoading(false))
  }, [tab, following.join(',')])

  // Fetch mine tab (initial + polling every 60s)
  const fetchMine = useCallback(async (isPolling = false) => {
    if (!user?.did) return
    try {
      const r = await fetch(`/api/activity?type=mine&limit=60`)
      const data = await r.json()
      const events: ActivityEvent[] = data.events ?? []

      if (isPolling && lastMineAt.current) {
        // Find new sold events (prev_owner_did === user.did) since last poll
        const newSold = events.filter(
          e => e.prev_owner_did === user!.did && e.at > lastMineAt.current!
        )
        if (newSold.length > 0) {
          setUnseenMine(prev => prev + newSold.length)
          if (notifGranted.current) {
            for (const ev of newSold) {
              new Notification(t('activity_notif_title'), {
                body: t('activity_notif_body', { buyer: ev.buyer_handle, subject: ev.subject_handle, price: ev.price }),
                icon: '/favicon.ico',
              })
            }
          }
        }
      }

      if (events.length > 0) lastMineAt.current = events[0].at
      setMineEvents(events)
      await cacheProfiles(events)
    } catch {}
  }, [user?.did])

  // Load mine tab when user logs in (initial fetch + polling)
  useEffect(() => {
    if (!user?.did) return
    setMineLoading(true)
    fetchMine(false).finally(() => setMineLoading(false))

    const interval = setInterval(() => fetchMine(true), 60_000)
    return () => clearInterval(interval)
  }, [user?.did, fetchMine])

  // Clear unseen badge when switching to mine tab
  useEffect(() => {
    if (tab === 'mine') setUnseenMine(0)
  }, [tab])

  const events    = tab === 'friends' ? friendsEvents : tab === 'mine' ? mineEvents : globalEvents
  const isLoading = tab === 'friends' ? friendsLoading : tab === 'mine' ? mineLoading : loading

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    ...(user ? [{ id: 'mine' as Tab, label: t('activity_tab_you'), badge: unseenMine }] : []),
    { id: 'global',  label: t('activity_tab_everyone') },
    { id: 'friends', label: t('activity_tab_friends')  },
  ]

  return (
    <div className='activity-wrap'>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.01em', marginBottom: '0.35rem' }}>
          { t('activity_title') }
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>
          { t('activity_subtitle') }
        </p>
      </div>

      {/* Segmented control */}
      <div style={{
        display: 'inline-flex',
        border: '1px solid rgba(0,229,255,0.15)',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        {tabs.map((item, idx) => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            padding: '0.5rem 1.25rem',
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em',
            background: tab === item.id ? 'rgba(0,229,255,0.1)' : 'transparent',
            color: tab === item.id ? '#00e5ff' : 'var(--t3)',
            border: 'none',
            borderRight: idx < tabs.length - 1 ? '1px solid rgba(0,229,255,0.15)' : 'none',
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            position: 'relative',
          }}>
            {item.label}
            {item.badge && item.badge > 0 ? (
              <span style={{
                position: 'absolute', top: 4, right: 4,
                background: '#e05252', color: '#fff',
                fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 700,
                borderRadius: '50%', width: 16, height: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Friends tab: not logged in */}
      {tab === 'friends' && !user && (
        <div style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px dashed rgba(0,229,255,0.1)' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--t4)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
            { t('activity_login_title') }
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t4)', marginBottom: '1.5rem' }}>
            { t('activity_login_sub') }
          </p>
          <Link href="/login" style={{
            padding: '0.5rem 1.5rem', background: '#00b4d8', color: '#0a0d11',
            fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textDecoration: 'none',
          }}>
            { t('activity_login_btn') }
          </Link>
        </div>
      )}

      {/* Loading */}
      {isLoading && (tab !== 'friends' || !!user) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              height: 64, background: '#0f1318', opacity: 0.4 - i * 0.04,
              borderBottom: '1px solid rgba(255,255,255,0.03)',
            }} />
          ))}
        </div>
      )}

      {/* Events list */}
      {!isLoading && (tab !== 'friends' || !!user) && (
        events.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', border: '1px dashed rgba(0,229,255,0.1)' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: 'var(--t4)', fontStyle: 'italic', marginBottom: '0.75rem' }}>
              {tab === 'friends' ? t('activity_empty_friends_title') : tab === 'mine' ? t('activity_empty_you_title') : t('activity_empty_global_title')}
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t4)', lineHeight: 1.8 }}>
              {tab === 'friends' ? t('activity_empty_friends_sub') : tab === 'mine' ? t('activity_empty_you_sub') : t('activity_empty_global_sub')}
            </p>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}>
            {events.map((ev, i) => (
              <EventRow
                key={i}
                ev={ev}
                profileCache={profileCache}
                isFriendsTab={tab === 'friends'}
                followingSet={followingSet}
                isMineTab={tab === 'mine'}
                myDid={user?.did}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
