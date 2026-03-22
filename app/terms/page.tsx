export default function TermsPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#e8e6dc', marginBottom: '0.5rem' }}>
        BlueSTEAL — Terms of Service
      </h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: '3rem' }}>
        EFFECTIVE DATE: MARCH 2026
      </p>

      <Section n="1" title="What is BlueSTEAL">
        <p>BlueSTEAL is a virtual card-collecting game built on the AT Protocol (Bluesky). Players collect, buy, and trade cards representing public Bluesky profiles using an in-game virtual currency. No real money is exchanged between players. No ownership or control of any Bluesky account is transferred.</p>
      </Section>

      <Section n="2" title="Data We Store">
        <p>BlueSTEAL stores only the minimum data required to run the game:</p>
        <ul>
          <li>AT Protocol decentralized identifiers (DIDs) and handles, used as game card identifiers</li>
          <li>Card values and transaction history (buy/sell events within the game)</li>
          <li>A blocklist of accounts that have opted out</li>
        </ul>
        <p>We do not store profile pictures, bios, post content, or any other personal data. Profile information displayed in-game is fetched in real time from the public AT Protocol network and is not held on our servers.</p>
      </Section>

      <Section n="3" title="What Players Cannot Do">
        <p>Players have no ability to:</p>
        <ul>
          <li>Write, edit, or attach any content to another user's card</li>
          <li>Access, control, or interact with any Bluesky account</li>
          <li>Contact, message, or identify the real person behind a card within the game interface</li>
        </ul>
      </Section>

      <Section n="4" title="Opting Out">
        <p>Any Bluesky user can remove themselves from BlueSTEAL at any time by blocking the <strong>bluesteal.app</strong> account on Bluesky. Once blocked:</p>
        <ul>
          <li>Your card is immediately removed from the game</li>
          <li>Your DID is added to our blocklist so you cannot re-enter the game</li>
          <li>Any associated in-game value is voided and removed from circulation</li>
        </ul>
      </Section>

      <Section n="5" title="Use of Public AT Protocol Data">
        <p>BlueSTEAL uses only data that is publicly available on the AT Protocol network. By publishing a profile on Bluesky, users make that data available to any application built on the open AT Protocol. BlueSTEAL's use of this data is limited to game mechanics and does not involve resale, profiling, or targeting of any kind.</p>
      </Section>

      <Section n="6" title="Virtual Currency">
        <p>BlueSTEAL uses an in-game virtual currency with no real-world monetary value. Virtual currency cannot be exchanged, transferred, or redeemed for real money or goods outside of BlueSTEAL. In-app purchases, if available, are for virtual currency only and are non-refundable unless required by applicable law.</p>
      </Section>

      <Section n="7" title="Prohibited Use">
        <p>Users agree not to use BlueSTEAL to:</p>
        <ul>
          <li>Harass, target, or coordinate against any individual</li>
          <li>Exploit game mechanics in ways intended to harm a specific person's reputation</li>
          <li>Create or operate automated accounts (bots) without prior written approval</li>
        </ul>
      </Section>

      <Section n="8" title="Disclaimer">
        <p>BlueSTEAL is provided as-is. We reserve the right to suspend access, modify game mechanics, or shut down the service at any time. Card values are entirely fictional and carry no financial implication.</p>
      </Section>

      <Section n="9" title="Contact">
        <p>For any questions, opt-out requests, or concerns: <a href="mailto:hello@bluesteal.app" style={{ color: '#00e5ff', textDecoration: 'none' }}>hello@bluesteal.app</a></p>
        <p style={{ marginTop: '1rem', color: 'var(--t3)' }}>BlueSTEAL is an independent project, not affiliated with Bluesky Social PBC.</p>
      </Section>
    </div>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#00e5ff', letterSpacing: '0.2em', marginBottom: '0.75rem' }}>
        {n}. {title.toUpperCase()}
      </h2>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8a8878', fontWeight: 300, lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  )
}
