import { els, state } from "../state/app-state.js";
import { escapeHtml, formatBytes, formatCropBox } from "../utils/format.js";

export function setStatus(message, tone = "normal") {
  els.status.textContent = message;
  els.status.className = "status";

  if (tone === "warn") {
    els.status.classList.add("is-warn");
  } else if (tone === "error") {
    els.status.classList.add("is-error");
  } else if (tone === "success") {
    els.status.classList.add("is-success");
  }
}

export function getLayoutConfig() {
  return els.layoutSelect.value === "4"
    ? { cols: 2, rows: 2, perPage: 4 }
    : { cols: 2, rows: 3, perPage: 6 };
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

  els.fileCountPill.textContent = String(state.files.length);
  els.pageCountPill.textContent = String(printableLabels.length);
  els.sheetEstimatePill.textContent = printableLabels.length
    ? String(Math.ceil(printableLabels.length / layout.perPage))
    : "0";
  els.analysisStatePill.textContent = state.analyzed ? "Analysis complete" : "Waiting for analysis";

  setBusy(state.busy);
}

function createEmptyState(title, copy) {
  els.results.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    ${escapeHtml(copy)}
  `;
  els.results.className = "empty-state";
}

export function renderResults() {
  if (!state.files.length) {
    createEmptyState(
      "No labels loaded yet.",
      "Add some Econt PDFs on the left, then run analysis to preview the detected crop area for each page."
    );
    return;
  }

  if (!state.labels.length) {
    createEmptyState(
      "Files loaded. Analysis pending.",
      "Your PDFs are ready. Click Analyze Labels to render the pages and detect the actual printable label bounds."
    );
    return;
  }

  const cards = state.labels.map((label, index) => {
    const cropBox = label.cropBox;
    const cropText = cropBox
      ? formatCropBox(cropBox)
      : "No non-white label area detected";
    const statusBadge = cropBox
      ? '<div class="badge badge-success">Ready for export</div>'
      : '<div class="badge badge-warn">Detection failed</div>';

    return `
      <article class="label-card">
        <div class="label-preview">
          ${
            label.previewDataUrl
              ? `<canvas id="preview-${index}" aria-label="Preview for ${escapeHtml(label.fileName)} page ${label.pageNumber}"></canvas>`
              : '<div class="label-preview-placeholder">Preview becomes available after analysis.</div>'
          }
        </div>
        <div class="label-body">
          <h3 class="label-title">${escapeHtml(label.fileName)}</h3>
          <div class="label-subtitle">Page ${label.pageNumber} of ${label.pageCount}</div>
          <div class="meta-grid">
            <div class="meta">
              <div class="meta-label">File size</div>
              <div class="meta-value">${escapeHtml(formatBytes(label.fileSize))}</div>
            </div>
            <div class="meta">
              <div class="meta-label">Crop box</div>
              <div class="meta-value">${escapeHtml(cropText)}</div>
            </div>
            <div class="meta">
              <div class="meta-label">Source page</div>
              <div class="meta-value">${label.sourceWidth.toFixed(1)} x ${label.sourceHeight.toFixed(1)} pt</div>
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
