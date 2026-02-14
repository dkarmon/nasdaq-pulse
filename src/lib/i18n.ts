// ABOUTME: Internationalization constants and dictionaries for English and Hebrew.
// ABOUTME: Provides type-safe translations and RTL detection for the UI.

export const locales = ["en", "he"] as const;

export type Locale = (typeof locales)[number];

export type LandingFeature = {
  title: string;
  body: string;
  tag?: string;
};

export type Dictionary = {
  nav: {
    signIn: string;
    demo: string;
    language: string;
    localeName: string;
  };
  landing: {
    title: string;
    subtitle: string;
    heroCta: string;
    heroSecondary: string;
    highlights: LandingFeature[];
    featureTitle: string;
    featureSubtitle: string;
    features: LandingFeature[];
    demoTitle: string;
    demoSubtitle: string;
    demoList: LandingFeature[];
    // New landing page
    liveMarketData: string;
    heroTitle1: string;
    heroTitle2: string;
    heroSubtitle: string;
    startTracking: string;
    learnMore: string;
    stocksTracked: string;
    refreshRate: string;
    alwaysFree: string;
    everythingYouNeed: string;
    nothingYouDont: string;
    featuresSubtitle: string;
    growthRankings: string;
    growthRankingsDesc: string;
    realTimeUpdates: string;
    realTimeUpdatesDesc: string;
    zeroNoise: string;
    zeroNoiseDesc: string;
    ctaTitle: string;
    ctaSubtitle: string;
    getStartedFree: string;
  };
  app: {
    welcome: string;
    freshnessLive: string;
    freshnessStale: string;
    watchlist: string;
    detail: string;
    news: string;
    logout: string;
    comparison: string;
    addTicker: string;
    fallbackData: string;
  };
  screener: {
    sortBy: string;
    show: string;
    score: string;
    intraday: string;
    direction: string;
    search: string;
    stock: string;
    price: string;
    cap: string;
    growth: string;
    view: string;
    noStocks: string;
    backToList: string;
    latestNews: string;
    noNews: string;
    viewAllNews: string;
    usingCachedData: string;
    growth1d: string;
    growth5d: string;
    growth1m: string;
    growth6m: string;
    growth12m: string;
    pe: string;
    week52Range: string;
    live: string;
    loading: string;
    error: string;
    hide: string;
    recommended: string;
    recommendedOnly: string;
    recommendedMode: string;
    exchange: string;
    nasdaq: string;
    tlv: string;
    print: string;
    printedAt: string;
    printDate: string;
    printTime: string;
    ordering: string;
    query: string;
    formula: string;
    printOn: string;
    printOff: string;
    printNone: string;
    sector: string;
    industry: string;
    marketCap: string;
    companyOverview: string;
    website: string;
  };
  settings: {
    title: string;
    hiddenStocks: string;
    unhide: string;
    noHiddenStocks: string;
    admin: string;
    invitations: string;
    inviteEmail: string;
    invite: string;
    noInvitations: string;
    pending: string;
    used: string;
    expired: string;
    delete: string;
    inviteSent: string;
    users: string;
    noUsers: string;
    role: string;
    user: string;
    adminRole: string;
    recommendations: string;
    recommendationsActive: string;
    recommendationsActiveNasdaq: string;
    recommendationsActiveTlv: string;
    recommendationsSubtitle: string;
    recommendationsName: string;
    recommendationsDescription: string;
    recommendationsExpression: string;
    status: string;
    draft: string;
    published: string;
    archived: string;
    validate: string;
    validationPassed: string;
    errors: string;
    warnings: string;
    preview: string;
    previewEmpty: string;
    add: string;
    update: string;
    duplicate: string;
    edit: string;
    archive: string;
    activeSaved: string;
    saved: string;
    fetchError: string;
    save: string;
    // Tab navigation
    tabStocks: string;
    tabUsers: string;
    tabFormulas: string;
    // Modal actions
    cancel: string;
    saveFormula: string;
    editFormula: string;
    newFormula: string;
    deleteFormula: string;
    confirmDelete: string;
    noFormulas: string;
    // Omit rules
    omitRules: string;
    omitRulesAdminDefaults: string;
    omitRulesAdminHint: string;
    omitRulesSyncHint: string;
    syncWithAdmin: string;
    enabled: string;
    addRule: string;
    price: string;
    marketCap: string;
    min: string;
    max: string;
    noRules: string;
  };
  auth: {
    signinTitle: string;
    signinSubtitle: string;
    googleButton: string;
    or: string;
    emailPlaceholder: string;
    emailButton: string;
    verifyTitle: string;
    verifyBody: string;
    deniedTitle: string;
    deniedBody: string;
    back: string;
    checkEmail: string;
  };
  aiAnalysis: {
    title: string;
    generate: string;
    refresh: string;
    updated: string;
    notEnoughNews: string;
    generating: string;
    error: string;
    buy: string;
    hold: string;
    sell: string;
  };
};

