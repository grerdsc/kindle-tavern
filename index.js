(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, extensionSettings, saveSettingsDebounced, SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;

  const MOD = 'kindle169_pro';
  const DEF = Object.freeze({ enabled:true, theme:'paper', size:18, line:1.62, measureCh:66, pad:28, lang:'fr' });
  let st = { mounted:false, mo:null, ro:null, chat:null, parent:null, next:null, input:null, inputParent:null, inputNext:null, page:0, pages:1 };

  function S(){ extensionSettings[MOD] ||= structuredClone(DEF); for(const k in DEF){ if(!(k in extensionSettings[MOD])) extensionSettings[MOD][k]=DEF[k]; } return extensionSettings[MOD]; }
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
#k169-screen { background: var(--k-bg); border-radius: 14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 0 0 2px rgba(0,0,0,.08); display: grid; grid-template-rows: 58px 1fr 44px; overflow: hidden; }

/* Barre haute: pages + heure */
#k169-head { display:grid; grid-template-columns: 1fr auto; align-items:center; gap:12px; padding: 10px 16px; background: color-mix(in srgb, var(--k-bg) 90%, var(--k-fg)); color: var(--k-fg); font: 600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
#k169-tabs { display:flex; gap:6px; overflow:auto; scrollbar-width:none; }
#k169-tabs::-webkit-scrollbar{ display:none; }
#k169-tabs button { min-width:32px; height:24px; padding:0 8px; border-radius:6px; border:1px solid color-mix(in srgb, var(--k-fg) 20%, transparent); background: var(--k-bg); color: var(--k-fg); cursor:pointer; font: 600 12px/1 system-ui; }
#k169-tabs button[aria-current="page"] { background: var(--k-fg); color: var(--k-bg); }
#k169-clock { opacity:.85; }

#k169-body { position:relative; overflow:hidden; padding: var(--k-pad); }
#k169-cols { position:relative; height:100%; width:100%; overflow:auto; scrollbar-width:none; }
#k169-cols::-webkit-scrollbar{ display:none; }

/* Le chat réel devient le flux paginé */
#k169-cols > #chat{
  height:100%;
  column-gap: 2.2rem;
  font-family: var(--k-serif) !important;
  font-size: var(--k-size) !important;
  line-height: var(--k-line) !important;
  text-align: var(--k-justify) !important;
  hyphens: var(--k-hyphens) !important; -webkit-hyphens: var(--k-hyphens) !important;
  color: var(--k-fg) !important;
}

/* Rendu littéraire */
#k169-cols #chat .mes, #k169-cols #chat .message, #k169-cols #chat .assistantMessage, #k169-cols #chat .userMessage { background:transparent !important; border:0 !important; box-shadow:none !important; padding:0 !important; margin:0 0 0.9em 0 !important; }
#k169-cols #chat .markdown p { margin: 0 0 0.9em 0 !important; text-indent: 1.5em; }
#k169-cols #chat .markdown p:first-of-type { text-indent: 0; }
#k169-cols #chat .markdown p:first-of-type::first-letter {
  float:left; font-size: 2.6em; line-height: 0.85; padding-right: 0.08em; margin-top: 0.05em; font-weight: 600;
}
#k169-cols #chat h1, #k169-cols #chat h2 { font-variant: small-caps; letter-spacing: .02em; margin: 1.2em 0 .6em 0 !important; }

/* Zones page gauche/droite */
#k169-left,#k169-right { position:absolute; top:0; bottom:0; width:22%; z-index:3; cursor:pointer; opacity:0; }
#k169-left{ left:0; } #k169-right{ right:0; }

/* Pied: compositeur intégré */
#k169-foot { display:grid; grid-template-columns: 1fr; align-items:center; padding: 6px 10px; background: color-mix(in srgb, var(--k-bg) 92%, var(--k-fg)); }
#k169-progress { height:4px; width:100%; background: color-mix(in srgb, var(--k-fg) 12%, transparent); border-radius:999px; overflow:hidden; }
#k169-progress > i { display:block; height:100%; width:0%; background: var(--k-fg); }

