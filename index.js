(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, extensionSettings, saveSettingsDebounced, SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;

  const MOD = 'kindle169_takeover';
  const DEF = Object.freeze({ enabled: true, theme: 'paper', size: 18, line: 1.62, measureCh: 66, pad: 28, lang: 'fr' });
  let st = { mounted: false, mo: null, ro: null, chat: null, parent: null, next: null, page: 0, pages: 1 };

  function S(){ extensionSettings[MOD] ||= structuredClone(DEF); for (const k in DEF) if(!(k in extensionSettings[MOD])) extensionSettings[MOD][k]=DEF[k]; return extensionSettings[MOD]; }
  const $ = s => document.querySelector(s);

  function injectCSS(){
    if ($('#k169-style')) return;
    const css = `
:root.k169 { --k-bg:#faf7ef; --k-fg:#2b2b2b; --k-muted:#efeadc; --k-size:18px; --k-line:1.62; --k-measure:66ch; --k-pad:28px; --k-justify:justify; --k-hyphens:auto; --k-serif: Georgia,"Times New Roman",serif; }
:root.k169[data-k-theme="sepia"]{ --k-bg:#f5ecd9; --k-fg:#2a2a2a; --k-muted:#e9ddc4; }
:root.k169[data-k-theme="dark"] { --k-bg:#111113; --k-fg:#e8e6e3; --k-muted:#1a1a1b; }
:root.k169[data-k-theme="amoled"]{ --k-bg:#000000; --k-fg:#e8e6e3; --k-muted:#0a0a0a; }
html.k169, html.k169 body { background: var(--k-bg) !important; color: var(--k-fg) !important; }

#k169-wrap { position: fixed; inset: 0; display: grid; place-items: center; z-index: 9990; pointer-events: none; }
#k169-device { pointer-events: auto; aspect-ratio: 16/9; width: min(95vw, 1400px); background: #0a0a0a; border-radius: 22px; box-shadow: 0 12px 40px rgba(0,0,0,.45); padding: 18px; display: grid; }
#k169-screen { background: var(--k-bg); border-radius: 14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 0 0 2px rgba(0,0,0,.08); display: grid; grid-template-rows: 44px 1fr 36px; overflow: hidden; }
#k169-head,#k169-foot { display: grid; align-items:center; padding:0 16px; color:var(--k-fg); font:600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; background: color-mix(in srgb, var(--k-bg) 90%, var(--k-fg)); }
#k169-head { grid-template-columns: 1fr auto; }
#k169-progress { height:4px; width:100%; background: color-mix(in srgb, var(--k-fg) 12%, transparent); border-radius:999px; overflow:hidden; }
#k169-progress > i { display:block; height:100%; width:0%; background: var(--k-fg); }
#k169-body { position:relative; overflow:hidden; padding: var(--k-pad); }

#k169-cols { position:relative; height:100%; width:100%; overflow:auto; scrollbar-width:none; }
#k169-cols::-webkit-scrollbar{ display:none; }

#k169-cols > #chat {
  height:100%;
  column-gap: 2.2rem;
  font-family: var(--k-serif) !important;
  font-size: var(--k-size) !important;
  line-height: var(--k-line) !important;
  text-align: var(--k-justify) !important;
  hyphens: var(--k-hyphens) !important; -webkit-hyphens: var(--k-hyphens) !important;
  color: var(--k-fg) !important;
}
#k169-cols #chat .mes, #k169-cols #chat .message, #k169-cols #chat .assistantMessage, #k169-cols #chat .userMessage { background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; margin:0 0 0.9em 0 !important; }
#k169-cols #chat .mes_text, #k169-cols #chat .markdown, #k169-cols #chat .assistantMessage .text { color: var(--k-fg) !important; }

#k169-left,#k169-right { position:absolute; top:0; bottom:0; width:22%; z-index:3; cursor:pointer; opacity:0; }
#k169-left{ left:0; } #k169-right{ right:0; }

html.k169 .sidebar, html.k169 #top_bar, html.k169 #send_form, html.k169 .input-form, html.k169 [data-testid="composer"] { display:none !important; }
`.trim();
    const tag = document.createElement('style'); tag.id='k169-style'; tag.textContent = css; document.head.appendChild(tag);
  }

  function frameHTML(){
    return `
<div id="k169-wrap">
  <div id="k169-device">
    <div id="k169-screen">
      <div id="k169-head"><div id="k169-title">Lecture</div><div id="k169-clock">--:--</div></div>
      <div id="k169-body"><div id="k169-cols"></div><div id="k169-left"></div><div id="k169-right"></div></div>
      <div id="k169-foot"><div id="k169-progress"><i></i></div></div>
    </div>
  </div>
</div>`;
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

  function mount() {
    if (st.mounted) return;
    injectCSS();

    const chat = $('#chat') || $('.chat'); if (!chat) return;
    st.chat = chat; st.parent = chat.parentNode; st.next = chat.nextSibling;

    document.body.insertAdjacentHTML('beforeend', frameHTML());
    document.documentElement.classList.add('k169');
    applyVars();

    const cols = $('#k169-cols'); cols.appendChild(chat);

    st.ro = new ResizeObserver(() => columnize()); st.ro.observe(cols);
    st.mo = new MutationObserver(() => columnize()); st.mo.observe(chat, { childList:true, subtree:true, characterData:true });

    bindNav();
    updateTitle(); updateClock(); setInterval(updateClock, 30_000);
    columnize();
    st.mounted = true;
  }

  function unmount() {
    if (!st.mounted) return;
    st.mo?.disconnect(); st.ro?.disconnect();
    if (st.chat && st.parent) { if (st.next && st.next.parentNode===st.parent) st.parent.insertBefore(st.chat, st.next); else st.parent.appendChild(st.chat); }
    $('#k169-wrap')?.remove();
    document.documentElement.classList.remove('k169');
    st = { ...st, mounted:false, mo:null, ro:null, page:0, pages:1 };
  }

  function columnize() {
    const cols = $('#k169-cols'); const chat = st.chat; if (!cols || !chat) return;
    const w = cols.clientWidth || 1;
    chat.style.columnWidth = `${w}px`;
    chat.style.columnFill = 'auto';

    const total = chat.scrollWidth || w;
    st.pages = Math.max(1, Math.ceil(total / w));
    st.page = Math.min(st.page, st.pages - 1);
    goTo(st.page);
  }

  function goTo(p) {
    const cols = $('#k169-cols'); if (!cols) return;
    st.page = Math.min(Math.max(0, p), st.pages - 1);
    cols.scrollLeft = st.page * cols.clientWidth;
    const pct = ((st.page + 1) / Math.max(1, st.pages)) * 100;
    const bar = $('#k169-progress > i'); if (bar) bar.style.width = `${pct}%`;
  }

  function updateClock(){ const el=$('#k169-clock'); if(!el) return; el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
  function updateTitle(){ const t=$('#k169-title'); if(!t) return; t.textContent = (document.querySelector('#charName')?.textContent?.trim()) || 'Lecture'; }

  function bindNav(){
    $('#k169-left')?.addEventListener('click', ()=>goTo(st.page-1));
    $('#k169-right')?.addEventListener('click', ()=>goTo(st.page+1));
    window.addEventListener('keydown', (e)=>{
      if (e.altKey && e.code==='KeyK'){ toggle(); return; }
      if (!S().enabled) return;
      if (['ArrowRight','PageDown','Space'].includes(e.code)){ e.preventDefault(); goTo(st.page+1); }
      if (['ArrowLeft','PageUp','Backspace'].includes(e.code)){ e.preventDefault(); goTo(st.page-1); }
      if (e.code==='Home'){ e.preventDefault(); goTo(0); }
      if (e.code==='End'){ e.preventDefault(); goTo(st.pages-1); }
    }, { passive:false });
    window.addEventListener('resize', ()=>columnize(), { passive:true });
  }

  function toggle(on){
    const s = S(); s.enabled = typeof on==='boolean' ? on : !s.enabled; saveSettingsDebounced();
    if (s.enabled) mount(); else unmount();
  }

  function registerSlash(){
    if (!SlashCommandParser || !SlashCommand) return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
      name:'kindle169', returns:'Mode liseuse 16:9 (takeover)',
      unnamedArgumentList:[ SlashCommandArgument.fromProps({ description:'on|off', typeList:ARGUMENT_TYPE.STRING }) ],
      namedArgumentList:[
        SlashCommandNamedArgument.fromProps({ name:'theme', description:'paper|sepia|dark|amoled', typeList:ARGUMENT_TYPE.STRING }),
        SlashCommandNamedArgument.fromProps({ name:'size', description:'px', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'line', description:'line-height', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'measure', description:'ch', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'pad', description:'padding px', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'lang', description:'fr|en|...', typeList:ARGUMENT_TYPE.STRING }),
      ],
      callback:(named, unnamed)=>{
        const s=S(); const first=(unnamed && String(unnamed).trim().toLowerCase())||'';
        if(first==='on') s.enabled=true; else if(first==='off') s.enabled=false;
        if(named.theme) s.theme=String(named.theme);
        if(named.size) s.size=Number(named.size);
        if(named.line) s.line=Number(named.line);
        if(named.measure) s.measureCh=Number(named.measure);
        if(named.pad) s.pad=Number(named.pad);
        if(named.lang) s.lang=String(named.lang);
        saveSettingsDebounced(); s.enabled ? (mount(), applyVars(), columnize()) : unmount(); return 'Kindle 16:9 mis à jour.';
      },
      helpString:'/kindle169 [on|off] theme=paper|sepia|dark|amoled size=18 line=1.62 measure=66 pad=28 lang=fr'
    }));
  }

  eventSource.on(event_types.APP_READY, ()=>{ try { if(S().enabled) mount(); registerSlash(); } catch(e){ console.error('kindle169 init error', e); } });
  eventSource.on(event_types.CHAT_CHANGED, ()=>{ try { if(S().enabled) columnize(); updateTitle(); } catch(e){ console.error('kindle169 chat_changed error', e); } });
})();
