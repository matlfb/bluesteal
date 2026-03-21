export type Lang = 'en' | 'fr'

export const translations = {
  en: {
    // Nav
    nav_market: 'MARKET', nav_activity: 'ACTIVITY', nav_leaderboard: 'LEADERBOARD',
    nav_search: 'SEARCH', nav_search_placeholder: 'Search a profile…',
    nav_searching: 'Searching…', nav_no_results: 'No results for "{query}"',
    nav_my_account: 'My account →', nav_sign_out: 'Sign out', nav_sign_in: 'SIGN IN →',
    nav_followers_short: '{n} followers', nav_price_label: 'PRICE',
    // Auth
    sign_in_title: 'Sign in',
    sign_in_subtitle: 'Enter your Bluesky handle to continue.\nYou will be redirected to your server to authorize access.',
    sign_in_handle_label: 'YOUR BLUESKY HANDLE', sign_in_placeholder: 'your-handle.bsky.social',
    sign_in_submit: 'CONTINUE →', sign_in_loading: 'REDIRECTING…',
    sign_in_disclaimer: "BlueSTEAL never has access to your password.\nAuthorization goes through your Bluesky PDS via OAuth.",
    sign_in_error: 'Handle not found. Check your Bluesky handle.',
    sign_in_bluesky_btn: 'Bluesky Sign In →',
    // Profile card
    pc_followers: '{n} followers',
    // Steal modal
    modal_cost: 'COST', modal_share: 'Share on Bluesky',
    modal_cancel: 'CANCEL', modal_confirm: 'CONFIRM →',
    modal_confirming: 'IN PROGRESS…', modal_owned: 'OWNED ✓', modal_your_card: 'YOUR CARD',
    modal_currently_at: 'currently owned by @{handle}',
    // History tab
    history_bought: 'BOUGHT', history_lost: 'LOST',
    history_stolen_from: 'stolen from', history_stolen_by: 'stolen by',
    history_first: 'first acquisition',
    history_empty_title: 'No transactions',
    history_empty_sub: 'History will appear here after each card purchase or sale.',
    // Account page
    account_loading: 'LOADING…', account_not_connected_title: 'Not signed in',
    account_not_connected_sub: 'Connect your Bluesky account to see your profile, collection and stats.',
    account_sign_in_btn: 'Bluesky Sign In →',
    account_tab_collection: 'COLLECTION', account_tab_history: 'HISTORY', account_tab_bsky: 'BSKY ACTIVITY',
    account_stat_followers: 'FOLLOWERS', account_stat_following: 'FOLLOWING', account_stat_posts: 'POSTS',
    account_no_cards: 'No cards. ', account_explore_link: 'Browse the market →',
    account_explore_label: 'EXPLORE', account_no_posts: 'No recent posts.',
    account_view_on_bsky: 'View on Bluesky',
    // Profil page
    profil_loading: 'LOADING…', profil_not_found: 'Profile not found.',
    profil_tab_collection: 'COLLECTION', profil_tab_history: 'HISTORY', profil_tab_bsky: 'BSKY ACTIVITY',
    profil_stat_followers: 'FOLLOWERS', profil_stat_following: 'FOLLOWING', profil_stat_posts: 'POSTS',
    profil_steal_owner: 'STEAL FROM @{owner} — {price} J',
    profil_steal_noowner: 'BUY — {price} J',
    profil_owned: 'OWNED', profil_stealing: 'IN PROGRESS…', profil_your_card: 'YOUR CARD',
    profil_view_on_bsky: 'View on Bluesky',
    profil_no_cards: 'No cards yet.',
    profil_no_cards_sub: '@{handle} doesn\'t own any cards yet.',
    profil_no_posts: 'No recent posts.',
    // Jetons page
    jetons_title_pre: 'My', jetons_title_em: 'Tokens',
    jetons_balance: 'AVAILABLE BALANCE', jetons_passive: 'PASSIVE INCOME',
    jetons_based: 'Based on {count} card{s}\nowned',
    jetons_based_loading: 'Loading…', jetons_per_hour: '/H',
    jetons_recharge: 'Top up', jetons_buy: 'BUY →', jetons_bonus: '{bonus} included',
    // Activity page
    activity_title: 'Activity', activity_subtitle: 'All transactions in real time',
    activity_tab_everyone: 'EVERYONE', activity_tab_friends: 'FRIENDS', activity_tab_you: 'YOU',
    activity_login_title: 'Sign in required',
    activity_login_sub: 'Sign in to see the activity of your Bluesky follows.',
    activity_login_btn: 'SIGN IN →',
    activity_empty_friends_title: 'No activity',
    activity_empty_global_title: 'No transactions',
    activity_empty_friends_sub: "Your Bluesky follows haven't bought any cards yet.",
    activity_empty_global_sub: 'The first transactions will appear here.',
    activity_bought: 'bought', activity_bought_by: 'was bought by', activity_from: 'from',
    activity_you_bought: 'You bought', activity_you_sold: '{buyer} bought your card',
    activity_empty_you_title: 'No activity yet',
    activity_empty_you_sub: 'Your purchases and sold cards will appear here.',
    activity_notif_title: 'Card stolen!',
    activity_notif_body: '@{buyer} just bought @{subject} from your collection for {price} J',
    // Homepage
    home_label: 'BLUESTEAL',
    home_h1a: "Collect your friends'", home_h1b: 'accounts.',
    home_sub: "Every Bluesky profile becomes a collectible card. Buy, invest, and grow their value.\nThe more a card is in demand, the more it's worth.",
    home_sign_in: 'Sign in with Bluesky →', home_browse: 'Browse cards',
    home_hot: 'Hot', home_recent: 'Recent purchases', home_friends: 'Your friends',
    home_friends_login_title: 'Sign in to see your friends',
    home_friends_login_sub: 'Your Bluesky follows will appear here as cards.',
    home_friends_login_btn: 'Sign in →',
    home_tab_following: 'Following', home_no_following: 'No Bluesky follows found.',
    home_recently_collected: 'Recently collected', home_explore: 'Explore',
    // Leaderboard
    lb_title: 'Leaderboard', lb_tab_global: 'GLOBAL', lb_tab_friends: 'FRIENDS',
    lb_rank: 'RANK', lb_player: 'PLAYER', lb_cards: 'CARDS', lb_portfolio: 'PORTFOLIO', lb_steals: 'STEALS',
    // Dates
    date_just_now: 'just now', date_m_ago: '{m}m ago', date_h_ago: '{h}h ago',
    date_yesterday: 'yesterday', date_d_ago: '{d}d ago',
  },
  fr: {
    nav_market: 'MARCHÉ', nav_activity: 'ACTIVITÉ', nav_leaderboard: 'CLASSEMENT',
    nav_search: 'RECHERCHER', nav_search_placeholder: 'Chercher un profil…',
    nav_searching: 'Recherche…', nav_no_results: 'Aucun résultat pour « {query} »',
    nav_my_account: 'Mon compte →', nav_sign_out: 'Déconnexion', nav_sign_in: 'CONNEXION →',
    nav_followers_short: '{n} abonnés', nav_price_label: 'PRIX',
    sign_in_title: 'Connexion',
    sign_in_subtitle: "Entre ton identifiant Bluesky pour continuer.\nTu seras redirigé vers ton serveur pour autoriser l'accès.",
    sign_in_handle_label: 'TON HANDLE BLUESKY', sign_in_placeholder: 'ton-handle.bsky.social',
    sign_in_submit: 'CONTINUER →', sign_in_loading: 'REDIRECTION…',
    sign_in_disclaimer: "BlueSTEAL n'a jamais accès à ton mot de passe.\nL'autorisation passe par ton PDS Bluesky via OAuth.",
    sign_in_error: 'Handle introuvable. Vérifie ton identifiant Bluesky.',
    sign_in_bluesky_btn: 'Connexion Bluesky →',
    pc_followers: '{n} abonnés',
    modal_cost: 'COÛT', modal_share: 'Partager sur Bluesky',
    modal_cancel: 'ANNULER', modal_confirm: 'CONFIRMER →',
    modal_confirming: 'EN COURS…', modal_owned: 'POSSÉDÉE ✓', modal_your_card: 'VOTRE CARTE',
    modal_currently_at: 'actuellement chez @{handle}',
    history_bought: 'ACHETÉ', history_lost: 'PERDU',
    history_stolen_from: 'volé à', history_stolen_by: 'volé par',
    history_first: 'première acquisition',
    history_empty_title: 'Aucune transaction',
    history_empty_sub: "L'historique apparaîtra ici après chaque achat ou vente de carte.",
    account_loading: 'CHARGEMENT…', account_not_connected_title: 'Pas encore connecté',
    account_not_connected_sub: 'Connecte ton compte Bluesky pour voir ton profil, ta collection et tes stats.',
    account_sign_in_btn: 'Connexion Bluesky →',
    account_tab_collection: 'COLLECTION', account_tab_history: 'HISTORIQUE', account_tab_bsky: 'ACTIVITÉ BSKY',
    account_stat_followers: 'ABONNÉS', account_stat_following: 'ABONNEMENTS', account_stat_posts: 'POSTS',
    account_no_cards: 'Aucune carte. ', account_explore_link: 'Explorer le marché →',
    account_explore_label: 'EXPLORER', account_no_posts: 'Aucun post récent.',
    account_view_on_bsky: 'Voir sur Bluesky',
    profil_loading: 'CHARGEMENT…', profil_not_found: 'Profil introuvable.',
    profil_tab_collection: 'COLLECTION', profil_tab_history: 'HISTORIQUE', profil_tab_bsky: 'ACTIVITÉ BSKY',
    profil_stat_followers: 'ABONNÉS', profil_stat_following: 'ABONNEMENTS', profil_stat_posts: 'POSTS',
    profil_steal_owner: 'VOLER À @{owner} — {price} J',
    profil_steal_noowner: 'BUY — {price} J',
    profil_owned: 'POSSÉDÉE', profil_stealing: 'EN COURS…', profil_your_card: 'VOTRE CARTE',
    profil_view_on_bsky: 'Voir sur Bluesky',
    profil_no_cards: 'Aucune carte.',
    profil_no_cards_sub: "@{handle} ne possède pas encore de cartes.",
    profil_no_posts: 'Aucun post récent.',
    jetons_title_pre: 'Mes', jetons_title_em: 'Jetons',
    jetons_balance: 'SOLDE DISPONIBLE', jetons_passive: 'REVENU PASSIF',
    jetons_based: 'Basé sur {count} carte{s}\npossédée{s}',
    jetons_based_loading: 'Chargement…', jetons_per_hour: '/H',
    jetons_recharge: 'Recharger', jetons_buy: 'ACHETER →', jetons_bonus: '{bonus} inclus',
    activity_title: 'Activité', activity_subtitle: 'Toutes les transactions en temps réel',
    activity_tab_everyone: 'TOUT LE MONDE', activity_tab_friends: 'AMIS', activity_tab_you: 'VOUS',
    activity_login_title: 'Connexion requise',
    activity_login_sub: "Connecte-toi pour voir l'activité de tes abonnements Bluesky.",
    activity_login_btn: 'CONNEXION →',
    activity_empty_friends_title: 'Aucune activité',
    activity_empty_global_title: 'Aucune transaction',
    activity_empty_friends_sub: "Tes abonnements Bluesky n'ont pas encore acheté de cartes.",
    activity_empty_global_sub: 'Les premières transactions apparaîtront ici.',
    activity_bought: 'a acheté', activity_bought_by: 'a été acheté par', activity_from: 'à',
    activity_you_bought: 'Tu as acheté', activity_you_sold: '{buyer} a acheté ta carte',
    activity_empty_you_title: 'Aucune activité',
    activity_empty_you_sub: 'Tes achats et cartes vendues apparaîtront ici.',
    activity_notif_title: 'Carte volée !',
    activity_notif_body: '@{buyer} vient d\'acheter @{subject} de ta collection pour {price} J',
    home_label: 'BLUESTEAL',
    home_h1a: 'Collectionne les comptes', home_h1b: 'de tes amis.',
    home_sub: "Chaque profil Bluesky devient une carte à collectionner. Achète, investis, et augmente leur valeur.\nPlus une carte est demandée, plus elle vaut cher.",
    home_sign_in: 'Connexion avec Bluesky →', home_browse: 'Voir les cartes',
    home_hot: 'Hot', home_recent: 'Achats récents', home_friends: 'Vos amis',
    home_friends_login_title: 'Connecte-toi pour voir tes amis',
    home_friends_login_sub: 'Tes abonnements Bluesky apparaîtront ici sous forme de cartes.',
    home_friends_login_btn: 'Connexion →',
    home_tab_following: 'Abonnements', home_no_following: 'Aucun abonnement trouvé sur Bluesky.',
    home_recently_collected: 'Collectés récemment', home_explore: 'Explorer',
    lb_title: 'Classement', lb_tab_global: 'GLOBAL', lb_tab_friends: 'AMIS',
    lb_rank: 'RANG', lb_player: 'JOUEUR', lb_cards: 'CARTES', lb_portfolio: 'PORTFOLIO', lb_steals: 'STEALS',
    date_just_now: "à l'instant", date_m_ago: 'il y a {m} min', date_h_ago: 'il y a {h}h',
    date_yesterday: 'hier', date_d_ago: 'il y a {d}j',
  },
} as const

export type TKey = keyof typeof translations.en

export function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

export function formatDate(iso: string, t: (k: TKey, v?: Record<string, string|number>) => string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return t('date_just_now')
  if (m < 60) return t('date_m_ago', { m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('date_h_ago', { h })
  if (h < 48) return t('date_yesterday')
  const d = new Date(iso)
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function formatRelative(iso: string, t: (k: TKey, v?: Record<string, string|number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return t('date_m_ago', { m })
  const h = Math.floor(m / 60)
  if (h < 24) return t('date_h_ago', { h })
  return t('date_d_ago', { d: Math.floor(h / 24) })
}
