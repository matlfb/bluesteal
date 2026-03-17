'use client'

import { createContext, useContext, useState } from 'react'
import { Lang, TKey, translations, interpolate, formatDate as fmtDate, formatRelative as fmtRel } from '@/lib/i18n'

interface LangCtx {
  lang: Lang
  locale: string
  t: (key: TKey, vars?: Record<string, string | number>) => string
  fmtDate: (iso: string) => string
  fmtRel: (iso: string) => string
  fmtNum: (n: number) => string
}

const LangContext = createContext<LangCtx>({
  lang: 'en',
  locale: 'en-US',
  t: (key) => String(translations.en[key] ?? key),
  fmtDate: (iso) => new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
  fmtRel: (iso) => iso,
  fmtNum: (n) => n.toLocaleString('en-US'),
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang] = useState<Lang>('en')

  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const t = (key: TKey, vars?: Record<string, string | number>): string =>
    interpolate(String((translations[lang] as any)[key] ?? translations.en[key] ?? key), vars)

  return (
    <LangContext.Provider value={{
      lang, locale, t,
      fmtDate: (iso) => fmtDate(iso, t, locale),
      fmtRel: (iso) => fmtRel(iso, t),
      fmtNum: (n) => n.toLocaleString(locale),
    }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() { return useContext(LangContext) }
