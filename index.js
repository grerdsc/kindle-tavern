// SillyTavern Kindle 16:9 — device frame + paginated columns + tap zones
(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, extensionSettings, saveSettingsDebounced } = ctx;

  const MOD = 'kindle_169';
  const S0 = Object.freeze({
    enabled: true,
    theme: 'paper',   // paper|sepia|dark|amoled
    size: 18,         // px
    line: 1.62,
    measureCh: 66,    // typographic measure inside the page content
    margin: 28,       // inner page padding
    lang: 'fr',
  });

  function S() {
    extensionSettings[MOD] ||= structuredClone(S0);
    for (const k of Object.keys(S0)) if (!(k in extensionSettings[MOD])) extensionSettings[MOD][k] = S0[k];
    return extensionSettings[MOD];
  }

  // Create device skeleton once
  function ensureFrame() {
    if (document.getElementById('k169-device')) return;

    const css = `
:root.k169 {
  --k-bg: #faf7ef; --k-fg:#2b2b2b; --k-muted:#efeadc;
  --k-size:18px; --k-line:1.62; --k-measure:66ch; --k-pad:28px;
  --k-justify: justify; --k-hyphens: auto; --k-serif: Georgia,"Times New Roman",serif;
}
:root.k169[data-k-theme="sepia"]  { --k-bg:#f5ecd9; --k-fg:#2a2a2a; --k-muted:#e9ddc4; }
:root.k169[data-k-theme="dark"]   { --k-bg:#111113; --k-fg:#e8e6e3; --k-muted:#1a1a1b; }
:root.k169[data-k-theme="amoled"] { --k-bg:#000000; --k-fg:#e8e6e3; --k-muted:#0a0a0a; }

html.k169, html.k169 body { background: var(--k-bg) !important; color: var(--k-fg) !important; }

#k169-wrap {
  position: fixed; inset: 0; display: grid; place-items: center; z-index: 9990; pointer-events: none;
}
#k169-device {
  pointer-events: auto;
  aspect-ratio: 16 / 9;
  width: min(95vw, 1400px);
  background: #0a0a0a;
  border-radius: 22px;
  box-shadow: 0 12px 40px rgba(0,0,0,.45);
  padding: 18px;
  display: grid;
  grid-template-rows: 1fr;
}
#k169-screen {
  background: var(--k-bg);
  border-radius: 14px;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 0 0 2px rgba(0,0,0,.08);
  display: grid;
  grid-template-rows: 44px 1fr 36px;
  overflow: hidden;
}
#k169-head, #k169-foot {
  display: grid; align-items: center;
  padding: 0 16px; color: var(--k-fg);
  font: 600 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: color-mix(in srgb, var(--k-bg) 90%, var(--k-fg));
}
#k169-head { grid-template-columns: 1fr auto; }
#k169-foot { grid-template-columns: 1fr; }
#k169-progress {
  height: 4px; width: 100%; background: color-mix(in srgb, var(--k-fg) 12%, transparent);
  border-radius: 999px; overflow: hidden;
}
#k169-progress > i { display: block; height: 100%; width: 0%; background: var(--k-fg); }

#k169-body {
  position: relative; overflow: hidden;
  padding: var(--k-pad);
}

/* Chat becomes paginated content */
#k169-content {
  height: 100%; width: 100%;
  overflow: hidden; /* hide extra columns */
  color: var(--k-fg);
}
#k169-content > .k-flow {
  /* The multi-column scroller */
  height: 100%; width: 100%;
  column-gap: 2.2rem;
  /* column-width set by JS to the inner page width */
  /* column-fill: balance;  not widely applied for scrolling, JS handles pages */
  font-family: var(--k-serif) !important;
  font-size: var(--k-size) !important;
  line-height: var(--k-line) !important;
  text-align: var(--k-justify) !important;
  hyphens: var(--k-hyphens) !important;
  -webkit-hyphens: var(--k-hyphens) !important;
  letter-spacing: 0em; word-spacing: 0em;
}
#k169-content .st-page-block {
  break-inside: avoid;
  margin: 0 0 0.9em 0;
}

/* Overlay tap zones */
#k169-left, #k169-right {
  position: absolute; top: 0; bottom: 0; width: 22%;
  z-index: 3; cursor: pointer; opacity: 0;
}
#k169-left  { left: 0; }
#k169-right { right: 0; }

/* Hide native bubbles inside reading mode */
html.k169 .mes, html.k169 .message, html.k169 .assistantMessage, html.k169 .userMessage {
  background: transparent !important; border: 0 !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important;
}
`.trim();

    const style = document.createElement('style'); style.id = 'k169-style'; style.textContent = css; document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'k169-wrap';
    wrap.innerHTML = `
      <div id="k169-device">
        <div id="k169-screen">
          <div id="k169-head"><div id="k169-title">Chapitre</div><div id="k169-clock">—:—</div></div>
          <div id="k169-body">
            <div id="k169-content">
              <div class="k-flow"></div>
              <div id="k169-left" title="Page précédente"></div>
              <div id="k169-right" title="Page suivante"></div>
            </div>
          </div>
          <div id="k169-foot"><div id="k169-progress"><i></i></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  // Move/clone chat text into the paginated flow
  function extractBlocks() {
    const root = document.querySelector('#chat') || document.querySelector('.chat');
    const nodes = root ? Array.from(root.querySelectorAll('.mes_text, .markdown, .assistantMessage .text, .userMessage .text')) : [];
    const frag = document.createDocumentFragment();
    for (const n of nodes) {
      const div = document.createElement('div');
      div.className = 'st-page-block';
      // clone textual HTML to preserve basic formatting
      div.innerHTML = n.innerHTML;
      frag.appendChild(div);
    }
    return frag;
  }

  function layout() {
    const s = S();
    // Language for hyphenation
    if (s.lang) document.documentElement.setAttribute('lang', s.lang);
    document.documentElement.classList.toggle('k169', !!s.enabled);
    document.documentElement.dataset.kTheme = s.theme;

    // Vars
    document.documentElement.style.setProperty('--k-size', `${s.size}px`);
    document.documentElement.style.setProperty('--k-line', String(s.line));
    document.documentElement.style.setProperty('--k-measure', `${Math.max(42, Math.min(90, s.measureCh))}ch`);
    document.documentElement.style.setProperty('--k-pad', `${Math.max(16, Math.min(64, s.margin))}px`);
    document.documentElement.style.setProperty('--k-hyphens', 'auto');

    // Fill flow
    const flow = document.querySelector('#k169-content .k-flow');
    if (!flow) return;
    flow.innerHTML = '';
    flow.appendChild(extractBlocks());

    // Column width = inner content width
    const content = document.getElementById('k169-content');
    // allow layout to settle
    requestAnimationFrame(() => {
      const w = content.clientWidth; // page inner width
      flow.style.columnWidth = `${w}px`;
      paginate(0);
      updateClock();
      updateTitle();
    });
  }

  let page = 0, pages = 1;
  function computePages() {
    const flow = document.querySelector('#k169-content .k-flow');
    if (!flow) return { page: 0, pages: 1 };
    const cw = flow.clientWidth || 1;
    const sw = flow.scrollWidth || cw;
    const total = Math.max(1, Math.ceil(sw / cw));
    return { page: Math.min(page, total - 1), pages: total };
  }

  function paginate(next = 0) {
    const flow = document.querySelector('#k169-content .k-flow');
    if (!flow) return;
    const info = computePages();
    pages = info.pages;
    page = Math.min(Math.max(0, next), pages - 1);
    flow.scrollLeft = page * flow.clientWidth;
    const pct = ((page + 1) / pages) * 100;
    const bar = document.querySelector('#k169-progress > i');
    if (bar) bar.style.width = `${pct}%`;
  }

  function updateClock() {
    const el = document.getElementById('k169-clock');
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function updateTitle() {
    const t = document.getElementById('k169-title');
    if (!t) return;
    // Simple heuristic: use current character or “Lecture”
    const name = document.querySelector('#charName')?.textContent?.trim() || 'Lecture';
    t.textContent = name;
  }

  function bindInputs() {
    const L = document.getElementById('k169-left');
    const R = document.getElementById('k169-right');
    L?.addEventListener('click', () => paginate(page - 1));
    R?.addEventListener('click', () => paginate(page + 1));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') paginate(page - 1);
      if (e.key === 'ArrowRight') paginate(page + 1);
    }, { passive: true });
    window.addEventListener('resize', () => layout(), { passive: true });
    setInterval(updateClock, 30_000);
  }

  function apply() {
    ensureFrame();
    layout();
  }
  function saveAndApply() { saveSettingsDebounced(); apply(); }

  // Initial boot and reflow on chat updates
  eventSource.on(event_types.APP_READY, () => { apply(); bindInputs(); });
  eventSource.on(event_types.CHAT_CHANGED, apply);
})();
