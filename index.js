(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, extensionSettings, saveSettingsDebounced, SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;

  const MOD = 'kindle_modern';
  const DEF = Object.freeze({
    enabled: true,
    theme: 'warm',      // warm | sepia | dark | night
    size: 18,
    line: 1.68,
    measure: 70,
    justify: true,
    hyphen: true,
    dropCap: true,
    lang: 'fr'
  });

  function S() {
    extensionSettings[MOD] ||= structuredClone(DEF);
    for (const k in DEF) if (!(k in extensionSettings[MOD])) extensionSettings[MOD][k] = DEF[k];
    return extensionSettings[MOD];
  }

  function injectStyles() {
    if (document.getElementById('kindle-modern-style')) return;
    
    const css = `
/* ================================================================
   KINDLE MODERN THEME — Ultra-moderne, blanc sans lumière bleue
   Design minimaliste inspiré Kindle Paperwhite Signature Edition
   ================================================================ */

:root.kindle-mode {
  /* === PALETTE WARM (défaut) — Blanc chaud Kindle, zéro lumière bleue === */
  --k-bg: #fffcf7;              /* Blanc très chaud, crème naturel */
  --k-fg: #1a1613;              /* Noir encre profond */
  --k-surface: #faf7f0;         /* Surface légèrement teintée */
  --k-surface-hover: #f5f1e8;   /* Hover état */
  --k-border: rgba(26, 22, 19, 0.08);
  --k-border-strong: rgba(26, 22, 19, 0.12);
  --k-shadow-sm: 0 1px 3px rgba(26, 22, 19, 0.04);
  --k-shadow-md: 0 4px 12px rgba(26, 22, 19, 0.06);
  --k-shadow-lg: 0 8px 24px rgba(26, 22, 19, 0.08);
  --k-accent: #8b7355;          /* Accent terre cuite */
  --k-accent-hover: #a0846a;
  
  /* === TYPOGRAPHIE === */
  --k-serif: "Literata", "Source Serif Pro", Georgia, "Times New Roman", serif;
  --k-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  --k-mono: "SF Mono", "Consolas", "Liberation Mono", monospace;
  --k-size: 18px;
  --k-line: 1.68;
  --k-measure: 70ch;
  --k-tracking: -0.011em;       /* Légère compression moderne */
  --k-justify: justify;
  --k-hyphens: auto;
  
  /* === ESPACEMENTS MODERNES === */
  --k-space-xs: 4px;
  --k-space-sm: 8px;
  --k-space-md: 16px;
  --k-space-lg: 24px;
  --k-space-xl: 48px;
  
  /* === RADIIS === */
  --k-radius-sm: 6px;
  --k-radius-md: 10px;
  --k-radius-lg: 16px;
}

/* === THÈMES ALTERNATIFS === */
:root.kindle-mode[data-kindle-theme="sepia"] {
  --k-bg: #f4e8d5;
  --k-fg: #2a2520;
  --k-surface: #ede2ce;
  --k-surface-hover: #e6dbc5;
  --k-border: rgba(42, 37, 32, 0.08);
  --k-border-strong: rgba(42, 37, 32, 0.12);
  --k-accent: #9d7e5f;
  --k-accent-hover: #b39274;
}

:root.kindle-mode[data-kindle-theme="dark"] {
  --k-bg: #1c1c1e;
  --k-fg: #efefed;
  --k-surface: #242426;
  --k-surface-hover: #2c2c2e;
  --k-border: rgba(239, 239, 237, 0.08);
  --k-border-strong: rgba(239, 239, 237, 0.12);
  --k-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --k-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --k-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --k-accent: #b8a490;
  --k-accent-hover: #c9b5a3;
}

:root.kindle-mode[data-kindle-theme="night"] {
  --k-bg: #0a0a0b;
  --k-fg: #d8d6d2;
  --k-surface: #121214;
  --k-surface-hover: #1a1a1c;
  --k-border: rgba(216, 214, 210, 0.06);
  --k-border-strong: rgba(216, 214, 210, 0.1);
  --k-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.5);
  --k-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
  --k-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.7);
  --k-accent: #9a8875;
  --k-accent-hover: #ac9a88;
}

/* ================================================================
   BASE — Page complète
   ================================================================ */
html.kindle-mode,
html.kindle-mode body {
  background: var(--k-bg) !important;
  color: var(--k-fg) !important;
  font-family: var(--k-sans) !important;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

/* ================================================================
   LAYOUT — Zone de lecture centrée, marges généreuses
   ================================================================ */
html.kindle-mode #chat,
html.kindle-mode .chat {
  max-width: min(88vw, var(--k-measure)) !important;
  margin: 0 auto !important;
  padding: var(--k-space-xl) var(--k-space-lg) 160px var(--k-space-lg) !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* ================================================================
   MESSAGES — Rendu liseuse ultra-propre
   ================================================================ */
html.kindle-mode .mes,
html.kindle-mode .message,
html.kindle-mode .assistantMessage,
html.kindle-mode .userMessage {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 0 1.4em 0 !important;
  max-width: 100% !important;
}

/* Texte des messages — typographie Kindle */
html.kindle-mode .mes_text,
html.kindle-mode .markdown,
html.kindle-mode .assistantMessage .text,
html.kindle-mode .userMessage .text {
  font-family: var(--k-serif) !important;
  font-size: var(--k-size) !important;
  line-height: var(--k-line) !important;
  color: var(--k-fg) !important;
  text-align: var(--k-justify) !important;
  hyphens: var(--k-hyphens) !important;
  -webkit-hyphens: var(--k-hyphens) !important;
  letter-spacing: var(--k-tracking) !important;
  word-spacing: 0.02em !important;
}

/* Paragraphes — indentation élégante */
html.kindle-mode .markdown p,
html.kindle-mode .mes_text p {
  margin: 0 0 1em 0 !important;
  text-indent: 1.6em !important;
}

html.kindle-mode .markdown p:first-of-type,
html.kindle-mode .mes_text p:first-of-type {
  text-indent: 0 !important;
}

/* Lettrine (Drop cap) ultra-moderne */
html.kindle-mode[data-kindle-dropcap="true"] .markdown p:first-of-type::first-letter,
html.kindle-mode[data-kindle-dropcap="true"] .mes_text p:first-of-type::first-letter {
  float: left;
  font-size: 3.5em;
  line-height: 0.82;
  font-weight: 700;
  padding-right: 0.1em;
  margin-top: 0.05em;
  color: var(--k-accent);
  font-family: var(--k-serif);
}

/* Titres — minimaliste et raffiné */
html.kindle-mode h1,
html.kindle-mode h2,
html.kindle-mode h3 {
  font-family: var(--k-sans) !important;
  font-weight: 700 !important;
  letter-spacing: -0.02em !important;
  line-height: 1.25 !important;
  margin: 1.8em 0 0.8em 0 !important;
  color: var(--k-fg) !important;
}

html.kindle-mode h1 { font-size: 1.6em !important; }
html.kindle-mode h2 { font-size: 1.35em !important; }
html.kindle-mode h3 { font-size: 1.15em !important; }

/* Liens — accent subtil */
html.kindle-mode a {
  color: var(--k-accent) !important;
  text-decoration: none !important;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s ease;
}

html.kindle-mode a:hover {
  border-bottom-color: var(--k-accent);
}

/* Citations — barre latérale */
html.kindle-mode blockquote {
  margin: 1.2em 0 !important;
  padding-left: 1.2em !important;
  border-left: 3px solid var(--k-accent) !important;
  color: color-mix(in srgb, var(--k-fg) 75%, var(--k-bg)) !important;
  font-style: italic;
}

/* Code — surface moderne */
html.kindle-mode code {
  background: var(--k-surface) !important;
  color: var(--k-fg) !important;
  border: 1px solid var(--k-border) !important;
  border-radius: var(--k-radius-sm) !important;
  padding: 0.2em 0.5em !important;
  font-family: var(--k-mono) !important;
  font-size: 0.88em !important;
}

html.kindle-mode pre {
  background: var(--k-surface) !important;
  border: 1px solid var(--k-border) !important;
  border-radius: var(--k-radius-md) !important;
  padding: 1em 1.2em !important;
  overflow-x: auto;
  margin: 1.2em 0 !important;
}

html.kindle-mode pre code {
  background: transparent !important;
  border: 0 !important;
  padding: 0 !important;
}

/* Images — arrondi moderne */
html.kindle-mode img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.5em auto !important;
  border-radius: var(--k-radius-md);
  box-shadow: var(--k-shadow-md);
}

/* ================================================================
   TOP BAR — Épuré et moderne
   ================================================================ */
html.kindle-mode #top_bar,
html.kindle-mode .topBar {
  background: var(--k-bg) !important;
  border-bottom: 1px solid var(--k-border) !important;
  box-shadow: var(--k-shadow-sm) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

html.kindle-mode #top_bar *,
html.kindle-mode .topBar * {
  color: var(--k-fg) !important;
}

html.kindle-mode #top_bar button,
html.kindle-mode .topBar button {
  background: transparent !important;
  border: 0 !important;
  border-radius: var(--k-radius-sm) !important;
  transition: background-color 0.2s ease;
}

html.kindle-mode #top_bar button:hover,
html.kindle-mode .topBar button:hover {
  background: var(--k-surface-hover) !important;
}

/* ================================================================
   SIDEBARS & PANELS — Harmonie totale
   ================================================================ */
html.kindle-mode .drawer,
html.kindle-mode .drawer-content,
html.kindle-mode #left-nav-panel,
html.kindle-mode #right-nav-panel,
html.kindle-mode .right_menu,
html.kindle-mode #WorldInfo,
html.kindle-mode #extensions_settings,
html.kindle-mode .extensions-block,
html.kindle-mode #character_popup,
html.kindle-mode #shadow_select_chat_popup {
  background: var(--k-bg) !important;
  color: var(--k-fg) !important;
  border-color: var(--k-border) !important;
  box-shadow: var(--k-shadow-lg) !important;
}

/* Titres de sections */
html.kindle-mode .drawer-content h3,
html.kindle-mode .extensions-block h3,
html.kindle-mode .inline-drawer-toggle,
html.kindle-mode h4 {
  font-family: var(--k-sans) !important;
  font-weight: 700 !important;
  color: var(--k-fg) !important;
  letter-spacing: -0.01em !important;
}

/* ================================================================
   INPUTS & CONTROLS — Design system cohérent
   ================================================================ */
html.kindle-mode input,
html.kindle-mode textarea,
html.kindle-mode select {
  background: var(--k-surface) !important;
  color: var(--k-fg) !important;
  border: 1px solid var(--k-border) !important;
  border-radius: var(--k-radius-sm) !important;
  font-family: var(--k-sans) !important;
  padding: var(--k-space-sm) var(--k-space-md) !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

html.kindle-mode input:focus,
html.kindle-mode textarea:focus,
html.kindle-mode select:focus {
  outline: none !important;
  border-color: var(--k-accent) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--k-accent) 12%, transparent) !important;
}

/* Boutons — moderne et propre */
html.kindle-mode button,
html.kindle-mode .menu_button {
  background: var(--k-surface) !important;
  color: var(--k-fg) !important;
  border: 1px solid var(--k-border) !important;
  border-radius: var(--k-radius-sm) !important;
  font-family: var(--k-sans) !important;
  font-weight: 600 !important;
  padding: var(--k-space-sm) var(--k-space-md) !important;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
}

html.kindle-mode button:hover,
html.kindle-mode .menu_button:hover {
  background: var(--k-surface-hover) !important;
  border-color: var(--k-border-strong) !important;
  transform: translateY(-1px);
}

html.kindle-mode button:active,
html.kindle-mode .menu_button:active {
  transform: translateY(0);
}

/* Bouton primaire/accent */
html.kindle-mode button.primary,
html.kindle-mode button[type="submit"],
html.kindle-mode .menu_button.primary {
  background: var(--k-accent) !important;
  color: var(--k-bg) !important;
  border-color: var(--k-accent) !important;
}

html.kindle-mode button.primary:hover,
html.kindle-mode button[type="submit"]:hover,
html.kindle-mode .menu_button.primary:hover {
  background: var(--k-accent-hover) !important;
  border-color: var(--k-accent-hover) !important;
}

/* ================================================================
   COMPOSITEUR — Intégration harmonieuse
   ================================================================ */
html.kindle-mode #send_form,
html.kindle-mode .input-form {
  background: var(--k-bg) !important;
  border-top: 1px solid var(--k-border) !important;
  box-shadow: var(--k-shadow-md) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

html.kindle-mode textarea#send_textarea,
html.kindle-mode [contenteditable="true"] {
  font-family: var(--k-serif) !important;
  font-size: var(--k-size) !important;
  line-height: var(--k-line) !important;
  background: var(--k-surface) !important;
  border-radius: var(--k-radius-md) !important;
}

/* ================================================================
   MODALES & POPUPS — Cohérence design
   ================================================================ */
html.kindle-mode .popup,
html.kindle-mode .dialogue_popup,
html.kindle-mode #dialogue_popup,
html.kindle-mode .modal {
  background: var(--k-bg) !important;
  color: var(--k-fg) !important;
  border: 1px solid var(--k-border-strong) !important;
  border-radius: var(--k-radius-lg) !important;
  box-shadow: var(--k-shadow-lg) !important;
}

/* ================================================================
   SCROLLBARS — Minimaliste et élégant
   ================================================================ */
html.kindle-mode ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

html.kindle-mode ::-webkit-scrollbar-track {
  background: transparent;
}

html.kindle-mode ::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--k-fg) 18%, transparent);
  border-radius: 5px;
  border: 2px solid var(--k-bg);
}

html.kindle-mode ::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--k-fg) 28%, transparent);
}

/* ================================================================
   AVATARS — Arrondi moderne
   ================================================================ */
html.kindle-mode .avatar,
html.kindle-mode img.avatar {
  border: 2px solid var(--k-border) !important;
  border-radius: var(--k-radius-md) !important;
  box-shadow: var(--k-shadow-sm) !important;
}

/* ================================================================
   CHECKBOXES & TOGGLES — Moderne
   ================================================================ */
html.kindle-mode input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: var(--k-surface);
  border: 2px solid var(--k-border-strong);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
}

html.kindle-mode input[type="checkbox"]:checked {
  background: var(--k-accent);
  border-color: var(--k-accent);
}

html.kindle-mode input[type="checkbox"]:checked::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--k-bg);
  font-size: 14px;
  font-weight: 700;
}

/* ================================================================
   SLIDERS — Design moderne
   ================================================================ */
html.kindle-mode input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: var(--k-surface);
  border-radius: 999px;
  height: 6px;
}

html.kindle-mode input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--k-accent);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: var(--k-shadow-sm);
  transition: transform 0.1s ease;
}

html.kindle-mode input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

/* ================================================================
   ANIMATIONS — Micro-interactions
   ================================================================ */
html.kindle-mode * {
  transition: background-color 0.2s ease, 
              color 0.2s ease, 
              border-color 0.2s ease,
              box-shadow 0.2s ease !important;
}

/* ================================================================
   BADGES & TAGS — Design cohérent
   ================================================================ */
html.kindle-mode .tag,
html.kindle-mode .badge {
  background: var(--k-surface) !important;
  color: var(--k-fg) !important;
  border: 1px solid var(--k-border) !important;
  border-radius: var(--k-radius-sm) !important;
  padding: 2px 8px !important;
  font-size: 0.85em !important;
  font-weight: 600 !important;
}
`;

    const style = document.createElement('style');
    style.id = 'kindle-modern-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applySettings() {
    const s = S();
    
    document.documentElement.classList.toggle('kindle-mode', !!s.enabled);
    document.documentElement.dataset.kindleTheme = s.theme || 'warm';
    document.documentElement.dataset.kindleDropcap = String(!!s.dropCap);
    
    if (s.lang) {
      document.documentElement.setAttribute('lang', s.lang);
    }
    
    document.documentElement.style.setProperty('--k-size', `${s.size}px`);
    document.documentElement.style.setProperty('--k-line', String(s.line));
    document.documentElement.style.setProperty('--k-measure', `${s.measure}ch`);
    document.documentElement.style.setProperty('--k-justify', s.justify ? 'justify' : 'left');
    document.documentElement.style.setProperty('--k-hyphens', s.hyphen ? 'auto' : 'manual');
  }

  function toggle(state) {
    const s = S();
    s.enabled = typeof state === 'boolean' ? state : !s.enabled;
    saveSettingsDebounced();
    applySettings();
  }

  function registerSlash() {
    if (!SlashCommandParser || !SlashCommand) return;

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
      name: 'kindle',
      aliases: ['reader', 'km'],
      returns: 'Kindle Modern Theme',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({
          description: 'on|off',
          typeList: ARGUMENT_TYPE.STRING,
          isRequired: false
        })
      ],
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ name: 'theme', description: 'warm|sepia|dark|night', typeList: ARGUMENT_TYPE.STRING }),
        SlashCommandNamedArgument.fromProps({ name: 'size', description: 'taille px', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'line', description: 'interligne', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'measure', description: 'largeur ch', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'justify', description: 'on|off', typeList: ARGUMENT_TYPE.BOOLEAN }),
        SlashCommandNamedArgument.fromProps({ name: 'hyphen', description: 'on|off', typeList: ARGUMENT_TYPE.BOOLEAN }),
        SlashCommandNamedArgument.fromProps({ name: 'dropcap', description: 'on|off', typeList: ARGUMENT_TYPE.BOOLEAN }),
        SlashCommandNamedArgument.fromProps({ name: 'lang', description: 'fr|en|...', typeList: ARGUMENT_TYPE.STRING })
      ],
      callback: (named, unnamed) => {
        const s = S();
        const cmd = (unnamed && String(unnamed).trim().toLowerCase()) || '';
        
        if (cmd === 'on') s.enabled = true;
        else if (cmd === 'off') s.enabled = false;
        
        if (named.theme) s.theme = String(named.theme);
        if (typeof named.size !== 'undefined') s.size = Number(named.size);
        if (typeof named.line !== 'undefined') s.line = Number(named.line);
        if (typeof named.measure !== 'undefined') s.measure = Number(named.measure);
        if (typeof named.justify !== 'undefined') s.justify = !!named.justify;
        if (typeof named.hyphen !== 'undefined') s.hyphen = !!named.hyphen;
        if (typeof named.dropcap !== 'undefined') s.dropCap = !!named.dropcap;
        if (named.lang) s.lang = String(named.lang);
        
        saveSettingsDebounced();
        applySettings();
        
        return `Kindle Modern: ${s.enabled ? 'activé (' + s.theme + ')' : 'désactivé'}`;
      },
      helpString: '/kindle [on|off] theme=warm|sepia|dark|night size=18 line=1.68 measure=70 justify=on hyphen=on dropcap=on lang=fr'
    }));
  }

  function registerHotkey() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyK') {
        e.preventDefault();
        toggle();
      }
    }, { passive: false });
  }

  // Init
  eventSource.on(event_types.APP_READY, () => {
    try {
      injectStyles();
      applySettings();
      registerSlash();
      registerHotkey();
      console.log('[Kindle Modern] Theme loaded');
    } catch (err) {
      console.error('[Kindle Modern] Init error:', err);
    }
  });

  eventSource.on(event_types.CHAT_CHANGED, () => {
    try {
      if (S().enabled) applySettings();
    } catch (err) {
      console.error('[Kindle Modern] Chat changed error:', err);
    }
  });

})();
