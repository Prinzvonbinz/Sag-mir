(async () => {
  const textInput = document.getElementById("textInput");
  const speakBtn = document.getElementById("speakBtn");
  const saveBtn = document.getElementById("saveBtn");
  const showSavedBtn = document.getElementById("showSavedBtn");
  const clearSavedBtn = document.getElementById("clearSavedBtn");
  const toggleDarkModeBtn = document.getElementById("toggleDarkModeBtn");
  const helpBtn = document.getElementById("helpBtn");
  const infoText = document.getElementById("infoText");
  const emotionSelect = document.getElementById("emotionSelect");
  const languageSelect = document.getElementById("languageSelect");

  let savedSentences = [];
  let settings = { darkMode: false };

  const getVoices = () => speechSynthesis.getVoices();

  async function translateText(text, targetLang) {
    try {
      const res = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: "auto",
          target: targetLang,
          format: "text"
        })
      });
      const data = await res.json();
      return data.translatedText;
    } catch {
      return text;
    }
  }

  async function speak(text) {
    if (!text) return;
    const lang = languageSelect.value;
    const voice = getVoices().find(v =>
      v.lang.startsWith(lang) && v.name.toLowerCase().includes("female")
    );
    if (!voice) {
      showInfo("Keine weibliche Stimme gefunden.");
      return;
    }

    const translated = await translateText(text, lang);
    const utterance = new SpeechSynthesisUtterance(translated);
    utterance.voice = voice;
    utterance.lang = lang;

    switch (emotionSelect.value) {
      case "happy":
        utterance.rate = 1.2;
        utterance.pitch = 1.2;
        break;
      case "sad":
        utterance.rate = 0.9;
        utterance.pitch = 0.8;
        break;
      case "angry":
        utterance.rate = 1.4;
        utterance.pitch = 0.6;
        break;
    }

    speechSynthesis.speak(utterance);
  }

  function showInfo(msg) {
    infoText.textContent = msg;
    setTimeout(() => (infoText.textContent = ""), 4000);
  }

  function saveSentence(text) {
    if (!text.trim()) return;
    savedSentences.push(text);
    localStorage.setItem("sentences", JSON.stringify(savedSentences));
    showInfo("Gespeichert!");
  }

  function loadSavedSentences() {
    savedSentences = JSON.parse(localStorage.getItem("sentences") || "[]");
  }

  function clearSavedSentences() {
    savedSentences = [];
    localStorage.removeItem("sentences");
    showInfo("Favoriten gelöscht.");
  }

  function applyDarkMode() {
    document.body.classList.toggle("dark", settings.darkMode);
  }

  function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings));
  }

  function loadSettings() {
    const saved = JSON.parse(localStorage.getItem("settings") || "{}");
    Object.assign(settings, saved);
    applyDarkMode();
  }

  function openModal(title, content, buttons) {
    const modal = document.getElementById("modal");
    document.getElementById("modalTitle").innerText = title;
    const body = document.getElementById("modalBody");
    if (typeof content === "string") {
      body.innerHTML = content;
    } else {
      body.innerHTML = "";
      body.appendChild(content);
    }
    const btns = document.getElementById("modalButtons");
    btns.innerHTML = "";
    buttons.forEach(({ text, onClick }) => {
      const btn = document.createElement("button");
      btn.textContent = text;
      btn.onclick = () => {
        modal.classList.add("hidden");
        onClick();
      };
      btns.appendChild(btn);
    });
    modal.classList.remove("hidden");
  }

  function openSavedSentencesMenu() {
    const container = document.createElement("div");
    savedSentences.forEach((s) => {
      const li = document.createElement("div");
      li.textContent = `🔹 ${s}`;
      li.style.padding = "0.25rem";
      li.style.borderBottom = "1px solid #ccc";
      li.style.cursor = "pointer";
      li.onclick = () => {
        textInput.value = s;
        document.getElementById("modal").classList.add("hidden");
      };
      container.appendChild(li);
    });
    openModal("Favoriten", container, [{ text: "Schließen", onClick: () => {} }]);
  }

  function openHelpMenu() {
    const helpHTML = `
      <ul style="text-align: left">
        <li><b>/stimme</b> – Stimme weiblich automatisch</li>
        <li><b>/sprache</b> – Sprache wählen</li>
        <li><b>/emotion</b> – Emotion einstellen</li>
        <li><b>/darkmode</b> – Dark Mode umschalten</li>
        <li><b>/save</b> – Satz speichern</li>
        <li><b>/favoriten</b> – Favoriten anzeigen</li>
        <li><b>/reset</b> – Einstellungen zurücksetzen</li>
      </ul>`;
    openModal("Befehle & Hilfe", helpHTML, [{ text: "OK", onClick: () => {} }]);
  }

  speakBtn.onclick = () => speak(textInput.value);
  saveBtn.onclick = () => saveSentence(textInput.value);
  showSavedBtn.onclick = () => openSavedSentencesMenu();
  clearSavedBtn.onclick = () => {
    if (confirm("Favoriten wirklich löschen?")) clearSavedSentences();
  };
  toggleDarkModeBtn.onclick = () => {
    settings.darkMode = !settings.darkMode;
    applyDarkMode();
    saveSettings();
  };
  helpBtn.onclick = () => openHelpMenu();

  loadSettings();
  loadSavedSentences();

  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.onvoiceschanged = () => getVoices();
  }
})();
