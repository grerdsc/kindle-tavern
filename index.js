(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, extensionSettings, saveSettingsDebounced, SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;

  const MOD = 'kindle_theme_pure';
  const DEF = Object.freeze({
    enabled: true,
    theme: 'paper',      // paper | sepia | dark | night
    size: 18,
    line: 1.65,
    measure: 68,
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
    if (document.getElementById('kindle-pure-style')) return;
    
    const css = `
/* ========================================
   KINDLE PURE THEME — CSS OVERLAY
   Ultra moderne, pas de DOM takeover
   ======================================== */

:root.kindle-mode {
  /* Palette papier (défaut) */
  --kindle-bg: #faf8f3;
  --kindle-fg: #2b2b2b;
  --kindle-muted: #e8e4da;
  --kindle-border: rgba(0,0,0,0.08);
  --kindle-shadow: rgba(0,0,0,0.06);
  
  /* Typographie */
  --kindle-serif: Georgia, "Literata", "Source Serif Pro", "Times New Roman", serif;
  --kindle-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --kindle-size: 18px;
  --kindle-line: 1.65;
  --kindle-measure: 68ch;
  --kindle-justify: justify;
  --kindle-hyphens: auto;
}

/* Thèmes */
:root.kindle-mode[data-kindle-theme="sepia"] {
  --kindle-bg: #f4ead5;
  --kindle-fg: #2a2a2a;
  --kindle-muted: #e7dcc3;
  --kindle-border: rgba(0,0,0,0.06);
}

:root.kindle-mode[data-kindle-theme="dark"] {
  --kindle-bg: #1a1a1c;
  --kindle-fg: #e5e3df;
  --kindle-muted: #242426;
  --kindle-border: rgba(255,255,255,0.08);
  --kindle-shadow: rgba(0,0,0,0.3);
}

:root.kindle-mode[data-kindle-theme="night"] {
  --kindle-bg: #0e0e10;
  --kindle-fg: #d8d6d2;
  --kindle-muted: #18181a;
  --kindle-border: rgba(255,255,255,0.06);
  --kindle-shadow: rgba(0,0,0,0.5);
}

/* ========================================
   BASE — page et fond
   ======================================== */
html.kindle-mode,
html.kindle-mode body {
  background: var(--kindle-bg) !important;
  color: var(--kindle-fg) !important;
  font-family: var(--kindle-serif) !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* ========================================
   LAYOUT — colonne centrée lecture
   ======================================== */
html.kindle-mode #chat,
html.kindle-mode .chat {
  max-width: min(92vw, var(--kindle-measure)) !important;
  margin: 0 auto !important;
  padding: 48px 32px 120px 32px !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* ========================================
   MESSAGES — rendu roman/liseuse
   ======================================== */
html.kindle-mode .mes,
html.kindle-mode .message,
html.kindle-mode .assistantMessage,
html.kindle-mode .userMessage {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 0 1.2em 0 !important;
  max-width: 100% !important;
}

/* Texte du message */
html.kindle-mode .mes_text,
html.kindle-mode .markdown,
html.kindle-mode .assistantMessage .text,
html.kindle-mode .userMessage .text {
  font-family: var(--kindle-serif) !important;
  font-size: var(--kindle-size) !important;
  line-height: var(--kindle-line) !important;
  color: var(--kindle-fg) !important;
  text-align: var(--kindle-justify) !important;
  hyphens: var(--kindle-hyphens) !important;
  -webkit-hyphens: var(--kindle-hyphens) !important;
  letter-spacing: 0.01em !important;
  word-spacing: 0.02em !important;
}

/* Paragraphes — indentation premier alinéa */
html.kindle-mode .markdown p,
html.kindle-mode .mes_text p {
  margin: 0 0 0.9em 0 !important;
  text-indent: 1.5em !important;
}

html.kindle-mode .markdown p:first-of-type,
html.kindle-mode .mes_text p:first-of-type {
  text-indent: 0 !important;
}

/* Lettrine (Drop cap) moderne */
html.kindle-mode[data-kindle-dropcap="true"] .markdown p:first-of-type::first-letter,
html.kindle-mode[data-kindle-dropcap="true"] .mes_text p:first-of-type::first-letter {
  float: left;
  font-size: 3.2em;
  line-height: 0.85;
  font-weight: 600;
  padding-right: 0.08em;
  margin-top: 0.08em;
  font-family: var(--kindle-serif);
}

/* Titres — small-caps élégants */
html.kindle-mode h1,
html.kindle-mode h2,
html.kindle-mode h3 {
  font-family: var(--kindle-serif) !important;
  font-variant: small-caps;
  letter-spacing: 0.05em;
  line-height: 1.3 !important;
  margin: 1.4em 0 0.7em 0 !important;
  color: var(--kindle-fg) !important;
  font-weight: 600 !important;
}

/* Code — discret */
html.kindle-mode pre,
html.kindle-mode code {
  background: var(--kindle-muted) !important;
  color: var(--kindle-fg) !important;
  border: 0 !important;
  border-radius: 4px !important;
  padding: 0.2em 0.5em !important;
  font-size: 0.9em !important;
}

html.kindle-mode pre {
  padding: 0.8em 1em !important;
  overflow-x: auto;
}

/* Images centrées */
html.kindle-mode img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 1.2em auto !important;
  border-radius: 6px;
}

/* ========================================
   SIDEBAR & PANELS — Kindle moderne
   ======================================== */
html.kindle-mode .drawer,
html.kindle-mode .drawer-content,
html.kindle-mode #left-nav-panel,
html.kindle-mode #right-nav-panel,
html.kindle-mode .right_menu,
html.kindle-mode #WorldInfo,
html.kindle-mode #extensions_settings,
html.kindle-mode .extensions-block {
  background: var(--kindle-bg) !important;
  color: var(--kindle-fg) !important;
  border-color: var(--kindle-border) !important;
}

html.kindle-mode .drawer-content h3,
html.kindle-mode .extensions-block h3,
html.kindle-mode .inline-drawer-toggle {
  font-family: var(--kindle-sans) !important;
  color: var(--kindle-fg) !important;
}

/* Inputs et contrôles */
html.kindle-mode input,
html.kindle-mode textarea,
html.kindle-mode select,
html.kindle-mode button {
  background: var(--kindle-muted) !important;
  color: var(--kindle-fg) !important;
  border: 1px solid var(--kindle-border) !important;
  font-family: var(--kindle-sans) !important;
}

html.kindle-mode button:hover {
  background: color-mix(in srgb, var(--kindle-muted) 85%, var(--kindle-fg)) !important;
}

html.kindle-mode textarea#send_textarea,
html.kindle-mode [contenteditable="true"] {
  font-family: var(--kindle-serif) !important;
  font-size: var(--kindle-size) !important;
  line-height: var(--kindle-line) !important;
}

/* ========================================
   TOP BAR — minimaliste
   ======================================== */
html.kindle-mode #top_bar,
html.kindle-mode .topBar {
  background: var(--kindle-bg) !important;
  border-bottom: 1px solid var(--kindle-border) !important;
  box-shadow: 0 2px 8px var(--kindle-shadow) !important;
}

html.kindle-mode #top_bar *,
html.kindle-mode .topBar * {
  color: var(--kindle-fg) !important;
}

/* ========================================
   SCROLLBARS — fin et élégant
   ======================================== */
html.kindle-mode ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

html.kindle-mode ::-webkit-scrollbar-track {
  background: var(--kindle-muted);
}

html.kindle-mode ::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--kindle-fg) 30%, transparent);
  border-radius: 4px;
}

html.kindle-mode ::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--kindle-fg) 45%, transparent);
}

/* ========================================
   SEND FORM — intégré proprement
   ======================================== */
html.kindle-mode #send_form,
html.kindle-mode .input-form {
  background: var(--kindle-bg) !important;
  border-top: 1px solid var(--kindle-border) !important;
  box-shadow: 0 -2px 12px var(--kindle-shadow) !important;
}

/* ========================================
   MODAL/POPUPS — cohérence
   ======================================== */
html.kindle-mode .popup,
html.kindle-mode .dialogue_popup,
html.kindle-mode #dialogue_popup {
  background: var(--kindle-bg) !important;
  color: var(--kindle-fg) !important;
  border: 1px solid var(--kindle-border) !important;
  box-shadow: 0 8px 32px var(--kindle-shadow) !important;
}

/* ========================================
   AVATARS — bordures subtiles
   ======================================== */
html.kindle-mode .avatar,
html.kindle-mode img.avatar {
  border: 2px solid var(--kindle-border) !important;
  box-shadow: 0 2px 8px var(--kindle-shadow) !important;
}

/* ========================================
   ANIMATIONS — micro-transitions
   ======================================== */
html.kindle-mode * {
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease !important;
}
`;

    const style = document.createElement('style');
    style.id = 'kindle-pure-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applySettings() {
    const s = S();
    
    document.documentElement.classList.toggle('kindle-mode', !!s.enabled);
    document.documentElement.dataset.kindleTheme = s.theme || 'paper';
    document.documentElement.dataset.kindleDropcap = String(!!s.dropCap);
    
    if (s.lang) {
      document.documentElement.setAttribute('lang', s.lang);
    }
    
    document.documentElement.style.setProperty('--kindle-size', `${s.size}px`);
    document.documentElement.style.setProperty('--kindle-line', String(s.line));
    document.documentElement.style.setProperty('--kindle-measure', `${s.measure}ch`);
    document.documentElement.style.setProperty('--kindle-justify', s.justify ? 'justify' : 'left');
    document.documentElement.style.setProperty('--kindle-hyphens', s.hyphen ? 'auto' : 'manual');
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
      aliases: ['reader'],
      returns: 'Mode Kindle (thème pur CSS)',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({
          description: 'on|off',
          typeList: ARGUMENT_TYPE.STRING,
          isRequired: false
        })
      ],
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ name: 'theme', description: 'paper|sepia|dark|night', typeList: ARGUMENT_TYPE.STRING }),
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
        
        return `Mode Kindle: ${s.enabled ? 'activé' : 'désactivé'}`;
      },
      helpString: '/kindle [on|off] theme=paper|sepia|dark|night size=18 line=1.65 measure=68 justify=on hyphen=on dropcap=on lang=fr'
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
    } catch (err) {
      console.error('[Kindle Theme] Init error:', err);
    }
  });

  eventSource.on(event_types.CHAT_CHANGED, () => {
    try {
      if (S().enabled) applySettings();
    } catch (err) {
      console.error('[Kindle Theme] Chat changed error:', err);
    }
  });

})();
