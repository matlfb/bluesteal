export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#e8e6dc', marginBottom: '0.5rem' }}>
        BlueSTEAL — Privacy Policy
      </h1>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.1em', marginBottom: '3rem' }}>
        EFFECTIVE DATE: MARCH 2026
      </p>

      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: '#8a8878', fontWeight: 300, lineHeight: 1.8, marginBottom: '3rem' }}>
        This Privacy Policy explains what data BlueSTEAL collects, why, and what rights you have. BlueSTEAL is operated as an independent project. Our servers are hosted within the European Union.
      </p>

      <Section n="1" title="Who This Policy Applies To">
        <p>This policy applies to two distinct groups:</p>
        <ul>
          <li><strong>Players</strong> — Bluesky users who sign in to BlueSTEAL via OAuth and actively use the game.</li>
          <li><strong>Card subjects</strong> — Bluesky users whose public profiles appear as cards in the game, whether or not they have signed in.</li>
        </ul>
      </Section>

      <Section n="2" title="Data We Collect — Players">
        <p>When you sign in via Bluesky OAuth, we store:</p>
        <ul>
          <li>Your AT Protocol DID and handle, used to identify your account in the game</li>
          <li>Your in-game balance and transaction history (virtual currency only)</li>
          <li>A session token (see section 5)</li>
        </ul>
        <p>We do not collect your email address, password, or any data beyond what is listed above.</p>
      </Section>

      <Section n="3" title="Data We Collect — Card Subjects">
        <p>For Bluesky profiles that appear as cards in the game, we store:</p>
        <ul>
          <li>The AT Protocol DID and handle, used as a game identifier</li>
          <li>The card's current in-game value and transaction history</li>
        </ul>
        <p>We do not store profile pictures, bios, follower counts, or post content. This information is fetched in real time from the public AT Protocol network each time a card is displayed, and is never persisted on our servers.</p>
      </Section>

      <Section n="4" title="Legal Basis (GDPR)">
        <ul>
          <li><strong>Players:</strong> Processing is based on contractual necessity (Art. 6.1.b GDPR) — your DID and game data are required to operate your account.</li>
          <li><strong>Card subjects:</strong> Processing is based on legitimate interest (Art. 6.1.f GDPR) — limited to using a public identifier as a game token. No personal data beyond the DID/handle is stored. You may opt out at any time (see section 7).</li>
        </ul>
      </Section>

      <Section n="5" title="Cookies and Local Storage">
        <p>BlueSTEAL uses one cookie:</p>
        <ul>
          <li><strong>bs_session</strong> — a JWT session token. It is httpOnly, secure, sameSite: lax, and expires after 7 days. It is strictly necessary for authentication and is exempt from consent requirements under the ePrivacy Directive.</li>
        </ul>
        <p>BlueSTEAL also uses browser storage for the following strictly functional purposes:</p>
        <ul>
          <li><strong>localStorage</strong> — stores <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00e5ff' }}>activity_last_seen</code>, a timestamp used to display the activity notification badge. No personal data.</li>
          <li><strong>IndexedDB / sessionStorage</strong> — used by the AT Protocol OAuth client library to manage PKCE and DPoP keys client-side. This is handled entirely by the <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00e5ff' }}>@atproto/oauth-client-browser</code> library and contains no personal data beyond what is required for the OAuth flow.</li>
        </ul>
        <p>We use no analytics, advertising cookies, or third-party tracking scripts of any kind.</p>
      </Section>

      <Section n="6" title="Data Retention">
        <ul>
          <li>Player account data is retained for as long as the account is active. You may request deletion at any time (see section 8).</li>
          <li>Card subject data (DID + game value) is retained as long as the profile is part of the game. It is deleted within 5 minutes of opt-out detection.</li>
          <li>Transaction history is retained for the lifetime of the game for integrity purposes.</li>
        </ul>
      </Section>

      <Section n="7" title="Opting Out — Card Subjects">
        <p>If you do not wish to appear in BlueSTEAL, block the <code style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#00e5ff' }}>bluesteal.app</code> account on Bluesky. Within 5 minutes of detection:</p>
        <ul>
          <li>Your card is removed from the game</li>
          <li>Your DID is added to our blocklist to prevent re-entry</li>
          <li>All associated game data is permanently deleted</li>
        </ul>
      </Section>

      <Section n="8" title="Your Rights (GDPR)">
        <p>If you are located in the European Economic Area, you have the following rights:</p>
        <ul>
          <li><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li><strong>Rectification</strong> — request correction of inaccurate data</li>
          <li><strong>Erasure</strong> — request deletion of your data</li>
          <li><strong>Restriction</strong> — request that we limit how we use your data</li>
          <li><strong>Objection</strong> — object to processing based on legitimate interest</li>
          <li><strong>Portability</strong> — request your data in a machine-readable format</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:hello@bluesteal.app" style={{ color: '#00e5ff', textDecoration: 'none' }}>hello@bluesteal.app</a>. We will respond within 30 days.</p>
        <p>You also have the right to lodge a complaint with your national data protection authority. In France: <a href="https://www.cnil.fr" target="_blank" rel="noopener" style={{ color: '#00e5ff', textDecoration: 'none' }}>CNIL</a>.</p>
      </Section>

      <Section n="9" title="Data Sharing and Sub-processors">
        <p>We do not sell, rent, or share your data with third parties for commercial purposes. Data may be disclosed if required by law or to comply with a valid legal request.</p>
        <p>To operate the service, we use the following data processors, all hosted within the European Union:</p>
        <ul>
          <li><strong>Vercel</strong> (Paris, France) — serverless function execution and content delivery</li>
          <li><strong>Railway</strong> (Amsterdam, Netherlands) — background processing and cron jobs</li>
          <li><strong>Upstash</strong> (Frankfurt, Germany) — Redis database storage</li>
        </ul>
      </Section>

      <Section n="10" title="Security">
        <p>Session tokens are httpOnly and transmitted over HTTPS only. Our servers are hosted within the European Union. We apply standard security practices to protect stored data.</p>
      </Section>

      <Section n="11" title="Changes to This Policy">
        <p>We may update this policy from time to time. The effective date at the top of this page will reflect the latest version. Continued use of BlueSTEAL after a change constitutes acceptance of the updated policy.</p>
      </Section>

      <Section n="12" title="Contact">
        <p>For any privacy-related questions or requests: <a href="mailto:hello@bluesteal.app" style={{ color: '#00e5ff', textDecoration: 'none' }}>hello@bluesteal.app</a></p>
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