/* Masquer UI hors lecture */
html.k169 .sidebar, html.k169 #top_bar { display:none !important; }
`.trim();
    const tag = document.createElement('style'); tag.id='k169-style'; tag.textContent = css; document.head.appendChild(tag);
  }

  function frameHTML(){
    return `
<div id="k169-wrap">
  <div id="k169-device">
    <div id="k169-screen">
      <div id="k169-head"><div id="k169-tabs" role="tablist" aria-label="Pages"></div><div id="k169-clock">--:--</div></div>
      <div id="k169-body"><div id="k169-cols"></div><div id="k169-left" title="Page précédente"></div><div id="k169-right" title="Page suivante"></div></div>
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

  // Typographie FR: entrée/sortie (guillemets, espaces insécables, tirets, ellipses)
  function smartFr(txt){
    if (!txt) return txt;
    return String(txt)
      .replace(/\\.{3}/g,'…')
      .replace(/\\s-\\s/g,' — ')
      .replace(/\"([^\"]*)\"/g,'« $1 »')
      .replace(/\\s([\\!\\?\\:\\;])/g,' $1')
      .replace(/\\s(»)/g,' $1')
      .replace(/(«)\\s/g,'$1 ')
      .replace(/'/g,'’');
  }

  function beautifyComposer(){
    const composer = document.querySelector('[data-testid="composer"]') || document.getElementById('send_form');
    if (!composer || st.input) return;
    st.input = composer; st.inputParent = composer.parentNode; st.inputNext = composer.nextSibling;
    $('#k169-foot').appendChild(composer);
    // Pré-typo à l’envoi (Enter sans Shift)
    const textarea = composer.querySelector('textarea, [contenteditable="true"]');
    if (textarea) {
      textarea.addEventListener('keydown', (e)=>{
        if (e.key === 'Enter' && !e.shiftKey) {
          if (textarea.value) textarea.value = smartFr(textarea.value);
          if (textarea.textContent) textarea.textContent = smartFr(textarea.textContent);
        }
      }, { capture:true });
    }
  }

  // Post-traitement typographique des nouveaux messages
  function beautifyRendered(root){
    const blocks = root.querySelectorAll('.markdown, .mes_text, .assistantMessage .text, .userMessage .text');
    blocks.forEach(b=>{
      // Évite la répétition: marqueur data-attr
      if (b.dataset.kTypo === '1') return;
      b.innerHTML = smartFr(b.innerHTML);
      b.dataset.kTypo = '1';
    });
  }

  function buildTabs(){
    const tabs = $('#k169-tabs'); if (!tabs) return;
    tabs.innerHTML = '';
    const maxToShow = 18;
    const total = st.pages;
    function addBtn(n,label=n+1){
      const btn = document.createElement('button');
      btn.type='button'; btn.textContent=String(label);
      btn.setAttribute('aria-current', n===st.page ? 'page' : 'false');
      btn.addEventListener('click', ()=> goTo(n));
      tabs.appendChild(btn);
    }
    if (total <= maxToShow){
      for (let i=0;i<total;i++) addBtn(i);
    } else {
      const win = 4, start = Math.max(0, st.page - win), end = Math.min(total-1, st.page + win);
      addBtn(0,1);
      if (start > 1) addBtn(Math.max(1, start-1), '…');
      for (let i=start;i<=end;i++) addBtn(i);
      if (end < total-2) addBtn(Math.min(total-2, end+1), '…');
      addBtn(total-1,total);
    }
    tabs.scrollLeft = Math.max(0, (st.page-2) * 40);
  }

  function mount(){
    if (st.mounted) return;
    injectCSS();
    const chat = $('#chat') || $('.chat'); if (!chat) return;
    st.chat = chat; st.parent = chat.parentNode; st.next = chat.nextSibling;

    document.body.insertAdjacentHTML('beforeend', frameHTML());
    document.documentElement.classList.add('k169'); applyVars();

    $('#k169-cols').appendChild(chat);
    beautifyComposer();

    st.ro = new ResizeObserver(()=> columnize()); st.ro.observe($('#k169-cols'));
    st.mo = new MutationObserver((muts)=>{
      columnize();
      muts.forEach(m=> m.addedNodes?.forEach(node=> node.nodeType===1 && beautifyRendered(node)));
    });
    st.mo.observe(chat, { childList:true, subtree:true, characterData:true });

    bindNav(); updateClock(); setInterval(updateClock, 30_000);
    columnize(); beautifyRendered(chat);
    st.mounted = true;
  }

  function unmount(){
    if (!st.mounted) return;
    st.mo?.disconnect(); st.ro?.disconnect();
    if (st.chat && st.parent){
      if (st.next && st.next.parentNode===st.parent) st.parent.insertBefore(st.chat, st.next);
      else st.parent.appendChild(st.chat);
    }
    if (st.input && st.inputParent){
      if (st.inputNext && st.inputNext.parentNode===st.inputParent) st.inputParent.insertBefore(st.input, st.inputNext);
      else st.inputParent.appendChild(st.input);
    }
    $('#k169-wrap')?.remove();
    document.documentElement.classList.remove('k169');
    st = { ...st, mounted:false, mo:null, ro:null, input:null, inputParent:null, inputNext:null, page:0, pages:1 };
  }

  function columnize(){
    const cols = $('#k169-cols'); const chat = st.chat; if (!cols || !chat) return;
    const w = cols.clientWidth || 1;
    chat.style.columnWidth = `${w}px`;
    chat.style.columnFill = 'auto';
    const total = chat.scrollWidth || w;
    st.pages = Math.max(1, Math.ceil(total / w));
    st.page = Math.min(st.page, st.pages - 1);
    goTo(st.page);
    buildTabs();
  }

  function goTo(p){
    const cols = $('#k169-cols'); if (!cols) return;
    st.page = Math.min(Math.max(0, p), st.pages - 1);
    cols.scrollLeft = st.page * cols.clientWidth;
    const pct = ((st.page + 1) / Math.max(1, st.pages)) * 100;
    const bar = $('#k169-progress > i'); if (bar) bar.style.width = `${pct}%`;
    buildTabs();
  }

  function updateClock(){ const el=$('#k169-clock'); if(!el) return; el.textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
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

  function applyVarsAndRelayout(){ applyVars(); columnize(); saveSettingsDebounced(); }
  function toggle(on){ const s=S(); s.enabled = typeof on==='boolean'? on : !s.enabled; saveSettingsDebounced(); s.enabled? mount() : unmount(); }

  function registerSlash(){
    if (!SlashCommandParser || !SlashCommand) return;
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
      name:'kindle169', returns:'Mode liseuse 16:9 avec pagination et typo FR',
      unnamedArgumentList:[ SlashCommandArgument.fromProps({ description:'on|off', typeList:ARGUMENT_TYPE.STRING }) ],
      namedArgumentList:[
        SlashCommandNamedArgument.fromProps({ name:'theme', description:'paper|sepia|dark|amoled', typeList:ARGUMENT_TYPE.STRING }),
        SlashCommandNamedArgument.fromProps({ name:'size', description:'px', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'line', description:'line-height', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'measure', description:'ch', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'pad', description:'padding px', typeList:ARGUMENT_TYPE.NUMBER }),
        SlashCommandNamedArgument.fromProps({ name:'lang', description:'fr|en|…', typeList:ARGUMENT_TYPE.STRING })
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
        s.enabled? (mount(), applyVarsAndRelayout()) : unmount();
        return 'Kindle 16:9 mis à jour.';
      },
      helpString:'/kindle169 [on|off] theme=paper|sepia|dark|amoled size=18 line=1.62 measure=66 pad=28 lang=fr'
    }));
  }

  eventSource.on(event_types.APP_READY, ()=>{ try{ if(S().enabled) mount(); registerSlash(); }catch(e){ console.error('kindle169 init error', e); }});
  eventSource.on(event_types.CHAT_CHANGED, ()=>{ try{ if(S().enabled){ columnize(); } }catch(e){ console.error('kindle169 chat_changed error', e); }});
})();
