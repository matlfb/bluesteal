'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LangContext'
import { calcPrice } from '@/lib/bsky'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

interface SearchResult {
  did: string; handle: string; displayName: string; avatar: string | null; followersCount: number; verified: boolean
}

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#00e5ff' : 'none'} stroke={active ? '#00e5ff' : '#5a6270'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
      <polyline points="9 21 9 12 15 12 15 21"/>
    </svg>
  )
}
function IconSearch({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00e5ff' : '#5a6270'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconActivity({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00e5ff' : '#5a6270'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}
function IconLeaderboard({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#00e5ff' : '#5a6270'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="14" width="5" height="7" rx="1"/>
      <rect x="9.5" y="9" width="5" height="12" rx="1"/>
      <rect x="17" y="4" width="5" height="17" rx="1"/>
    </svg>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading: authLoading, signOut, jetons, hasActivityAlert, clearActivityAlert } = useAuth()
  const { t, fmtNum } = useLang()

  if ((pathname === '/' || pathname === '/login') && !user && !authLoading) return null

  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const mobileSearchRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 280)

  const navLinks = [
    { href: '/',            label: t('nav_market')      },
    { href: '/activity',    label: t('nav_activity')    },
    { href: '/leaderboard', label: t('nav_leaderboard') },
  ]

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node) &&
        mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)
      ) closeSearch()
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeSearch(); setDropdownOpen(false) }
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); setSearching(false); return }
    setSearching(true)
    fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(debouncedQuery)}&limit=7`)
      .then(r => r.json())
      .then(data => {
        setResults((data.actors || []).map((a: any) => ({
          did: a.did, handle: a.handle,
          displayName: a.displayName || a.handle,
          avatar: a.avatar || null,
          followersCount: a.followersCount || 0,
          verified: a.verification?.verifiedStatus === 'valid' || a.verification?.trustedVerifierStatus === 'valid',
        })))
        setFocusedIdx(-1)
      })
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [debouncedQuery])

  function openSearch() { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 60) }
  function closeSearch() { setSearchOpen(false); setQuery(''); setResults([]); setFocusedIdx(-1) }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && focusedIdx >= 0) { router.push(`/profil/${results[focusedIdx].handle}`); closeSearch() }
  }

  function formatFollowers(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1000).toFixed(0)}K`
    return String(n)
  }

  const showDropdown = searchOpen && query.trim().length > 0

  return (
    <>
      {/* Top bar */}
      <nav className="nav-top" style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 200, height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(14,14,12,0.96)' : '#0a0d11',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${scrolled ? 'rgba(0,229,255,0.1)' : 'transparent'}`,
        transition: 'background 0.25s, border-color 0.25s',
      }}>
        <Link href="/" onClick={closeSearch} style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#00e5ff', letterSpacing: '0.08em', textDecoration: 'none', flexShrink: 0 }}>
          BLUESTEAL
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          {/* Desktop nav links — only when connected */}
          {user && <div className="nav-desktop-links" style={{ alignItems: 'center', gap: '1.75rem' }}>
            {navLinks.map(({ href, label }) => {
              const active = pathname === href
              const isActivity = href === '/activity'
              const showBadge = isActivity && hasActivityAlert && !active
              return (
                <Link key={href} href={href}
                  onClick={isActivity ? clearActivityAlert : undefined}
                  style={{ position: 'relative', fontFamily: 'var(--font-mono)', fontSize: '12px', letterSpacing: '0.1em', textDecoration: 'none', color: active ? '#00e5ff' : '#8a8878', transition: 'color 0.2s' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#00e5ff' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#8a8878' }}
                >
                  {label}
                  {showBadge && <span style={{ position: 'absolute', top: -4, right: -8, width: 6, height: 6, borderRadius: '50%', background: '#e05252', display: 'block' }} />}
                </Link>
              )
            })}
          </div>}

          {/* Desktop search — only when connected */}
          {user && <div ref={searchWrapRef} className="nav-desktop-search-wrap" style={{ position: 'relative' }}>
            {searchOpen ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 260 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={searchInputRef} type="text" value={query}
                  onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={t('nav_search_placeholder')}
                  style={{ width: '100%', padding: '0.45rem 2.2rem 0.45rem 2rem', background: '#0f1318', border: '1px solid rgba(0,229,255,0.25)', color: '#e8e6dc', fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none', letterSpacing: '0.02em' }}
                />
                {query && (
                  <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>x</button>
                )}
              </div>
            ) : (
              <button className="nav-desktop-search" onClick={openSearch}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00e5ff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8a8878' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                {t('nav_search')}
              </button>
            )}

            {showDropdown && (
              <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 360, background: '#0f1318', border: '1px solid rgba(0,229,255,0.15)', zIndex: 300, maxHeight: 420, overflowY: 'auto' }}>
                {searching && !results.length && (
                  <div style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>{t('nav_searching')}</div>
                )}
                {!searching && results.length === 0 && query.trim() && (
                  <div style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>
                    {t('nav_no_results', { query })}
                  </div>
                )}
                {results.map((r, i) => (
                  <Link key={r.did} href={`/profil/${r.handle}`} onClick={closeSearch}
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', textDecoration: 'none', color: 'inherit', background: i === focusedIdx ? 'rgba(0,229,255,0.06)' : 'transparent', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', borderLeft: `3px solid ${i === focusedIdx ? '#00e5ff' : 'transparent'}`, transition: 'background 0.1s, border-left-color 0.1s', cursor: 'pointer' }}
                    onMouseEnter={e => { setFocusedIdx(i); (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.06)'; (e.currentTarget as HTMLElement).style.borderLeftColor = '#00e5ff' }}
                    onMouseLeave={e => { if (focusedIdx !== i) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.borderLeftColor = 'transparent' } }}
                  >
                    <div style={{ width: 38, height: 38, flexShrink: 0, background: '#14191f', overflow: 'hidden' }}>
                      {r.avatar ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#00e5ff', fontStyle: 'italic', opacity: 0.4 }}>{r.displayName.charAt(0)}</span></div>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#e8e6dc', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {r.displayName}
                        {r.verified && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="12" fill="#0085ff"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        @{r.handle}
                        {r.followersCount > 0 && <span style={{ marginLeft: '0.75rem', color: 'var(--t4)' }}>{t('nav_followers_short', { n: formatFollowers(r.followersCount) })}</span>}
                      </p>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00e5ff' }}>{fmtNum(calcPrice(r.followersCount))} J</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--t4)', marginTop: '2px' }}>{t('nav_price_label')}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>}

          {/* Jetons */}
          {user && (
            <Link href="/jetons" onClick={closeSearch} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: 'var(--font-mono)', fontSize: '12px', border: `1px solid ${pathname === '/jetons' ? 'rgba(0,229,255,0.35)' : 'rgba(0,229,255,0.15)'}`, padding: '0 0.9rem', height: '35px', textDecoration: 'none', background: pathname === '/jetons' ? 'rgba(0,229,255,0.04)' : 'none', flexShrink: 0 }}
              onMouseEnter={e => { if (pathname !== '/jetons') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.03)' } }}
              onMouseLeave={e => { if (pathname !== '/jetons') { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,255,0.15)'; (e.currentTarget as HTMLElement).style.background = 'none' } }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', display: 'inline-block', animation: 'pulse 2s infinite', flexShrink: 0 }} />
              <span style={{ color: '#e8e6dc', letterSpacing: '0.05em' }}>{fmtNum(jetons)} <span style={{ color: 'var(--t3)' }}>J</span></span>
            </Link>
          )}

          {/* Desktop user dropdown */}
          <div className="nav-desktop-user">
            {authLoading ? (
              <div style={{ width: 34, height: 34, background: '#14191f', border: '1px solid rgba(0,229,255,0.1)', animation: 'pulse 1.5s infinite' }} />
            ) : user ? (
              <div ref={userDropdownRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropdownOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: '1px solid rgba(0,229,255,0.2)', padding: '0.3rem 0.7rem 0.3rem 0.3rem', cursor: 'pointer', color: '#e8e6dc', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#00e5ff')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)')}
                >
                  {user.avatar ? <img src={user.avatar} alt="" style={{ width: 26, height: 26, objectFit: 'cover', display: 'block' }} /> : <div style={{ width: 26, height: 26, background: '#14191f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: '14px', color: '#00e5ff', fontStyle: 'italic' }}>{(user.displayName || user.handle).charAt(0)}</div>}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em' }}>@{user.handle}</span>
                  <span style={{ color: 'var(--t3)', fontSize: '10px' }}>v</span>
                </button>
                {dropdownOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#0f1318', border: '1px solid rgba(0,229,255,0.15)', minWidth: 200, zIndex: 300 }}>
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#e8e6dc', marginBottom: '2px' }}>{user.displayName || user.handle}</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>@{user.handle}</p>
                    </div>
                    <Link href="/account" onClick={() => setDropdownOpen(false)} style={{ display: 'block', padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8878', textDecoration: 'none', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00e5ff'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,229,255,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8a8878'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                      {t('nav_my_account')}
                    </Link>
                    <button onClick={() => { signOut(); setDropdownOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8878', letterSpacing: '0.05em', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseEnter={e => { (e.currentTarget).style.color = '#e05252'; (e.currentTarget).style.background = 'rgba(224,82,82,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget).style.color = '#8a8878'; (e.currentTarget).style.background = 'transparent' }}>
                      {t('nav_sign_out')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', padding: '0.4rem 1rem', background: '#00b4d8', color: '#0a0d11', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#00e5ff')}
                onMouseLeave={e => (e.currentTarget.style.background = '#00b4d8')}>
                {t('nav_sign_in')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom nav — mobile only */}
      <nav className="nav-bottom">
        <Link href="/" className="nav-bottom-item">
          <IconHome active={pathname === '/'} />
        </Link>
        {user && <button className="nav-bottom-item" onClick={openSearch}>
          <IconSearch active={searchOpen} />
        </button>}
        {user && <Link href="/activity" className="nav-bottom-item" onClick={clearActivityAlert} style={{ position: 'relative' }}>
          <IconActivity active={pathname === '/activity'} />
          {hasActivityAlert && pathname !== '/activity' && (
            <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: '#e05252', display: 'block' }} />
          )}
        </Link>}
        {user && <Link href="/leaderboard" className="nav-bottom-item">
          <IconLeaderboard active={pathname === '/leaderboard'} />
        </Link>}
        <Link href={user ? `/profil/${user.handle}` : '/login'} className="nav-bottom-item">
          {user?.avatar
            ? <img src={user.avatar} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', border: pathname.startsWith('/profil') ? '2px solid #00e5ff' : '2px solid transparent', display: 'block' }} />
            : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pathname.startsWith('/profil') ? '#00e5ff' : '#5a6270'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          }
        </Link>
      </nav>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div ref={mobileSearchRef} className="nav-mobile-search">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 12, pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchInputRef} type="text" value={query}
              onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={t('nav_search_placeholder')}
              style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 2.2rem', background: '#0f1318', border: '1px solid rgba(0,229,255,0.25)', color: '#e8e6dc', fontFamily: 'var(--font-mono)', fontSize: "16px", outline: 'none', letterSpacing: '0.02em' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>x</button>
            )}
          </div>
          {showDropdown && (
            <div style={{ marginTop: '0.5rem', background: '#0f1318', border: '1px solid rgba(0,229,255,0.15)', maxHeight: '60vh', overflowY: 'auto' }}>
              {searching && !results.length && (
                <div style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>{t('nav_searching')}</div>
              )}
              {!searching && results.length === 0 && query.trim() && (
                <div style={{ padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)' }}>{t('nav_no_results', { query })}</div>
              )}
              {results.map((r, i) => (
                <Link key={r.did} href={`/profil/${r.handle}`} onClick={closeSearch}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', textDecoration: 'none', color: 'inherit', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                >
                  <div style={{ width: 36, height: 36, flexShrink: 0, background: '#14191f', overflow: 'hidden' }}>
                    {r.avatar ? <img src={r.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: '#00e5ff', fontStyle: 'italic', opacity: 0.4 }}>{r.displayName.charAt(0)}</span></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: '#e8e6dc', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {r.displayName}
                      {r.verified && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="12" fill="#0085ff"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{r.handle}</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00e5ff' }}>{fmtNum(calcPrice(r.followersCount))} J</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
