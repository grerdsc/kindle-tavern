// SillyTavern — Kindle 16:9 Takeover (déplace #chat, pagination colonnes, navigation complète)
(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, extensionSettings, saveSettingsDebounced, SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;

  const MOD = 'kindle169_takeover';
  const DEF = Object.freeze({
    enabled: true,
    theme: 'paper',           // paper|sepia|dark|amoled
    size: 18,                 // px
    line: 1.62,
    measureCh: 66,            // largeur typographique interne
    pad: 28,                  // padding interne de page
    lang: 'fr',
  });

  let state = { mounted: false, mo: null, chatEl: null, chatParent: null, chatNext: null, page: 0, pages: 1 };

  function S() {
    extensionSettings[MOD] ||= structuredClone(DEF);
    for (const k of Object.keys(DEF)) if (!(k in extensionSettings[MOD])) extensionSettings[MOD][k] = DEF[k];
    return extensionSettings[MOD];
  }

  function qs(sel) { return document.querySelector(sel); }

  function ensureStyles() {
    if (qs('#k169-style')) return;
    const css = `
:root.k169 { --k-bg:#faf7ef; --k-fg:#2b2b2b; --k-muted:#efeadc; --k-size:18px; --k-line:1.62; --k-measure:66ch; --k-pad:28px; --k-justify:justify; --k-hyphens:auto; --k-serif: Georgia,"Times New Roman",serif; }
:root.k169[data-k-theme="sepia"]  { --k-bg:#f5ecd9; --k-fg:#2a2a2a; --k-muted:#e9ddc4; }
:root.k169[data-k-theme="dark"]   { --k-bg:#111113; --k-fg:#e8e6e3; --k-muted:#1a1a1b; }
:root.k169[data-k-theme="amoled"] { --k-bg:#000;    --k-fg:#e8e6e3; --k-muted:#0a0a0a; }

html.k169, html.k169 body { background: var(--k-bg) !important; color: var(--k-fg) !important; }

#k169-wrap { position: fixed; inset: 0; display: grid; place-items: center; z-index: 9990; pointer-events: none; }
#k169-device { pointer-events: auto; aspect-ratio: 16/9; width: min(95vw, 1400px); background: #0a0a0a; border-radius: 22px; box-shadow: 0 12px 40px rgba(0,0,0,.45); padding: 18px; display: grid; }
#k169-screen { background: var(--k-bg); border-radius: 14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 0 0 2px rgba(0,0,0,.08); display: grid; grid-template-rows: 44px 1fr 36px; overflow: hidden; }
#k169-head,#k169-foot { display: grid; align-items:center; padding:0 16px; color:var(--k-fg); font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background: color-mix(in srgb, var(--k-bg) 90%, var(--k-fg)); }
#k169-head { grid-template-columns: 1fr auto; }
#k169-progress { height:4px; width:100%; background: color-mix(in srgb, var(--k-fg) 12%, transparent); border-radius:999px; overflow:hidden; }
#k169-progress > i { display:block; height:100%; width:0%; background: var(--k-fg); }
#k169-body { position:relative; overflow:hidden; padding: var(--k-pad); }

/* Conteneur de colonnes (scroll horizontal programmatique, barres masquées) */
#k169-cols { position:relative; height:100%; width:100%; overflow:auto; scrollbar-width:none; }
#k169-cols::-webkit-scrollbar{ display:none; }

/* Le chat réel devient le “flow” en colonnes */
#k169-cols > #chat { height:100%; column-gap: 2.2rem; font-family: var(--k-serif) !important; font-size: var(--k-size) !important; line-height: var(--k-line) !important; text-align: var(--k-justify) !important; hyphens: var(--k-hyphens) !important; -webkit-hyphens: var(--k-hyphens) !important; color: var(--k-fg) !important; outline: none !important; }
#k169-cols #chat .mes, #k169-cols #chat .message, #k169-cols #chat .assistantMessage, #k169-cols #chat .userMessage { background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; margin:0 0 0.9em 0 !important; }
#k169-cols #chat .mes_text, #k169-cols #chat .markdown, #k169-cols #chat .assistantMessage .text { color: var(--k-fg) !important; }

/* Zones de tap */
#k169-left,#k169-right { position:absolute; top:0; bottom:0; width:22%; z-index:3; cursor:pointer; opacity:0; }
#k169-left{ left:0; } #k169-right{ right:0; }

/* On masque l’UI hors lecture pour éviter la double présence */
html.k169 .sidebar, html.k169 #top_bar, html.k169 #send_form, html.k169 .input-form, html.k169 [data-testid="composer"] { display:none !important; }
`.trim();
    const style = document.createElement('style'); style.id = 'k169-style'; style.textContent = css; document.head.appendChild(style);
  }

  function frameHTML() {
    return `
      <div id="k169-wrap">
        <div id="k169-device">
          <div id="k169-screen">
            <div id="k169-head"><div id="k169-title">Lecture</div><div id="k169-clock">--:--</div></div>
            <div id="k169-body">
              <div id="k169-cols"></div>
              <div id="k169-left" title="Page précédente"></div>
              <div id="k169-right" title="Page suivante"></div>
            </div>
            <div id="k169-foot"><div id="k169-progress"><i></i></div></div>
          </div>
        </div>
      </div>`;
  }

  function mount() {
    if (state.mounted) return;
    ensureStyles();

    // Trouver le conteneur de chat (versions récentes gardent #chat)
    const chat = qs('#chat') || qs('.chat');
    if (!chat) return;
    state.chatEl = chat;
    state.chatParent = chat.parentNode;
    state.chatNext = chat.nextSibling;

    // Construire et insérer l’appareil
    const wrap = qs('#k169-wrap') || (function(){ const d = document.createElement('div'); d.id='k169-wrap'; d.outerHTML = frameHTML(); return qs('#k169-wrap'); })();
    if (!qs('#k169-wrap')) {
      document.body.insertAdjacentHTML('beforeend', frameHTML());
    }

    // Déplacer le chat réel dans l’écran (pas de clone)
    const cols = qs('#k169-cols');
    cols.appendChild(chat);

    // Appliquer état
    document.documentElement.classList.add('k169');
    applyVars();
    columnize();

    // Observer mutations du chat pour relayout auto
    if (state.mo) state.mo.disconnect();
    state.mo = new MutationObserver(() => queueLayout());
    state.mo.observe(chat, { childList: true, subtree: true, characterData: true });

    // Inputs & horloge
    bindNav();
    updateClock();
    setInterval(updateClock, 30_000);

    state.mounted = true;
  }

  function unmount() {
    if (!state.mounted) return;
    // Rendre le chat à sa place initiale
    if (state.chatEl && state.chatParent) {
      if (state.chatNext && state.chatNext.parentNode === state.chatParent) state.chatParent.insertBefore(state.chatEl, state.chatNext);
      else state.chatParent.appendChild(state.chatEl);
    }
    // Nettoyage
    qs('#k169-wrap')?.remove();
    document.documentElement.classList.remove('k169');
    state.mo?.disconnect();
    state = { ...state, mounted: false, mo: null, page: 0, pages: 1 };
  }

  function applyVars() {
    const s = S();
    if (s.lang) document.documentElement.setAttribute('lang', s.lang);
    document.documentElement.dataset.kTheme = s.theme;
    document.documentElement.style.setProperty('--k-size', `${s.size}px`);
    document.documentElement.style.setProperty('--k-line', String(s.line));
    document.documentElement.style.setProperty('--k-measure', `${Math.max(42, Math.min(90, s.measureCh))}ch`);
    document.documentElement.style.setProperty('--k-pad', `${Math.max(16, Math.min(64, s.pad))}px`);
    document.documentElement.style.setProperty('--k-hyphens', 'auto');
  }

  let layoutTick = null;
  function queueLayout() {
    if (layoutTick) cancelAnimationFrame(layoutTick);
    layoutTick = requestAnimationFrame(columnize);
  }

  function columnize() {
    const chat = state.chatEl;
    const cols = qs('#k169-cols');
    if (!chat || !cols) return;

    // Donner la largeur de colonne = largeur interne de l’écran
    const cw = cols.clientWidth;
    chat.style.columnWidth = `${cw}px`;
    chat.style.columnFill = 'auto';

    // Recalculer pagination
    computePages();
    goTo(state.page);
    layoutTick = null;
  }

  function computePages() {
    const cols = qs('#k169-cols');
    const chat = state.chatEl;
    if (!cols || !chat) { state.page=0; state.pages=1; return; }
    const view = cols.clientWidth || 1;
    const total = chat.scrollWidth || view;
    state.pages = Math.max(1, Math.ceil(total / view));
    state.page = Math.min(state.page, state.pages - 1);
    const pct = ((state.page + 1) / state.pages) * 100;
    const bar = qs('#k169-progress > i'); if (bar) bar.style.width = `${pct}%`;
  }

  function goTo(p) {
    const cols = qs('#k169-cols');
    if (!cols) return;
    state.page = Math.min(Math.max(0, p), state.pages - 1);
    cols.scrollLeft = state.page * cols.clientWidth;
    const pct = ((state.page + 1) / Math.max(1, state.pages)) * 100;
    const bar = qs('#k169-progress > i'); if (bar) bar.style.width = `${pct}%`;
  }

  function updateClock() {
    const el = qs('#k169-clock'); if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateTitle() {
    const t = qs('#k169-title'); if (!t) return;
    const name = qs('#charName')?.textContent?.trim() || 'Lecture';
    t.textContent = name;
  }

  function bindNav() {
    const L = qs('#k169-left'), R = qs('#k169-right');
    L?.addEventListener('click', () => goTo(state.page - 1));
    R?.addEventListener('click', () => goTo(state.page + 1));
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.code === 'KeyK') { toggle(); return; }
      if (!S().enabled) return;
      if (['ArrowRight','PageDown','Space'].includes(e.code)) { e.preventDefault(); goTo(state.page + 1); }
      if (['ArrowLeft','PageUp','Backspace'].includes(e.code)) { e.preventDefault(); goTo(state.page - 1); }
      if (e.code === 'Home') { e.preventDefault(); goTo(0); }
      if (e.code === 'End') { e.preventDefault(); goTo(state.pages - 1); }
    }, { passive: false });
    window.addEventListener('resize', () => queueLayout(), { passive: true });
  }

  function toggle(on) {
    const s = S();
    s.enabled = typeof on === 'boolean' ? on : !s.enabled;
    saveSettingsDebounced();
    if (s.enabled) { mount(); updateTitle(); }
    else { unmount(); }
  }

  function registerSlash() {
    if (!SlashCommandParser || !SlashCommand) return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
      name: 'kindle169',
      returns: 'Mode liseuse 16:9 (takeover)',
      unnamedArgumentList: [ SlashCommandArgument.fromProps({ description:'on|off', typeList: ARGUMENT_TYPE.STRING, isRequired:false }) ],
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ name:'theme', description:'paper|sepia|dark|amoled', typeList: ARGUMENT_TYPE.STRING }),
        SlashCommandNamedArgument.fromProps({ name:'size', description:'taille px', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'line', description:'interligne', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'measure', description:'mesure en ch', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'pad', description:'padding interne px', typeList: ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'lang', description:'langue du document', typeList: ARGUMENT_TYPE.STRING }),
      ],
      callback: (named, unnamed) => {
        const s = S();
        const first = (unnamed && String(unnamed).trim().toLowerCase()) || '';
        if (first === 'on') s.enabled = true;
        else if (first === 'off') s.enabled = false;

        if (named.theme) s.theme = String(named.theme);
        if (named.size) s.size = Number(named.size);
        if (named.line) s.line = Number(named.line);
        if (named.measure) s.measureCh = Number(named.measure);
        if (named.pad) s.pad = Number(named.pad);
        if (named.lang) s.lang = String(named.lang);

        saveSettingsDebounced();
        if (s.enabled) { mount(); applyVars(); queueLayout(); } else { unmount(); }
        return 'Kindle 16:9 mis à jour.';
      },
      helpString: '/kindle169 [on|off] theme=paper|sepia|dark|amoled size=18 line=1.62 measure=66 pad=28 lang=fr'
    }));
  }

  // Boot
  eventSource.on(event_types.APP_READY, () => { if (S().enabled) mount(); registerSlash(); });
  eventSource.on(event_types.CHAT_CHANGED, () => { if (S().enabled) queueLayout(); updateTitle(); });

})();