export const defaultLocale: Locale = "en";

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      signIn: "Enter app",
      demo: "View limited demo",
      language: "EN",
      localeName: "English",
    },
    landing: {
      title: "Nasdaq Pulse",
      subtitle:
        "Live watchlists, bilingual UI, and latency-conscious charts tuned for desktop and mobile.",
      heroCta: "Sign in with Google",
      heroSecondary: "Browse the demo",
      highlights: [
        {
          title: "Bilingual & RTL ready",
          body: "English + Hebrew with mirrored layout, right-aligned numerics, and locale-aware time.",
        },
        {
          title: "Edge proxy with cache",
          body: "Quotes refresh every ~60s; series cached hours to respect free tiers.",
          tag: "Performance",
        },
        {
          title: "Auth with allowlist",
          body: "Google sign-in gated by approved emails; graceful denial state.",
          tag: "Secure",
        },
      ],
      featureTitle: "Designed for the pulse of the market",
      featureSubtitle:
        "Intentional layouts, fast interactions, and cues for freshness keep users oriented.",
      features: [
        {
          title: "Adaptive surfaces",
          body: "Two-panel desktop, tabbed mobile, sticky controls, and low-latency chart transitions.",
          tag: "UX",
        },
        {
          title: "Data clarity",
          body: "Stale/live badges, percent deltas, and fundamentals grouped into glanceable cards.",
          tag: "Data",
        },
        {
          title: "News in context",
          body: "Sentiment chips, source/time-ago labels, and quick links back to price action.",
          tag: "Context",
        },
      ],
      demoTitle: "Demo snapshot",
      demoSubtitle: "Static sample data shown without an account.",
      demoList: [
        {
          title: "AAPL · 0.82% ▲",
          body: "Fresh within 45s · $2.95T market cap",
        },
        {
          title: "MSFT · 0.44% ▲",
          body: "Fresh within 50s · $3.09T market cap",
        },
        {
          title: "NVDA · -1.12% ▼",
          body: "Stale · refresh to retrieve",
        },
      ],
      // New landing page
      liveMarketData: "Live Market Data",
      heroTitle1: "Spot the winners",
      heroTitle2: "before the crowd",
      heroSubtitle: "Track NASDAQ's fastest-growing stocks in real-time. Sort by 1-month, 6-month, or yearly growth. Simple, fast, no fluff.",
      startTracking: "Start Tracking",
      learnMore: "Learn More",
      stocksTracked: "Stocks tracked",
      refreshRate: "Refresh rate",
      alwaysFree: "Always",
      everythingYouNeed: "Everything you need.",
      nothingYouDont: "Nothing you don't.",
      featuresSubtitle: "No complicated charts. No paid tiers. Just the data that matters.",
      growthRankings: "Growth Rankings",
      growthRankingsDesc: "See which stocks are actually growing. Sort by 1-month, 6-month, or 12-month performance instantly.",
      realTimeUpdates: "Real-Time Updates",
      realTimeUpdatesDesc: "Fresh data every 60 seconds. Know what's moving right now, not what moved yesterday.",
      zeroNoise: "Zero Noise",
      zeroNoiseDesc: "No ads. No premium upsells. No \"analysts picks\". Just clean data and fast loading.",
      ctaTitle: "Ready to find your next winner?",
      ctaSubtitle: "Join now. It takes 10 seconds with Google.",
      getStartedFree: "Get Started Free",
    },
    app: {
      welcome: "Welcome back to Nasdaq Pulse",
      freshnessLive: "Live",
      freshnessStale: "Stale",
      watchlist: "Watchlist",
      detail: "Detail",
      news: "News",
      logout: "Sign out",
      comparison: "Compare",
      addTicker: "Add ticker",
      fallbackData: "Showing cached demo data. Connect real APIs to go live.",
    },
    screener: {
      sortBy: "Sort by",
      show: "Show",
      score: "Score",
      intraday: "Intraday",
      direction: "Direction",
      search: "Search...",
      stock: "Stock",
      price: "Price",
      cap: "Cap",
      growth: "Growth",
      view: "View",
      noStocks: "No stocks match your filters",
      backToList: "Back to List",
      latestNews: "Latest News",
      noNews: "No recent news",
      viewAllNews: "View all news",
      usingCachedData: "Using cached data",
      growth1d: "1D",
      growth5d: "5D",
      growth1m: "1M",
      growth6m: "6M",
      growth12m: "12M",
      pe: "P/E",
      week52Range: "52W Range",
      live: "Live",
      loading: "Loading",
      error: "Error",
      hide: "Hide",
      recommended: "Recommended",
      recommendedOnly: "Recommended only",
      recommendedMode: "Recommended mode",
      exchange: "Exchange",
      nasdaq: "NASDAQ",
      tlv: "Tel Aviv",
      print: "Print",
      printedAt: "Printed at",
      printDate: "Date",
      printTime: "Time",
      ordering: "Ordering",
      query: "Query",
      formula: "Formula",
      printOn: "On",
      printOff: "Off",
      printNone: "None",
      sector: "Sector",
      industry: "Industry",
      marketCap: "Market Cap",
      companyOverview: "Company Overview",
      website: "Website",
    },
    settings: {
      title: "Settings",
      hiddenStocks: "Hidden Stocks",
      unhide: "Unhide",
      noHiddenStocks: "No hidden stocks",
      admin: "Admin",
      invitations: "Invitations",
      inviteEmail: "Email to invite",
      invite: "Invite",
      noInvitations: "No pending invitations",
      pending: "Pending",
      used: "Used",
      expired: "Expired",
      delete: "Delete",
      inviteSent: "Invitation sent!",
      users: "Users",
      noUsers: "No users yet",
      role: "Role",
      user: "User",
      adminRole: "Admin",
      recommendations: "Recommendation formulas",
      recommendationsActive: "Active formula",
      recommendationsActiveNasdaq: "Active NASDAQ formula",
      recommendationsActiveTlv: "Active TLV formula",
      recommendationsSubtitle: "Select, validate, and publish the expression that powers recommendations.",
      recommendationsName: "Name",
      recommendationsDescription: "Description",
      recommendationsExpression: "Expression",
      status: "Status",
      draft: "Draft",
      published: "Published",
      archived: "Archived",
      validate: "Validate",
      validationPassed: "Expression looks valid",
      errors: "Errors",
      warnings: "Warnings",
      preview: "Preview",
      previewEmpty: "Nothing yet",
      add: "New",
      update: "Update",
      duplicate: "Duplicate",
      edit: "Edit",
      archive: "Archive",
      activeSaved: "Active formula updated",
      saved: "Saved",
      fetchError: "Could not load formulas",
      save: "Save",
      tabStocks: "Stocks",
      tabUsers: "Users",
      tabFormulas: "Formulas",
      cancel: "Cancel",
      saveFormula: "Save Formula",
      editFormula: "Edit Formula",
      newFormula: "New Formula",
      deleteFormula: "Delete",
      confirmDelete: "Are you sure you want to delete this formula?",
      noFormulas: "No formulas yet",
      omitRules: "Omit Rules",
      omitRulesAdminDefaults: "Omit Rules (Admin Defaults)",
      omitRulesAdminHint: "These defaults apply to all synced users.",
      omitRulesSyncHint: "Following admin rules. Toggle off to customize.",
      syncWithAdmin: "Sync with admin",
      enabled: "Enabled",
      addRule: "Add Rule",
      price: "Price",
      marketCap: "Market Cap",
      min: "Min",
      max: "Max",
      noRules: "No rules configured",
    },
    auth: {
      signinTitle: "Welcome to Nasdaq Pulse",
      signinSubtitle: "Sign in to access the full stock screener with real-time data",
      googleButton: "Continue with Google",
      or: "or",
      emailPlaceholder: "Enter your email",
      emailButton: "Continue with email",
      verifyTitle: "Check your email",
      verifyBody: "We sent a sign-in link to your email address. Click the link to continue.",
      deniedTitle: "Access not granted",
      deniedBody:
        "Your Google account is not on the approved list. Contact the admin or try a different email.",
      back: "Back to landing",
      checkEmail: "Check your email for the login link!",
    },
    aiAnalysis: {
      title: "Analysis",
      generate: "Generate Analysis",
      refresh: "Refresh",
      updated: "Updated",
      notEnoughNews: "Not enough recent news to generate analysis",
      generating: "Generating...",
      error: "Failed to generate analysis",
      buy: "Buy",
      hold: "Hold",
      sell: "Sell",
    },
  },
  he: {
    nav: {
      signIn: "כניסה לאפליקציה",
      demo: "צפייה בדמו",
      language: "HE",
      localeName: "עברית",
    },
    landing: {
      title: "Nasdaq Pulse",
      subtitle: "ממשק דו-לשוני, מותאם RTL, עם נתונים חיים למובייל ולדסקטופ.",
      heroCta: "התחברות עם Google",
      heroSecondary: "צפייה בדמו",
      highlights: [
        {
          title: "עברית ואנגלית",
          body: "ממשק מלא בעברית ו-RTL עם יישור מספרים לימין ותאריכים לפי שפה.",
        },
        {
          title: "פרוקסי וקאשינג חכם",
          body: "ציטוטים מתעדכנים כל ~60 שניות; סדרות היסטוריות נשמרות שעות.",
          tag: "ביצועים",
        },
        {
          title: "גישה מאובטחת",
          body: "התחברות בגוגל עם רשימת מיילים מורשית ומסך סירוב ברור.",
          tag: "אבטחה",
        },
      ],
      featureTitle: "מעוצב לדופק של השוק",
      featureSubtitle:
        "פריסות מכוונות, אינטראקציות מהירות, וסימני רעננות כדי לשמור על התמצאות.",
      features: [
        {
          title: "פריסה מגיבה",
          body: "שתי עמודות בדסקטופ, טאבים במובייל, כפתורים דביקים ומעברים זריזים.",
          tag: "חוויית משתמש",
        },
        {
          title: "בהירות נתונים",
          body: "תגי חדש/מיושן, שינויי אחוזים וקריאות יסוד בכרטיסים תמציתיים.",
          tag: "נתונים",
        },
        {
          title: "חדשות בהקשר",
          body: "תגי סנטימנט, מקור וזמן, וקישור מהיר חזרה לגרף המחיר.",
          tag: "הקשר",
        },
      ],
      demoTitle: "דמו לדוגמה",
      demoSubtitle: "נתונים סטטיים זמינים גם ללא חשבון.",
      demoList: [
        {
          title: "AAPL · ‎0.82% ▲",
          body: "עדכני בתוך 45 שניות · שווי שוק ‎2.95T$",
        },
        {
          title: "MSFT · ‎0.44% ▲",
          body: "עדכני בתוך 50 שניות · שווי שוק ‎3.09T$",
        },
        {
          title: "NVDA · ‎1.12-% ▼",
          body: "מיושן · רענון ינסה למשוך חדש",
        },
      ],
      // New landing page
      liveMarketData: "נתוני שוק בזמן אמת",
      heroTitle1: "מצא את המנצחות",
      heroTitle2: "לפני כולם",
      heroSubtitle: "עקוב אחר המניות עם הצמיחה המהירה ביותר בנאסד״ק. מיין לפי צמיחה חודשית, חצי שנתית או שנתית. פשוט, מהיר, בלי מילים מיותרות.",
      startTracking: "התחל לעקוב",
      learnMore: "למד עוד",
      stocksTracked: "מניות במעקב",
      refreshRate: "קצב רענון",
      alwaysFree: "תמיד",
      everythingYouNeed: "כל מה שצריך.",
      nothingYouDont: "בלי מה שלא.",
      featuresSubtitle: "בלי גרפים מסובכים. בלי מסלולים בתשלום. רק הנתונים שחשובים.",
      growthRankings: "דירוג צמיחה",
      growthRankingsDesc: "ראה אילו מניות באמת צומחות. מיין לפי ביצועים של חודש, 6 חודשים או שנה.",
      realTimeUpdates: "עדכונים בזמן אמת",
      realTimeUpdatesDesc: "נתונים רעננים כל 60 שניות. דע מה זז עכשיו, לא מה זז אתמול.",
      zeroNoise: "אפס רעש",
      zeroNoiseDesc: "בלי פרסומות. בלי שדרוגים בתשלום. בלי \"המלצות אנליסטים\". רק נתונים נקיים וטעינה מהירה.",
      ctaTitle: "מוכן למצוא את המנצחת הבאה?",
      ctaSubtitle: "הצטרף עכשיו. לוקח 10 שניות עם Google.",
      getStartedFree: "התחל בחינם",
    },
    app: {
      welcome: "ברוכים הבאים ל-Nasdaq Pulse",
      freshnessLive: "חי",
      freshnessStale: "מיושן",
      watchlist: "רשימת מעקב",
      detail: "פרטים",
      news: "חדשות",
      logout: "התנתקות",
      comparison: "השוואה",
      addTicker: "הוסף סמל",
      fallbackData: "מציג נתוני דמו במטמון. חברו API כדי לעבור לנתונים חיים.",
    },
    screener: {
      sortBy: "מיון לפי",
      show: "הצג",
      score: "ציון",
      intraday: "יומי",
      direction: "כיוון",
      search: "...חיפוש",
      stock: "מניה",
      price: "מחיר",
      cap: "שווי",
      growth: "צמיחה",
      view: "צפה",
      noStocks: "אין מניות התואמות את הסינון",
      backToList: "חזרה לרשימה",
      latestNews: "חדשות אחרונות",
      noNews: "אין חדשות אחרונות",
      viewAllNews: "כל החדשות",
      usingCachedData: "מציג נתונים מהמטמון",
      growth1d: "1D",
      growth5d: "5D",
      growth1m: "1M",
      growth6m: "6M",
      growth12m: "12M",
      pe: "P/E",
      week52Range: "טווח 52 שבועות",
      live: "חי",
      loading: "טוען",
      error: "שגיאה",
      hide: "הסתר",
      recommended: "מומלץ",
      recommendedOnly: "מומלצים בלבד",
      recommendedMode: "מצב מומלצים",
      exchange: "בורסה",
      nasdaq: "נאסד״ק",
      tlv: "תל אביב",
      print: "הדפסה",
      printedAt: "הודפס בתאריך",
      printDate: "תאריך",
      printTime: "שעה",
      ordering: "סידור",
      query: "חיפוש",
      formula: "נוסחה",
      printOn: "פעיל",
      printOff: "כבוי",
      printNone: "ללא",
      sector: "סקטור",
      industry: "תעשייה",
      marketCap: "שווי שוק",
      companyOverview: "אודות החברה",
      website: "אתר אינטרנט",
    },
    settings: {
      title: "הגדרות",
      hiddenStocks: "מניות מוסתרות",
      unhide: "בטל הסתרה",
      noHiddenStocks: "אין מניות מוסתרות",
      admin: "ניהול",
      invitations: "הזמנות",
      inviteEmail: "מייל להזמנה",
      invite: "הזמן",
      noInvitations: "אין הזמנות ממתינות",
      pending: "ממתין",
      used: "נוצל",
      expired: "פג תוקף",
      delete: "מחק",
      inviteSent: "ההזמנה נשלחה!",
      users: "משתמשים",
      noUsers: "אין משתמשים עדיין",
      role: "תפקיד",
      user: "משתמש",
      adminRole: "מנהל",
      recommendations: "נוסחאות המלצה",
      recommendationsActive: "נוסחה פעילה",
      recommendationsActiveNasdaq: "נוסחה פעילה לנאסד\"ק",
      recommendationsActiveTlv: "נוסחה פעילה ל-TLV",
      recommendationsSubtitle: "בחרו, ערכו ופרסמו את נוסחת הדירוג לסינון.",
      recommendationsName: "שם",
      recommendationsDescription: "תיאור",
      recommendationsExpression: "ביטוי",
      status: "סטטוס",
      draft: "טיוטה",
      published: "פורסם",
      archived: "בארכיון",
      validate: "אימות",
      validationPassed: "הביטוי תקין",
      errors: "שגיאות",
      warnings: "אזהרות",
      preview: "תצוגה מקדימה",
      previewEmpty: "אין נתונים",
      add: "חדש",
      update: "עדכון",
      duplicate: "שכפל",
      edit: "ערוך",
      archive: "העבר לארכיון",
      activeSaved: "עודכנה נוסחה פעילה",
      saved: "נשמר",
      fetchError: "לא ניתן לטעון נוסחאות",
      save: "שמירה",
      tabStocks: "מניות",
      tabUsers: "משתמשים",
      tabFormulas: "נוסחאות",
      cancel: "ביטול",
      saveFormula: "שמור נוסחה",
      editFormula: "עריכת נוסחה",
      newFormula: "נוסחה חדשה",
      deleteFormula: "מחק",
      confirmDelete: "האם למחוק את הנוסחה?",
      noFormulas: "אין נוסחאות עדיין",
      omitRules: "כללי סינון",
      omitRulesAdminDefaults: "כללי סינון (ברירות מחדל מנהל)",
      omitRulesAdminHint: "הגדרות אלו חלות על כל המשתמשים המסונכרנים.",
      omitRulesSyncHint: "עוקב אחרי הגדרות מנהל. כבה לבחירה מותאמת.",
      syncWithAdmin: "סנכרון עם מנהל",
      enabled: "מופעל",
      addRule: "הוסף כלל",
      price: "מחיר",
      marketCap: "שווי שוק",
      min: "מינימום",
      max: "מקסימום",
      noRules: "אין כללים מוגדרים",
    },
    auth: {
      signinTitle: "ברוכים הבאים ל-Nasdaq Pulse",
      signinSubtitle: "התחברו כדי לגשת לסורק המניות עם נתונים בזמן אמת",
      googleButton: "המשך עם Google",
      or: "או",
      emailPlaceholder: "הזינו את כתובת המייל",
      emailButton: "המשך עם מייל",
      verifyTitle: "בדקו את המייל",
      verifyBody: "שלחנו קישור התחברות לכתובת המייל שלכם. לחצו על הקישור כדי להמשיך.",
      deniedTitle: "אין הרשאה",
      deniedBody: "החשבון אינו מורשה. פנו למנהל או התחברו עם מייל מאושר.",
      back: "חזרה לעמוד הראשי",
      checkEmail: "בדקו את המייל - שלחנו לכם קישור להתחברות!",
    },
    aiAnalysis: {
      title: "ניתוח",
      generate: "צור ניתוח",
      refresh: "רענן",
      updated: "עודכן",
      notEnoughNews: "אין מספיק חדשות אחרונות ליצירת ניתוח",
      generating: "מייצר...",
      error: "יצירת הניתוח נכשלה",
      buy: "קנייה",
      hold: "החזקה",
      sell: "מכירה",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}

export function isRTL(locale: Locale) {
  return locale === "he";
}
