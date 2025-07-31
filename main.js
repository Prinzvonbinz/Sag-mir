(() => {
  const textInput = document.getElementById('textInput');
  const speakBtn = document.getElementById('speakBtn');
  const saveBtn = document.getElementById('saveBtn');
  const savedListEl = document.getElementById('savedList');
  const lastSavedContainer = document.getElementById('lastSavedContainer');
  const clearSavedBtn = document.getElementById('clearSaved');
  const toggleDarkModeBtn = document.getElementById('toggleDarkMode');

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalButtons = document.getElementById('modalButtons');
  const modalClose = document.getElementById('modalClose');

  // Einstellungen
  let settings = {
    voiceGender: 'female',  // male or female
    language: 'de-DE',       // Default Deutsch
    emotion: 'neutral',      // neutral, happy, sad, angry
    darkMode: false,
  };

  // LocalStorage Keys
  const STORAGE_KEYS = {
    savedSentences: 'sag_es_mir_saved_sentences',
    settings: 'sag_es_mir_settings',
  };

  // Load settings
  function loadSettings() {
    const s = localStorage.getItem(STORAGE_KEYS.settings);
    if (s) {
      try {
        const obj = JSON.parse(s);
        settings = {...settings, ...obj};
      } catch {}
    }
  }

  // Save settings
  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }

  // Apply dark mode
  function applyDarkMode() {
    if (settings.darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }

  // Saved sentences
  let savedSentences = [];

  function loadSavedSentences() {
    const s = localStorage.getItem(STORAGE_KEYS.savedSentences);
    if (s) {
      try {
        savedSentences = JSON.parse(s);
      } catch {
        savedSentences = [];
      }
    }
    updateSavedList();
  }

  function saveSentence(sentence) {
    if (sentence.trim().length === 0) return;
    if (!savedSentences.includes(sentence)) {
      savedSentences.unshift(sentence);
      if (savedSentences.length > 20) savedSentences.pop();
      localStorage.setItem(STORAGE_KEYS.savedSentences, JSON.stringify(savedSentences));
      updateSavedList();
      showInfo("Satz gespeichert!");
    } else {
      showInfo("Satz ist bereits gespeichert.");
    }
  }

  function clearSavedSentences() {
    savedSentences = [];
    localStorage.removeItem(STORAGE_KEYS.savedSentences);
    updateSavedList();
  }

  function updateSavedList() {
    if (savedSentences.length === 0) {
      lastSavedContainer.style.display = 'none';
      return;
    }
    lastSavedContainer.style.display = 'block';
    savedListEl.innerHTML = '';
    for (const s of savedSentences) {
      const li = document.createElement('li');
      li.textContent = s;
      li.title = 'Zum Textfeld hinzufügen';
      li.tabIndex = 0;
      li.addEventListener('click', () => {
        textInput.value = s;
        textInput.focus();
      });
      li.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          li.click();
        }
      });
      savedListEl.appendChild(li);
    }
  }

  // Show info below textarea
  const infoEl = document.getElementById('info');
  let infoTimeout;
  function showInfo(msg) {
    clearTimeout(infoTimeout);
    infoEl.textContent = msg;
    infoTimeout = setTimeout(() => {
      infoEl.textContent = 'Tippe /hilfe für Befehle (z.B. /stimme, /sprache, /emotion, /darkmode)';
    }, 4000);
  }

  // Speech synthesis helpers
  function getVoices() {
    return speechSynthesis.getVoices();
  }

  function selectVoice(gender, lang) {
    const voices = getVoices();
    // Try exact lang match
    let filtered = voices.filter(v => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
    if (filtered.length === 0) filtered = voices; // fallback
    // Try to find by gender (not standardized, so a heuristic)
    const genderKeywords = gender === 'male' ? ['male', 'man', 'boy'] : ['female', 'woman', 'girl'];
    let voice = filtered.find(v => {
      const name = v.name.toLowerCase();
      return genderKeywords.some(k => name.includes(k));
    });
    if (!voice) voice = filtered[0];
    return voice || null;
  }

  // Map emotion to speechSynthesis params (limited support)
  function getEmotionParams(emotion) {
    switch (emotion) {
      case 'happy': return {rate: 1.2, pitch: 1.5};
      case 'sad': return {rate: 0.8, pitch: 0.7};
      case 'angry': return {rate: 1.3, pitch: 1.0};
      default: return {rate: 1, pitch: 1};
    }
  }

  function speak(text) {
    if (!text || text.trim() === '') {
      showInfo('Bitte gib einen Text ein!');
      return;
    }
    // Check if text starts with a command
    if (text.startsWith('/')) {
      processCommand(text.toLowerCase().trim());
      return;
    }

    // Speak normally
    if (!('speechSynthesis' in window)) {
      alert('Dein Browser unterstützt keine Sprachausgabe.');
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = settings.language;
    const voice = selectVoice(settings.voiceGender, settings.language);
    if (voice) utter.voice = voice;
    const emo = getEmotionParams(settings.emotion);
    utter.rate = emo.rate;
    utter.pitch = emo.pitch;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
    showInfo(`Lese vor mit ${settings.voiceGender}er Stimme, Sprache: ${settings.language}, Stimmung: ${settings.emotion}`);
  }

  // Command processor & menus
  function processCommand(cmd) {
    const parts = cmd.split(' ');
    const baseCmd = parts[0];

    switch (baseCmd) {
      case '/stimme':
        openVoiceMenu();
        break;
      case '/sprache':
        openLanguageMenu();
        break;
      case '/emotion':
        openEmotionMenu();
        break;
      case '/darkmode':
        settings.darkMode = !settings.darkMode;
        applyDarkMode();
        saveSettings();
        showInfo('Dark Mode ' + (settings.darkMode ? 'aktiviert' : 'deaktiviert'));
        break;
      case '/save':
        saveSentence(textInput.value);
        break;
      case '/favoriten':
        openSavedSentencesMenu();
        break;
      case '/hilfe':
        openHelpMenu();
        break;
      case '/reset':
        settings = {
          voiceGender: 'female',
          language: 'de-DE',
          emotion: 'neutral',
          darkMode: false,
        };
        applyDarkMode();
        saveSettings();
        showInfo('Einstellungen zurückgesetzt');
        break;
      default:
        showInfo('Unbekannter Befehl: ' + cmd);
        break;
    }
  }

  // Modal helper functions
  function openModal(title, bodyContent, buttons = []) {
    modalTitle.textContent = title;
    modalBody.innerHTML = '';
    if (typeof bodyContent === 'string') {
      modalBody.innerHTML = bodyContent;
    } else {
      modalBody.appendChild(bodyContent);
    }
    modalButtons.innerHTML = '';
    buttons.forEach(({text, onClick}) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.addEventListener('click', () => {
        onClick();
        closeModal();
      });
      modalButtons.appendChild(btn);
    });
    modal.classList.remove('hidden');
    modalClose.focus();
  }
  function closeModal() {
    modal.classList.add('hidden');
  }
  modalClose.addEventListener('click', closeModal);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Voice selection menu
  function openVoiceMenu() {
    const container = document.createElement('div');
    const maleBtn = document.createElement('button');
    maleBtn.textContent = 'Männliche Stimme';
    const femaleBtn = document.createElement('button');
    femaleBtn.textContent = 'Weibliche Stimme';

    maleBtn.addEventListener('click', () => {
      settings.voiceGender = 'male';
      saveSettings();
      showInfo('Stimme auf männlich gesetzt');
    });
    femaleBtn.addEventListener('click', () => {
      settings.voiceGender = 'female';
      saveSettings();
      showInfo('Stimme auf weiblich gesetzt');
    });
    container.appendChild(maleBtn);
    container.appendChild(femaleBtn);

    openModal('Stimme auswählen', container);
  }

  // Language menu
  function openLanguageMenu() {
    const container = document.createElement('div');
    const langs = [
      {code: 'de-DE', name: 'Deutsch'},
      {code: 'en-US', name: 'Englisch (USA)'},
      {code: 'en-GB', name: 'Englisch (UK)'},
      {code: 'fr-FR', name: 'Französisch'},
      {code: 'es-ES', name: 'Spanisch'},
      {code: 'it-IT', name: 'Italienisch'},
      {code: 'ja-JP', name: 'Japanisch'},
      {code: 'ru-RU', name: 'Russisch'},
      {code: 'zh-CN', name: 'Chinesisch (Mandarin)'},
    ];
    langs.forEach(l => {
      const btn = document.createElement('button');
      btn.textContent = l.name;
      btn.addEventListener('click', () => {
        settings.language = l.code;
        saveSettings();
        showInfo(`Sprache auf ${l.name} gesetzt`);
      });
      container.appendChild(btn);
    });
    openModal('Sprache auswählen', container);
  }

  // Emotion menu
  function openEmotionMenu() {
    const container = document.createElement('div');
    const emotions = [
      {id: 'neutral', name: 'Neutral'},
      {id: 'happy', name: 'Fröhlich'},
      {id: 'sad', name: 'Traurig'},
      {id: 'angry', name: 'Wütend'},
    ];
    emotions.forEach(e => {
      const btn = document.createElement('button');
      btn.textContent = e.name;
      btn.addEventListener('click', () => {
        settings.emotion = e.id;
        saveSettings();
        showInfo(`Stimmung auf ${e.name} gesetzt`);
      });
      container.appendChild(btn);
    });
    openModal('Stimmung auswählen', container);
  }

  // Saved sentences menu
  function openSavedSentencesMenu() {
    if (savedSentences.length === 0) {
      openModal('Gespeicherte Sätze', 'Keine gespeicherten Sätze gefunden.', [
        {text: 'OK', onClick: () => {}}
      ]);
      return;
    }
    const container = document.createElement('ul');
    container.style.listStyle = 'none';
    container.style.padding = '0';
    container.style.maxHeight = '200px';
    container.style.overflowY = 'auto';
    savedSentences.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      li.style.padding = '0.4rem';
      li.style.borderBottom = '1px solid #ccc';
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        textInput.value = s;
        closeModal();
        textInput.focus();
      });
      container.appendChild(li);
    });
    openModal('Gespeicherte Sätze', container, [
      { text: 'Schließen', onClick: () => {} },
    ]);
  }

  // Hilfe-Menü
  function openHelpMenu() {
    const helpHTML = `
      <ul style="padding-left: 1rem;">
        <li><b>/stimme</b> – Stimme wählen (männlich/weiblich)</li>
        <li><b>/sprache</b> – Sprache einstellen</li>
        <li><b>/emotion</b> – Emotion setzen (neutral, fröhlich, traurig, wütend)</li>
        <li><b>/darkmode</b> – Dunkelmodus an/aus</li>
        <li><b>/save</b> – Satz speichern</li>
        <li><b>/favoriten</b> – gespeicherte Sätze anzeigen</li>
        <li><b>/reset</b> – alle Einstellungen zurücksetzen</li>
      </ul>
    `;
    openModal('Befehle & Hilfe', helpHTML, [
      { text: 'OK', onClick: () => {} },
    ]);
  }

  // Initial Setup
  speakBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    speak(text);
  });

  saveBtn.addEventListener('click', () => {
    saveSentence(textInput.value);
  });

  clearSavedBtn.addEventListener('click', () => {
    if (confirm('Alle gespeicherten Sätze wirklich löschen?')) {
      clearSavedSentences();
    }
  });

  toggleDarkModeBtn.addEventListener('click', () => {
    settings.darkMode = !settings.darkMode;
    applyDarkMode();
    saveSettings();
    showInfo('Dark Mode ' + (settings.darkMode ? 'aktiviert' : 'deaktiviert'));
  });

  // Lade alles
  loadSettings();
  applyDarkMode();
  loadSavedSentences();

  // Stimmen laden, wenn bereit
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {
      getVoices(); // Trigger voice update
    };
  }
})();
