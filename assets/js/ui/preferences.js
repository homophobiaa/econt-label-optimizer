import { els } from "../state/app-state.js";
import { updateSummary } from "./render.js";

const STORAGE_KEY = "econt-label-prefs";

const FACTORY_DEFAULTS = {
  layout: "6",
  padding: "8",
  quality: "balanced",
  cutGuides: true,
  filename: "optimized-econt-labels",
  accentColor: "#34d058",
  blob: true,
  grid: true,
  animations: true,
  whiteThreshold: 245,
  marginPt: 18,
  gutterPt: 10,
  devConsole: false,
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return { ...FACTORY_DEFAULTS, ...JSON.parse(raw) };
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

export function getSavedAdvanced() {
  const prefs = load() || FACTORY_DEFAULTS;
  return {
    whiteThreshold: Number(prefs.whiteThreshold) || FACTORY_DEFAULTS.whiteThreshold,
    marginPt: Number(prefs.marginPt) || FACTORY_DEFAULTS.marginPt,
    gutterPt: Number(prefs.gutterPt) || FACTORY_DEFAULTS.gutterPt,
  };
}

/* ── Accent colour system ── */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function applyAccentColor(hex) {
  const [r, g, b] = hexToRgb(hex);
  const root = document.documentElement;
  root.style.setProperty("--accent", hex);
  root.style.setProperty("--accent-hover", hex);
  root.style.setProperty("--accent-muted", `rgba(${r}, ${g}, ${b}, 0.14)`);
  root.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.06)`);
  root.style.setProperty("--border-accent", `rgba(${r}, ${g}, ${b}, 0.3)`);
}

function applyAppearance(prefs) {
  applyAccentColor(prefs.accentColor);

  if (els.blob) {
    els.blob.style.display = prefs.blob ? "" : "none";
  }

  document.body.classList.toggle("no-grid", !prefs.grid);
  document.body.classList.toggle("no-animations", !prefs.animations);

  els.devConsole.hidden = !prefs.devConsole;
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
  els.prefAccentColor.value = prefs.accentColor;
  els.prefAccentValue.textContent = prefs.accentColor;
  els.prefBlob.checked = prefs.blob;
  els.prefGrid.checked = prefs.grid;
  els.prefAnimations.checked = prefs.animations;
  els.prefWhiteThreshold.value = prefs.whiteThreshold;
  els.prefMarginPt.value = prefs.marginPt;
  els.prefGutterPt.value = prefs.gutterPt;
  els.prefDevConsole.checked = prefs.devConsole;
}

function readPanel() {
  return {
    layout: els.prefLayout.value,
    padding: String(Math.max(0, Math.min(20, Number(els.prefPadding.value) || 0))),
    quality: els.prefQuality.value,
    cutGuides: els.prefCutGuides.checked,
    filename: els.prefFilename.value.trim() || FACTORY_DEFAULTS.filename,
    accentColor: els.prefAccentColor.value,
    blob: els.prefBlob.checked,
    grid: els.prefGrid.checked,
    animations: els.prefAnimations.checked,
    whiteThreshold: Math.max(200, Math.min(255, Number(els.prefWhiteThreshold.value) || 245)),
    marginPt: Math.max(0, Math.min(72, Number(els.prefMarginPt.value) || 18)),
    gutterPt: Math.max(0, Math.min(40, Number(els.prefGutterPt.value) || 10)),
    devConsole: els.prefDevConsole.checked,
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
  applyAppearance(prefs);
  closePanel();
  showToast("Preferences saved");
}

function onReset() {
  save(FACTORY_DEFAULTS);
  populatePanel(FACTORY_DEFAULTS);
  applyToSidebar(FACTORY_DEFAULTS);
  applyAppearance(FACTORY_DEFAULTS);
  showToast("Reset to factory defaults");
}

export function initPreferences() {
  const prefs = load();
  if (prefs) {
    applyToSidebar(prefs);
    applyAppearance(prefs);
  }

  els.settingsBtn.addEventListener("click", openPanel);
  els.prefsClose.addEventListener("click", closePanel);
  els.prefsSave.addEventListener("click", onSave);
  els.prefsReset.addEventListener("click", onReset);

  els.prefAccentColor.addEventListener("input", () => {
    els.prefAccentValue.textContent = els.prefAccentColor.value;
  });

  els.prefsOverlay.addEventListener("click", (event) => {
    if (event.target === els.prefsOverlay) closePanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.prefsOverlay.hidden) {
      closePanel();
    }
  });
}
