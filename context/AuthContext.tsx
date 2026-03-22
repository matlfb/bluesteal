'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import type { OAuthSession } from '@atproto/oauth-client-browser'

interface AuthUser {
  did: string
  handle: string
  displayName?: string
  avatar?: string
}

interface AuthContextType {
  user: AuthUser | null
  session: OAuthSession | null
  loading: boolean
  jetons: number
  balanceLoading: boolean
  ownedDids: Set<string>
  hasActivityAlert: boolean
  addOwned: (did: string) => void
  deductJetons: (amount: number) => void
  addJetons: (amount: number) => void
  clearActivityAlert: () => void
  signIn: (handle: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  jetons: 25000,
  balanceLoading: true,
  ownedDids: new Set(),
  hasActivityAlert: false,
  addOwned: () => {},
  deductJetons: () => {},
  addJetons: () => {},
  clearActivityAlert: () => {},
  signIn: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

const ACTIVITY_LAST_SEEN_KEY = 'activity_last_seen'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<OAuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [jetons, setJetons] = useState(25000)
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [ownedDids, setOwnedDids] = useState<Set<string>>(new Set())
  const [hasActivityAlert, setHasActivityAlert] = useState(false)
  const notifGrantedRef = useRef(false)
  const userDidRef = useRef<string | null>(null)

  function syncBalance(did: string) {
    setBalanceLoading(true)
    fetch(`/api/balance?did=${encodeURIComponent(did)}`)
      .then(r => r.json())
      .then(data => {
        if (typeof data.balance === 'number') {
          setJetons(data.balance)
        }
      })
      .catch(() => {})
      .finally(() => setBalanceLoading(false))
  }

  function deductJetons(amount: number) {
    setJetons(prev => Math.max(0, prev - amount))
  }

  function addJetons(amount: number) {
    setJetons(prev => prev + amount)
  }

  function addOwned(did: string) {
    setOwnedDids(prev => new Set(prev).add(did))
  }

  function clearActivityAlert() {
    setHasActivityAlert(false)
    try { localStorage.setItem(ACTIVITY_LAST_SEEN_KEY, new Date().toISOString()) } catch {}
  }

  const checkActivityAlert = useCallback(async (fireNotifs = false) => {
    try {
      const res = await fetch('/api/activity?type=mine&limit=50')
      if (!res.ok) return
      const data = await res.json()
      const lastSeen = (() => {
        try { return localStorage.getItem(ACTIVITY_LAST_SEEN_KEY) ?? '1970-01-01T00:00:00Z' } catch { return '1970-01-01T00:00:00Z' }
      })()
      const userDid = userDidRef.current
      const lostEvents = (data.events ?? []).filter(
        (e: any) => e.prev_owner_did === userDid && e.at > lastSeen
      )
      if (lostEvents.length > 0) {
        setHasActivityAlert(true)
        if (fireNotifs && notifGrantedRef.current) {
          for (const ev of lostEvents) {
            new Notification('BlueSTEAL', {
              body: `@${ev.buyer_handle} bought @${ev.subject_handle} from your collection`,
              icon: '/favicon.ico',
            })
          }
        }
      } else {
        const hasAny = (data.events ?? []).some((e: any) => e.at > lastSeen)
        if (!hasAny) setHasActivityAlert(false)
      }
    } catch {}
  }, [])

  async function fetchOwnedDids(oauthSession: OAuthSession) {
    try {
      const res = await fetch(`/api/owned?owner_did=${encodeURIComponent(oauthSession.did)}`)
      const data = await res.json()
      const dids = new Set<string>(
        (data.owned ?? []).map((o: any) => o.subject_did as string)
      )
      setOwnedDids(dids)
    } catch {}
  }

  useEffect(() => {
    import('@/lib/oauth-client').then(async ({ getOAuthClient }) => {
      try {
        const client = getOAuthClient()
        const result = await client.init()
        if (result?.session) {
          await hydrateSession(result.session)
        }
      } catch (e) {
        console.error('OAuth init error:', e)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  async function hydrateSession(oauthSession: OAuthSession) {
    setSession(oauthSession)
    const did = oauthSession.did
    let handle = did

    try {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
      )
      if (res.ok) {
        const profile = await res.json()
        handle = profile.handle
        setUser({
          did,
          handle: profile.handle,
          displayName: profile.displayName,
          avatar: profile.avatar,
        })
      } else {
        setUser({ did, handle: did })
      }
    } catch {
      setUser({ did, handle: did })
    }

    const sessionRes = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, handle }),
    }).catch(() => null)

    if (sessionRes?.status === 403) {
      if (oauthSession) { try { await oauthSession.signOut() } catch {} }
      setUser(null)
      setSession(null)
      window.location.replace('/login?blocked=1&reason=session')
      return
    }

    await fetchOwnedDids(oauthSession)
    syncBalance(did)
  }

  // Keep userDidRef in sync
  useEffect(() => { userDidRef.current = user?.did ?? null }, [user?.did])

  // Request notification permission on login
  useEffect(() => {
    if (!user) return
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') { notifGrantedRef.current = true; return }
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { notifGrantedRef.current = p === 'granted' })
    }
  }, [user?.did])

  // Check for stolen cards once session is ready, then every 60s
  useEffect(() => {
    if (!user) return
    checkActivityAlert(false)
    const id = setInterval(() => checkActivityAlert(true), 60_000)
    return () => clearInterval(id)
  }, [user?.did, checkActivityAlert])

  // Poll balance every 5 min to pick up hourly income
  useEffect(() => {
    if (!user) return
    const id = setInterval(() => syncBalance(user.did), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [user?.did])

  async function signIn(handle: string) {
    const { getOAuthClient } = await import('@/lib/oauth-client')
    const client = getOAuthClient()
    await client.signIn(handle, {
      scope: 'atproto repo:app.bsky.feed.post?action=create',
    })
  }

  async function signOut() {
    if (session) {
      try { await session.signOut() } catch {}
    }
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {})
    setUser(null)
    setSession(null)
    setOwnedDids(new Set())
    setHasActivityAlert(false)
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, jetons, balanceLoading, ownedDids, hasActivityAlert, addOwned, deductJetons, addJetons, clearActivityAlert, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
