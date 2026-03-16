'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
  ownedDids: Set<string>
  addOwned: (did: string) => void
  deductJetons: (amount: number) => void
  addJetons: (amount: number) => void
  signIn: (handle: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  jetons: 25000,
  ownedDids: new Set(),
  addOwned: () => {},
  deductJetons: () => {},
  addJetons: () => {},
  signIn: async () => {},
  signOut: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<OAuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [jetons, setJetons] = useState(25000)
  const [ownedDids, setOwnedDids] = useState<Set<string>>(new Set())

  function syncBalance(did: string) {
    fetch(`/api/balance?did=${encodeURIComponent(did)}`)
      .then(r => r.json())
      .then(data => {
        if (typeof data.balance === 'number') {
          setJetons(data.balance)
        }
      })
      .catch(() => {})
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

  async function fetchOwnedDids(oauthSession: OAuthSession) {
    try {
      // Use backend as source of truth (not PDS which keeps all-time records)
      const res = await fetch(`/api/owned?owner_did=${encodeURIComponent(oauthSession.did)}`)
      const data = await res.json()
      const dids = new Set<string>(
        (data.owned ?? []).map((o: any) => o.subject_did as string)
      )
      setOwnedDids(dids)
    } catch {
      // silently ignore — user just won't see owned state
    }
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

    try {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
      )
      if (res.ok) {
        const profile = await res.json()
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

    // Fetch owned cards after session is ready
    await fetchOwnedDids(oauthSession)

    // Sync server balance
    syncBalance(did)
  }

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
      scope: 'atproto transition:generic',
    })
  }

  async function signOut() {
    if (session) {
      try {
        await session.signOut()
      } catch {}
    }
    setUser(null)
    setSession(null)
    setOwnedDids(new Set())
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, jetons, ownedDids, addOwned, deductJetons, addJetons, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
