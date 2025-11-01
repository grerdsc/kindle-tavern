// Kindle Reader Mode — JS-only modern e-reader styling for SillyTavern
// Requires: UI Extensions (runs in browser), enabled via Extensions panel
// Features: style injection, CSS vars, presets, slash-command, Alt+K toggle
(function () {
  const ctx = SillyTavern.getContext();
  const {
    eventSource,
    event_types,
    extensionSettings,
    saveSettingsDebounced,
    SlashCommandParser,
    SlashCommand,
    SlashCommandNamedArgument,
    SlashCommandArgument,
    ARGUMENT_TYPE,
  } = ctx;

  const MODULE = 'kindle_reader_pro';

  const defaults = Object.freeze({
    enabled: true,
    theme: 'paper', // paper | sepia | dark | amoled
    fontSize: 18,   // px
    lineHeight: 1.62,
    measureCh: 66,  // max measure in ch (≈ chars per line)
    marginPx: 72,   // outer page margin
    justify: true,
    hyphen: true,
    ligatures: true,
    letterSpacing: 0,    // em
    wordSpacing: 0,      // em
    indentFirstLine: false,
    paragraphSpacing: 0.9, // em after p
    preset: 'paperwhite',   // paperwhite|night|sepia
    lang: '',               // optional override, e.g. 'fr'
  });

  function S() {
    extensionSettings[MODULE] ||= structuredClone(defaults);
    for (const k of Object.keys(defaults)) {
      if (!Object.hasOwn(extensionSettings[MODULE], k)) {
        extensionSettings[MODULE][k] = defaults[k];
      }
    }
    return extensionSettings[MODULE];
  }

  function ensureStyleTag() {
    if (document.getElementById('kindle-override-pro')) return;
    const css = `
:root.kindle-mode, body.kindle-mode {
  /* Core vars (updated via JS) */
  --k-bg: #faf7ef;
  --k-fg: #2b2b2b;
  --k-font-size: 18px;
  --k-line: 1.62;
  --k-measure: 66ch;
  --k-margin: 72px;
  --k-letter: 0em;
  --k-word: 0em;
  --k-justify: justify;
  --k-hyphens: auto;
  --k-serif: Georgia, "Times New Roman", serif;
  --k-muted: color-mix(in srgb, var(--k-bg) 85%, var(--k-fg));
  color-scheme: light dark;
}

:root.kindle-mode[data-kindle-theme="paper"] { --k-bg:#faf7ef; --k-fg:#2b2b2b; --k-muted:#efeadc; }
:root.kindle-mode[data-kindle-theme="sepia"] { --k-bg:#f5ecd9; --k-fg:#2a2a2a; --k-muted:#e9ddc4; }
:root.kindle-mode[data-kindle-theme="dark"]  { --k-bg:#111113; --k-fg:#e8e6e3; --k-muted:#1a1a1b; }
:root.kindle-mode[data-kindle-theme="amoled"]{ --k-bg:#000000; --k-fg:#e8e6e3; --k-muted:#0a0a0a; }

html.kindle-mode body, body.kindle-mode {
  background: var(--k-bg) !important;
  color: var(--k-fg) !important;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

html.kindle-mode #chat, body.kindle-mode #chat {
  max-width: min(92vw, var(--k-measure));
  margin: 0 auto !important;
  padding: var(--k-margin) calc(var(--k-margin) - 24px) !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Neutralize bubbles */
html.kindle-mode .mes,
html.kindle-mode .message,
html.kindle-mode .assistantMessage,
html.kindle-mode .userMessage,
body.kindle-mode .mes,
body.kindle-mode .message,
body.kindle-mode .assistantMessage,
body.kindle-mode .userMessage {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin: 0 0 1.0em 0 !important;
}

/* Text block */
html.kindle-mode .mes_text,
html.kindle-mode .markdown,
html.kindle-mode .assistantMessage .text,
body.kindle-mode .mes_text,
body.kindle-mode .markdown,
body.kindle-mode .assistantMessage .text {
  font-family: var(--k-serif) !important;
  font-size: var(--k-font-size) !important;
  line-height: var(--k-line) !important;
  color: var(--k-fg) !important;
  letter-spacing: var(--k-letter) !important;
  word-spacing: var(--k-word) !important;
  text-align: var(--k-justify) !important;
  hyphens: var(--k-hyphens) !important;
  -webkit-hyphens: var(--k-hyphens) !important;
  overflow-wrap: anywhere;
}

/* Paragraph rhythm */
html.kindle-mode p {
  margin: 0 0 var(--k-para, 0.9em) 0 !important;
  text-indent: var(--k-indent, 0) !important;
}
html.kindle-mode p + p {
  /* if indent enabled, tighten spacing between consecutive paragraphs */
  margin-top: calc(var(--k-para, 0.9em) * 0.35) !important;
}

/* Headings in serif, compact */
html.kindle-mode h1, html.kindle-mode h2, html.kindle-mode h3, html.kindle-mode h4 {
  font-family: var(--k-serif) !important;
  line-height: 1.25 !important;
  margin: 1.1em 0 0.6em 0 !important;
  color: var(--k-fg) !important;
}

/* Inline code and pre in subtle cards */
html.kindle-mode pre, html.kindle-mode code {
  background: var(--k-muted) !important;
  color: var(--k-fg) !important;
  border: 0 !important;
  padding: 0.25em 0.5em !important;
  border-radius: 4px !important;
}

/* Images centered and constrained */
html.kindle-mode img {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0.8em auto;
}
`.trim();
    const el = document.createElement('style');
    el.id = 'kindle-override-pro';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function setVar(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.kindleTheme = theme;
  }

  function applySettings() {
    const s = S();
    const on = !!s.enabled;
    document.documentElement.classList.toggle('kindle-mode', on);
    document.body?.classList.toggle('kindle-mode', on);

    // Theme palette
    const t = (s.theme || 'paper');
    applyTheme(t);

    // Typography vars
    setVar('--k-font-size', `${s.fontSize}px`);
    setVar('--k-line', String(s.lineHeight));
    setVar('--k-measure', `${Math.max(42, Math.min(90, s.measureCh || 66))}ch`);
    setVar('--k-margin', `${Math.max(24, Math.min(160, s.marginPx || 72))}px`);
    setVar('--k-letter', `${s.letterSpacing || 0}em`);
    setVar('--k-word', `${s.wordSpacing || 0}em`);
    setVar('--k-para', `${s.paragraphSpacing || 0.9}em`);
    setVar('--k-indent', s.indentFirstLine ? '1.5em' : '0');

    // Justification & hyphenation
    setVar('--k-justify', s.justify ? 'justify' : 'start');
    setVar('--k-hyphens', s.hyphen ? 'auto' : 'manual');

    // Ligatures (feature-settings)
    document.documentElement.style.fontFeatureSettings = s.ligatures ? '"liga","clig","kern"' : '"kern"';

    // Optional language override (improves hyphenation if dictionaries available)
    if (s.lang && typeof s.lang === 'string') {
      try { document.documentElement.setAttribute('lang', s.lang); } catch {}
    }
  }

  function saveAndApply() {
    saveSettingsDebounced();
    applySettings();
  }

  function presets(name) {
    const s = S();
    switch (String(name || '').toLowerCase()) {
      case 'night':
        s.theme = 'dark';
        s.fontSize = 19;
        s.lineHeight = 1.62;
        s.measureCh = 64;
        s.marginPx = 68;
        s.justify = true;
        s.hyphen = true;
        s.ligatures = true;
        s.letterSpacing = 0.01;
        s.wordSpacing = 0.02;
        s.indentFirstLine = false;
        s.paragraphSpacing = 1.0;
        break;
      case 'sepia':
        s.theme = 'sepia';
        s.fontSize = 18;
        s.lineHeight = 1.64;
        s.measureCh = 66;
        s.marginPx = 72;
        s.justify = true;
        s.hyphen = true;
        s.ligatures = true;
        s.letterSpacing = 0;
        s.wordSpacing = 0.01;
        s.indentFirstLine = true;
        s.paragraphSpacing = 0.8;
        break;
      case 'paperwhite':
      default:
        s.theme = 'paper';
        s.fontSize = 18;
        s.lineHeight = 1.62;
        s.measureCh = 66;
        s.marginPx = 72;
        s.justify = true;
        s.hyphen = true;
        s.ligatures = true;
        s.letterSpacing = 0;
        s.wordSpacing = 0;
        s.indentFirstLine = false;
        s.paragraphSpacing = 0.9;
        break;
    }
  }

  function registerSlash() {
    if (!SlashCommandParser || !SlashCommand) return;

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
      name: 'kindle',
      aliases: ['reader'],
      returns: 'Configure le mode liseuse',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({
          description: 'on|off|preset',
          typeList: ARGUMENT_TYPE.STRING,
          isRequired: false,
        }),
      ],
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ name: 'preset', description: 'paperwhite|night|sepia', typeList: ARGUMENT_TYPE.STRING }),
        SlashCommandNamedArgument.fromProps({ name: 'theme', description: 'paper|sepia|dark|amoled', typeList: ARGUMENT_TYPE.STRING }),
        SlashCommandNamedArgument.fromProps({ name: 'size', description: 'font size px', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'line', description: 'line height', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'measure', description: 'measure in ch', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'margin', description: 'page margin px', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'justify', description: 'on/off', typeList: ARGUMENT_TYPE.BOOLEAN, defaultValue: 'on', enumList: ['on','off'] }),
        SlashCommandNamedArgument.fromProps({ name: 'hyphen', description: 'on/off', typeList: ARGUMENT_TYPE.BOOLEAN, defaultValue: 'on', enumList: ['on','off'] }),
        SlashCommandNamedArgument.fromProps({ name: 'ligatures', description: 'on/off', typeList: ARGUMENT_TYPE.BOOLEAN }),
        SlashCommandNamedArgument.fromProps({ name: 'letter', description: 'letter-spacing em', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'word', description: 'word-spacing em', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'indent', description: 'on/off first-line indent', typeList: ARGUMENT_TYPE.BOOLEAN }),
        SlashCommandNamedArgument.fromProps({ name: 'p', description: 'paragraph spacing em', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name: 'lang', description: 'override document lang (e.g. fr)', typeList: ARGUMENT_TYPE.STRING }),
      ],
      callback: (named, unnamed) => {
        const s = S();
        const first = (unnamed && String(unnamed).trim().toLowerCase()) || '';

        if (first === 'on') s.enabled = true;
        else if (first === 'off') s.enabled = false;
        else if (first) presets(first);

        if (named.preset) presets(named.preset);
        if (named.theme) s.theme = String(named.theme);
        if (named.size) s.fontSize = Number(named.size);
        if (named.line) s.lineHeight = Number(named.line);
        if (named.measure) s.measureCh = Number(named.measure);
        if (named.margin) s.marginPx = Number(named.margin);
        if (typeof named.justify !== 'undefined') s.justify = named.justify === true || String(named.justify) === 'on';
        if (typeof named.hyphen !== 'undefined') s.hyphen = named.hyphen === true || String(named.hyphen) === 'on';
        if (typeof named.ligatures !== 'undefined') s.ligatures = named.ligatures === true || String(named.ligatures) === 'on';
        if (typeof named.letter !== 'undefined') s.letterSpacing = Number(named.letter);
        if (typeof named.word !== 'undefined') s.wordSpacing = Number(named.word);
        if (typeof named.indent !== 'undefined') s.indentFirstLine = named.indent === true || String(named.indent) === 'on';
        if (typeof named.p !== 'undefined') s.paragraphSpacing = Number(named.p);
        if (typeof named.lang !== 'undefined') s.lang = String(named.lang);

        saveAndApply();
        return 'Kindle reader: paramètres mis à jour.';
      },
      helpString: `
        /kindle [on|off|paperwhite|night|sepia] theme=paper|sepia|dark|amoled size=18 line=1.62 measure=66 margin=72 justify=on hyphen=on ligatures=on letter=0 word=0 indent=off p=0.9 lang=fr
      `,
    }));
  }

  function registerHotkeys() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyK') {
        const s = S();
        s.enabled = !s.enabled;
        saveAndApply();
      }
    }, { passive: true });
  }

  // Bootstrapping
  eventSource.on(event_types.APP_READY, () => {
    ensureStyleTag();
    presets(S().preset);
    applySettings();
    registerSlash();
    registerHotkeys();
  });
  eventSource.on(event_types.CHAT_CHANGED, applySettings);
})();