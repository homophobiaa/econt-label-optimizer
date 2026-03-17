import { els } from "../state/app-state.js";
import { updateSummary } from "./render.js";

const STORAGE_KEY = "econt-label-prefs";

const FACTORY_DEFAULTS = {
  layout: "6",
  padding: "8",
  quality: "balanced",
  cutGuides: true,
  filename: "optimized-econt-labels",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(prefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function getSavedFilename() {
  const prefs = load();
  return (prefs && prefs.filename) || FACTORY_DEFAULTS.filename;
}

function applyToSidebar(prefs) {
  els.layoutSelect.value = prefs.layout;
  els.paddingInput.value = prefs.padding;
  els.qualitySelect.value = prefs.quality;
  els.cutGuidesToggle.checked = prefs.cutGuides;
  updateSummary();
}

function populatePanel(prefs) {
  els.prefLayout.value = prefs.layout;
  els.prefPadding.value = prefs.padding;
  els.prefQuality.value = prefs.quality;
  els.prefCutGuides.checked = prefs.cutGuides;
  els.prefFilename.value = prefs.filename;
}

function readPanel() {
  return {
    layout: els.prefLayout.value,
    padding: String(Math.max(0, Math.min(20, Number(els.prefPadding.value) || 0))),
    quality: els.prefQuality.value,
    cutGuides: els.prefCutGuides.checked,
    filename: els.prefFilename.value.trim() || FACTORY_DEFAULTS.filename,
  };
}

function showToast(message) {
  let toast = document.querySelector(".prefs-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "prefs-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function openPanel() {
  const prefs = load() || FACTORY_DEFAULTS;
  populatePanel(prefs);
  els.prefsOverlay.hidden = false;
  els.prefsOverlay.classList.remove("is-closing");
}

function closePanel() {
  els.prefsOverlay.classList.add("is-closing");
  setTimeout(() => {
    els.prefsOverlay.hidden = true;
    els.prefsOverlay.classList.remove("is-closing");
  }, 220);
}

function onSave() {
  const prefs = readPanel();
  save(prefs);
  applyToSidebar(prefs);
  closePanel();
  showToast("Preferences saved");
}

function onReset() {
  save(FACTORY_DEFAULTS);
  populatePanel(FACTORY_DEFAULTS);
  applyToSidebar(FACTORY_DEFAULTS);
  showToast("Reset to factory defaults");
}

export function initPreferences() {
  const prefs = load();
  if (prefs) {
    applyToSidebar(prefs);
  }

  els.settingsBtn.addEventListener("click", openPanel);
  els.prefsClose.addEventListener("click", closePanel);
  els.prefsSave.addEventListener("click", onSave);
  els.prefsReset.addEventListener("click", onReset);

  els.prefsOverlay.addEventListener("click", (event) => {
    if (event.target === els.prefsOverlay) closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.prefsOverlay.hidden) {
      closePanel();
    }
  });
}
