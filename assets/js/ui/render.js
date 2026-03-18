import { els, state } from "../state/app-state.js";
import { escapeHtml, formatBytes, formatCropBox } from "../utils/format.js";

export function setStatus(message, tone = "normal") {
  els.status.textContent = message;
  els.status.className = "status-bar";

  if (tone === "warn") {
    els.status.classList.add("is-warn");
  } else if (tone === "error") {
    els.status.classList.add("is-error");
  } else if (tone === "success") {
    els.status.classList.add("is-success");
  }
}

export function getLayoutConfig() {
  const value = els.layoutSelect.value;
  if (value === "2") return { cols: 1, rows: 2, perPage: 2 };
  if (value === "4") return { cols: 2, rows: 2, perPage: 4 };
  return { cols: 2, rows: 3, perPage: 6 };
}

export function setBusy(busy) {
  state.busy = busy;
  const hasFiles = state.files.length > 0;
  const hasPrintableLabels = state.labels.some((label) => label.cropBox);

  els.analyzeBtn.disabled = busy || !hasFiles;
  els.generateBtn.disabled = busy || !hasPrintableLabels;
  els.clearBtn.disabled = busy || (!hasFiles && !state.labels.length);
}

export function updateSummary() {
  const printableLabels = state.labels.filter((label) => label.cropBox);
  const layout = getLayoutConfig();

  const labelCount = printableLabels.length;
  const sheets = labelCount ? Math.ceil(labelCount / layout.perPage) : 0;
  const saved = labelCount ? labelCount - sheets : 0;

  els.fileCountPill.textContent = String(state.files.length);
  els.pageCountPill.textContent = String(labelCount);
  els.sheetEstimatePill.textContent = String(sheets);
  els.savedPill.textContent = String(saved);
  els.savedPill.closest(".stat").classList.toggle("is-saving", saved > 0);

  const pillText = state.analyzed ? "Complete" : "Waiting";
  els.analysisStatePill.innerHTML = '<span class="stat-dot"></span>' + escapeHtml(pillText);
  els.analysisStatePill.classList.toggle("is-complete", state.analyzed);

  setBusy(state.busy);
}

function createEmptyState(title, copy) {
  els.results.innerHTML = `
    <div class="empty-state-icon">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="8" y="6" width="48" height="52" rx="6" stroke="currentColor" stroke-width="2" opacity="0.4"/>
        <path d="M24 28l8-8 8 8M32 20v20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
      </svg>
    </div>
    <strong>${escapeHtml(title)}</strong>
    <p>${escapeHtml(copy)}</p>
  `;
  els.results.className = "empty-state";
}

export function renderResults() {
  if (!state.files.length) {
    createEmptyState(
      "No labels loaded yet",
      "Upload Econt PDFs, then run analysis to preview detected crop areas."
    );
    return;
  }

  if (!state.labels.length) {
    createEmptyState(
      "Files loaded — analysis pending",
      "Your PDFs are ready. Click Analyze Labels to detect the printable label bounds."
    );
    return;
  }

  const cards = state.labels.map((label, index) => {
    const cropBox = label.cropBox;
    const cropText = cropBox
      ? formatCropBox(cropBox)
      : "No label area detected";
    const statusBadge = cropBox
      ? '<div class="badge badge-success">Ready</div>'
      : '<div class="badge badge-warn">Failed</div>';

    return `
      <article class="label-card">
        <div class="label-preview">
          ${
            label.previewDataUrl
              ? `<canvas id="preview-${index}" aria-label="Preview for ${escapeHtml(label.fileName)} page ${label.pageNumber}"></canvas>`
              : '<div class="label-preview-placeholder">Preview available after analysis</div>'
          }
        </div>
        <div class="label-body">
          <h3 class="label-title">${escapeHtml(label.fileName)}</h3>
          <div class="label-subtitle">Page ${label.pageNumber} of ${label.pageCount}</div>
          <div class="meta-grid">
            <div class="meta">
              <div class="meta-label">Size</div>
              <div class="meta-value">${escapeHtml(formatBytes(label.fileSize))}</div>
            </div>
            <div class="meta">
              <div class="meta-label">Crop</div>
              <div class="meta-value">${escapeHtml(cropText)}</div>
            </div>
            <div class="meta">
              <div class="meta-label">Source</div>
              <div class="meta-value">${label.sourceWidth.toFixed(1)} &times; ${label.sourceHeight.toFixed(1)} pt</div>
            </div>
            <div class="meta">
              <div class="meta-label">Coverage</div>
              <div class="meta-value">${cropBox ? label.coverage.toFixed(1) + "%" : "0%"}</div>
            </div>
          </div>
          ${statusBadge}
        </div>
      </article>
    `;
  }).join("");

  els.results.className = "labels-grid";
  els.results.innerHTML = cards;

  state.labels.forEach((label, index) => {
    if (!label.previewDataUrl) return;
    const canvas = document.getElementById("preview-" + index);
    if (!canvas) return;

    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
    };
    image.src = label.previewDataUrl;
  });
}
