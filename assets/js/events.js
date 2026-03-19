import { els, state } from "./state/app-state.js";
import { dedupeAndAddFiles, analyzeFiles, resetAnalysis } from "./pdf/analysis.js";
import { generateOptimizedPdf } from "./pdf/export.js";
import { renderResults, setStatus, updateSummary } from "./ui/render.js";
import { fetchPdfFromUrl } from "./pdf/file-io.js";
import {
  bindBlobTracking,
  createDragOverlay,
  showDragOverlay,
  hideDragOverlay,
  resetDragOverlay,
  spawnAirwave,
} from "./ui/animations.js";

function clearAll() {
  state.files = [];
  state.labels = [];
  state.analyzed = false;
  els.fileInput.value = "";
  renderResults();
  updateSummary();
  setStatus("Cleared. Add one or more PDF files to begin.");
}

function markSettingsChanged() {
  if (!state.files.length) return;
  resetAnalysis();
  setStatus("Settings changed. Run analysis again before generating a new PDF.", "warn");
}

function onDropZoneActivate() {
  if (!state.busy) {
    els.fileInput.click();
  }
}

function bindDropZone() {
  els.dropZone.addEventListener("click", onDropZoneActivate);
  els.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDropZoneActivate();
    }
  });

  els.fileInput.addEventListener("change", (event) => {
    dedupeAndAddFiles(event.target.files);
    els.fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragover");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    dedupeAndAddFiles(event.dataTransfer.files);
  });

  // Global drag/drop
  createDragOverlay();

  document.addEventListener("dragenter", (event) => {
    event.preventDefault();
    showDragOverlay();
  });

  document.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  document.addEventListener("dragleave", (event) => {
    event.preventDefault();
    hideDragOverlay();
  });

  document.addEventListener("drop", (event) => {
    resetDragOverlay();

    if (els.dropZone.contains(event.target)) return;

    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files.length) return;

    spawnAirwave(event.clientX, event.clientY);
    dedupeAndAddFiles(files);
  });
}

async function loadFromUrl() {
  const url = els.urlInput.value.trim();
  if (!url) return;
  if (state.busy) return;

  els.urlBtn.disabled = true;
  setStatus("Fetching PDF from URL\u2026");

  try {
    const file = await fetchPdfFromUrl(url);
    dedupeAndAddFiles([file]);
    els.urlInput.value = "";
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    els.urlBtn.disabled = false;
  }
}

function bindUrlInput() {
  els.urlBtn.addEventListener("click", loadFromUrl);
  els.urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loadFromUrl();
    }
  });

  // Stop click / keyboard from bubbling to the drop zone
  els.urlInput.addEventListener("click", (e) => e.stopPropagation());
  els.urlBtn.addEventListener("click", (e) => e.stopPropagation());
}

function bindActions() {
  els.analyzeBtn.addEventListener("click", () => {
    analyzeFiles(els.qualitySelect.value, els.paddingInput.value);
  });

  els.generateBtn.addEventListener("click", () => generateOptimizedPdf());
  els.printBtn.addEventListener("click", () => generateOptimizedPdf({ print: true }));
  els.clearBtn.addEventListener("click", clearAll);
  els.layoutSelect.addEventListener("change", () => {
    updateSummary();
    markSettingsChanged();
  });
  els.paddingInput.addEventListener("change", markSettingsChanged);
  els.qualitySelect.addEventListener("change", markSettingsChanged);
}

export function bindEvents() {
  bindBlobTracking();
  bindDropZone();
  bindUrlInput();
  bindActions();
}
