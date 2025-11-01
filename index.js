(function () {
  const MODULE = 'kindle_reader';
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

  const defaults = Object.freeze({
    enabled: false,
    theme: 'paper', // paper | sepia | dark
    fontSize: 18,   // px
    lineHeight: 1.6,
    margin: 64,     // px
    justify: true,
    hyphen: true,
    serif: 'Georgia, "Times New Roman", serif',
  });

  function getSettings() {
    if (!extensionSettings[MODULE]) {
      extensionSettings[MODULE] = structuredClone(defaults);
    }
    // Ensure keys exist after updates
    for (const k of Object.keys(defaults)) {
      if (!Object.hasOwn(extensionSettings[MODULE], k)) {
        extensionSettings[MODULE][k] = defaults[k];
      }
    }
    return extensionSettings[MODULE];
  }

  function setVar(name, value) {
    document.documentElement.style.setProperty(name, value);
  }

  function applySettings() {
    const s = getSettings();
    document.documentElement.classList.toggle('kindle-mode', !!s.enabled);
    document.documentElement.dataset.kindleTheme = s.theme;
    setVar('--kindle-font-size', `${s.fontSize}px`);
    setVar('--kindle-line-height', String(s.lineHeight));
    setVar('--kindle-margin', `${s.margin}px`);
    setVar('--kindle-justify', s.justify ? 'justify' : 'start');
    setVar('--kindle-hyphen', s.hyphen ? 'auto' : 'manual');
    setVar('--kindle-serif', s.serif);
  }

  function saveAndApply() {
    saveSettingsDebounced();
    applySettings();
  }

  function buildToggleUI() {
    if (document.getElementById('kindle-toggle')) return;

    const btn = document.createElement('button');
    btn.id = 'kindle-toggle';
    btn.type = 'button';
    btn.textContent = 'Kindle';
    btn.title = 'Basculer le mode liseuse';
    btn.className = 'kindle-toggle-btn';
    btn.addEventListener('click', () => {
      const s = getSettings();
      s.enabled = !s.enabled;
      saveAndApply();
    });

    // Mini panneau
    const panel = document.createElement('div');
    panel.id = 'kindle-panel';
    panel.className = 'kindle-panel';
    panel.innerHTML = `
      <label>Thème
        <select id="kp-theme">
          <option value="paper">Papier</option>
          <option value="sepia">Sépia</option>
          <option value="dark">Noir</option>
        </select>
      </label>
      <label>Taille (px)
        <input id="kp-size" type="number" min="12" max="28" step="1">
      </label>
      <label>Interligne
        <input id="kp-line" type="number" min="1.2" max="2.0" step="0.05">
      </label>
      <label>Marges (px)
        <input id="kp-margin" type="number" min="24" max="120" step="4">
      </label>
      <label>Justifier
        <input id="kp-justify" type="checkbox">
      </label>
      <label>Césure
        <input id="kp-hyphen" type="checkbox">
      </label>
      <label>Police serif
        <input id="kp-serif" type="text" placeholder='Georgia, "Times New Roman", serif'>
      </label>
    `;

    function syncPanel() {
      const s = getSettings();
      panel.querySelector('#kp-theme').value = s.theme;
      panel.querySelector('#kp-size').value = s.fontSize;
      panel.querySelector('#kp-line').value = s.lineHeight;
      panel.querySelector('#kp-margin').value = s.margin;
      panel.querySelector('#kp-justify').checked = !!s.justify;
      panel.querySelector('#kp-hyphen').checked = !!s.hyphen;
      panel.querySelector('#kp-serif').value = s.serif;
    }

    function bindInputs() {
      panel.querySelector('#kp-theme').addEventListener('change', e => { getSettings().theme = e.target.value; saveAndApply(); });
      panel.querySelector('#kp-size').addEventListener('input', e => { getSettings().fontSize = Math.max(12, Math.min(28, Number(e.target.value)||18)); saveAndApply(); });
      panel.querySelector('#kp-line').addEventListener('input', e => { getSettings().lineHeight = Math.max(1.1, Math.min(2.2, Number(e.target.value)||1.6)); saveAndApply(); });
      panel.querySelector('#kp-margin').addEventListener('input', e => { getSettings().margin = Math.max(12, Math.min(160, Number(e.target.value)||64)); saveAndApply(); });
      panel.querySelector('#kp-justify').addEventListener('change', e => { getSettings().justify = !!e.target.checked; saveAndApply(); });
      panel.querySelector('#kp-hyphen').addEventListener('change', e => { getSettings().hyphen = !!e.target.checked; saveAndApply(); });
      panel.querySelector('#kp-serif').addEventListener('change', e => { getSettings().serif = e.target.value || defaults.serif; saveAndApply(); });
    }

    document.body.appendChild(btn);
    document.body.appendChild(panel);
    syncPanel();
    bindInputs();

    // Ouvrir/fermer le panneau au survol/clic
    let open = false;
    function setOpen(v) {
      open = v;
      panel.classList.toggle('open', open);
    }
    btn.addEventListener('mouseenter', () => setOpen(true));
    btn.addEventListener('mouseleave', () => setOpen(false));
    panel.addEventListener('mouseenter', () => setOpen(true));
    panel.addEventListener('mouseleave', () => setOpen(false));
  }

  function registerSlashCommand() {
    // /kindle on|off theme=paper|sepia|dark size=18 line=1.6 margin=64 justify=on|off hyphen=on|off serif="..."
    if (!SlashCommandParser || !SlashCommand) return;

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
      name: 'kindle',
      aliases: ['reader'],
      returns: 'Configure le mode liseuse',
      unnamedArgumentList: [
        SlashCommandArgument.fromProps({
          description: 'on/off (optionnel)',
          typeList: ARGUMENT_TYPE.STRING,
          isRequired: false,
        }),
      ],
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({ name: 'theme', description: 'paper|sepia|dark', typeList: ARGUMENT_TYPE.STRING, defaultValue: 'paper' }),
        SlashCommandNamedArgument.fromProps({ name: 'size', description: 'taille px', typeList: ARGUMENT_TYPE.NUMBER, defaultValue: '18' }),
        SlashCommandNamedArgument.fromProps({ name: 'line', description: 'interligne', typeList: ARGUMENT_TYPE.NUMBER, defaultValue: '1.6' }),
        SlashCommandNamedArgument.fromProps({ name: 'margin', description: 'marges px', typeList: ARGUMENT_TYPE.NUMBER, defaultValue: '64' }),
        SlashCommandNamedArgument.fromProps({ name: 'justify', description: 'on/off', typeList: ARGUMENT_TYPE.BOOLEAN, defaultValue: 'on', enumList: ['on','off'] }),
        SlashCommandNamedArgument.fromProps({ name: 'hyphen', description: 'on/off', typeList: ARGUMENT_TYPE.BOOLEAN, defaultValue: 'on', enumList: ['on','off'] }),
        SlashCommandNamedArgument.fromProps({ name: 'serif', description: 'pile de polices serif', typeList: ARGUMENT_TYPE.STRING, defaultValue: 'Georgia, \"Times New Roman\", serif' }),
      ],
      callback: (named, unnamed) => {
        const s = getSettings();
        const first = (unnamed && String(unnamed).trim().toLowerCase()) || '';
        if (first === 'on') s.enabled = true;
        if (first === 'off') s.enabled = false;

        if (named.theme) s.theme = String(named.theme);
        if (named.size) s.fontSize = Number(named.size);
        if (named.line) s.lineHeight = Number(named.line);
        if (named.margin) s.margin = Number(named.margin);
        if (typeof named.justify !== 'undefined') s.justify = String(named.justify) === 'on' || named.justify === true;
        if (typeof named.hyphen !== 'undefined') s.hyphen = String(named.hyphen) === 'on' || named.hyphen === true;
        if (named.serif) s.serif = String(named.serif);

        saveAndApply();
        return 'Kindle mode mis à jour.';
      },
      helpString: `
        <div><strong>/kindle</strong> [on|off] theme=paper|sepia|dark size=18 line=1.6 margin=64 justify=on|off hyphen=on|off serif="Georgia, 'Times New Roman', serif"</div>
      `,
    }));
  }

  // Init
  eventSource.on(event_types.APP_READY, () => {
    buildToggleUI();
    applySettings();
    registerSlashCommand();
  });

  // Réappliquer sur changement de chat (styles sont globaux mais safe)
  eventSource.on(event_types.CHAT_CHANGED, () => applySettings());
})();
