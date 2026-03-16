import { pdfjsLib, PDFDocument } from "./lib/pdf.js";
import {
  A4_WIDTH,
  A4_HEIGHT,
  MM_TO_PT,
  QUALITY_SCALE,
  QUALITY_STEP,
} from "./config/constants.js";

const state = {
  files: [],
  labels: [],
  analyzed: false,
  busy: false,
};

const els = {
  blob: document.querySelector(".blob"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  generateBtn: document.getElementById("generateBtn"),
  clearBtn: document.getElementById("clearBtn"),
  layoutSelect: document.getElementById("layoutSelect"),
  paddingInput: document.getElementById("paddingInput"),
  qualitySelect: document.getElementById("qualitySelect"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  fileCountPill: document.getElementById("fileCountPill"),
  pageCountPill: document.getElementById("pageCountPill"),
  sheetEstimatePill: document.getElementById("sheetEstimatePill"),
  analysisStatePill: document.getElementById("analysisStatePill"),
};

function setStatus(message, tone = "normal") {
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

function setBusy(busy) {
  state.busy = busy;
  const hasFiles = state.files.length > 0;
  const hasPrintableLabels = state.labels.some((label) => label.cropBox);

  els.analyzeBtn.disabled = busy || !hasFiles;
  els.generateBtn.disabled = busy || !hasPrintableLabels;
  els.clearBtn.disabled = busy || (!hasFiles && !state.labels.length);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    }[char]
  ));
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function toMillimeters(points) {
  return points / MM_TO_PT;
}

function getLayoutConfig() {
  return els.layoutSelect.value === "4"
    ? { cols: 2, rows: 2, perPage: 4 }
    : { cols: 2, rows: 3, perPage: 6 };
}

function updateSummary() {
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

function clearAll() {
  state.files = [];
  state.labels = [];
  state.analyzed = false;
  els.fileInput.value = "";
  renderResults();
  updateSummary();
  setStatus("Cleared. Add one or more PDF files to begin.");
}

function resetAnalysis() {
  state.labels = [];
  state.analyzed = false;
  renderResults();
  updateSummary();
}

function fileKey(file) {
  return [file.name, file.size, file.lastModified].join("__");
}

function dedupeAndAddFiles(fileList) {
  const incoming = Array.from(fileList).filter((file) => (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  ));

  if (!incoming.length) {
    setStatus("Only PDF files are supported.", "error");
    return;
  }

  const existing = new Set(state.files.map((entry) => fileKey(entry.file)));
  let added = 0;

  for (const file of incoming) {
    const key = fileKey(file);
    if (existing.has(key)) continue;

    state.files.push({
      id: crypto.randomUUID(),
      file,
      sourceBuffer: null,
      pageCount: 0,
    });
    existing.add(key);
    added += 1;
  }

  if (!added) {
    setStatus("Those files are already loaded.", "warn");
    return;
  }

  resetAnalysis();
  renderResults();
  updateSummary();
  setStatus("Added " + added + " PDF file" + (added === 1 ? "" : "s") + ". Run analysis next.");
}

function createEmptyState(title, copy) {
  els.results.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    ${escapeHtml(copy)}
  `;
  els.results.className = "empty-state";
}

function formatCropBox(cropBox) {
  return (
    toMillimeters(cropBox.width).toFixed(1) + " x " +
    toMillimeters(cropBox.height).toFixed(1) + " mm"
  );
}

function renderResults() {
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

async function loadSourceBuffer(fileEntry) {
  if (!fileEntry.sourceBuffer) {
    fileEntry.sourceBuffer = await fileEntry.file.arrayBuffer();
  }
  return fileEntry.sourceBuffer;
}

async function getPdfBytes(fileEntry) {
  const sourceBuffer = await loadSourceBuffer(fileEntry);
  return new Uint8Array(sourceBuffer.slice(0));
}

async function analyzeFiles() {
  if (!state.files.length) {
    setStatus("Add some PDF files first.", "warn");
    return;
  }

  resetAnalysis();
  setBusy(true);

  const quality = els.qualitySelect.value;
  const paddingPt = Math.max(0, Number(els.paddingInput.value) || 0) * MM_TO_PT;
  let processedPages = 0;

  try {
    for (const fileEntry of state.files) {
      const bytes = await getPdfBytes(fileEntry);
      setStatus("Loading " + fileEntry.file.name + "...");

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      fileEntry.pageCount = pdf.numPages;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setStatus(
          "Analyzing " + fileEntry.file.name + ", page " + pageNumber + " of " + pdf.numPages + "..."
        );

        const page = await pdf.getPage(pageNumber);
        const detected = await detectCropBox(page, quality, paddingPt);
        const sourceWidth = page.view[2];
        const sourceHeight = page.view[3];
        const cropBox = detected ? detected.cropBox : null;
        const coverage = cropBox
          ? (cropBox.width * cropBox.height) / (sourceWidth * sourceHeight) * 100
          : 0;

        state.labels.push({
          fileId: fileEntry.id,
          fileName: fileEntry.file.name,
          fileSize: fileEntry.file.size,
          pageNumber,
          pageCount: pdf.numPages,
          cropBox,
          sourceWidth,
          sourceHeight,
          coverage,
          previewDataUrl: detected ? detected.previewDataUrl : null,
        });

        processedPages += 1;
        renderResults();
        updateSummary();
      }
    }

    state.analyzed = true;
    updateSummary();

    const printableCount = state.labels.filter((label) => label.cropBox).length;
    if (!printableCount) {
      setStatus(
        "Analysis finished, but no non-white label areas were detected. Try increasing detection quality.",
        "error"
      );
    } else {
      setStatus(
        "Analysis finished. Detected " + printableCount + " printable labels across " + processedPages + " page" +
        (processedPages === 1 ? "" : "s") + ".",
        "success"
      );
    }
  } catch (error) {
    console.error(error);
    setStatus("Analysis failed: " + (error.message || "Unknown error"), "error");
  } finally {
    setBusy(false);
    updateSummary();
  }
}

async function detectCropBox(page, quality, paddingPt) {
  const scale = QUALITY_SCALE[quality] || QUALITY_SCALE.balanced;
  const sampleStep = QUALITY_STEP[quality] || 1;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const whiteThreshold = 245;
  const alphaThreshold = 16;

  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += sampleStep) {
    for (let x = 0; x < canvas.width; x += sampleStep) {
      const index = (y * canvas.width + x) * 4;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = pixels[index + 3];
      const nearWhite = r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
      const isEmpty = a < alphaThreshold || nearWhite;

      if (!isEmpty) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0 || maxY < 0) {
    return null;
  }

  const padPx = paddingPt * scale;
  minX = Math.max(0, minX - padPx);
  minY = Math.max(0, minY - padPx);
  maxX = Math.min(canvas.width, maxX + padPx);
  maxY = Math.min(canvas.height, maxY + padPx);

  const pageWidth = page.view[2];
  const pageHeight = page.view[3];
  const cropWidth = ((maxX - minX) / canvas.width) * pageWidth;
  const cropHeight = ((maxY - minY) / canvas.height) * pageHeight;
  const cropX = (minX / canvas.width) * pageWidth;
  const cropTop = (minY / canvas.height) * pageHeight;
  const cropY = pageHeight - cropTop - cropHeight;

  const previewCanvas = document.createElement("canvas");
  const previewScale = Math.min(300 / canvas.width, 300 / canvas.height, 1);
  previewCanvas.width = Math.max(1, Math.round(canvas.width * previewScale));
  previewCanvas.height = Math.max(1, Math.round(canvas.height * previewScale));
  const previewCtx = previewCanvas.getContext("2d");
  previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.strokeStyle = "#3bf78b";
  previewCtx.lineWidth = 3;
  previewCtx.strokeRect(
    minX * previewScale,
    minY * previewScale,
    (maxX - minX) * previewScale,
    (maxY - minY) * previewScale
  );

  return {
    cropBox: {
      left: cropX,
      bottom: cropY,
      right: cropX + cropWidth,
      top: cropY + cropHeight,
      width: cropWidth,
      height: cropHeight,
    },
    previewDataUrl: previewCanvas.toDataURL("image/png"),
  };
}

async function generateOptimizedPdf() {
  const printableLabels = state.labels.filter((label) => label.cropBox);
  if (!printableLabels.length) {
    setStatus("Analyze the PDFs first and make sure labels were detected.", "warn");
    return;
  }

  setBusy(true);

  try {
    setStatus("Generating optimized PDF...");
    const output = await PDFDocument.create();
    const layout = getLayoutConfig();
    const margin = 18;
    const gutter = 10;
    const cellWidth = (A4_WIDTH - margin * 2 - gutter * (layout.cols - 1)) / layout.cols;
    const cellHeight = (A4_HEIGHT - margin * 2 - gutter * (layout.rows - 1)) / layout.rows;

    const sourceDocs = new Map();
    for (const fileEntry of state.files) {
      if (!state.labels.some((label) => label.fileId === fileEntry.id && label.cropBox)) continue;
      const bytes = await getPdfBytes(fileEntry);
      sourceDocs.set(fileEntry.id, await PDFDocument.load(bytes));
    }

    for (let offset = 0; offset < printableLabels.length; offset += layout.perPage) {
      const chunk = printableLabels.slice(offset, offset + layout.perPage);
      const page = output.addPage([A4_WIDTH, A4_HEIGHT]);

      for (let index = 0; index < chunk.length; index += 1) {
        const label = chunk[index];
        const sourceDoc = sourceDocs.get(label.fileId);
        const sourcePage = sourceDoc.getPage(label.pageNumber - 1);
        const embedded = await output.embedPage(sourcePage, label.cropBox);

        const row = Math.floor(index / layout.cols);
        const col = index % layout.cols;
        const cellX = margin + col * (cellWidth + gutter);
        const cellTop = A4_HEIGHT - margin - row * (cellHeight + gutter);
        const cellY = cellTop - cellHeight;
        const scale = Math.min(cellWidth / label.cropBox.width, cellHeight / label.cropBox.height);
        const drawWidth = label.cropBox.width * scale;
        const drawHeight = label.cropBox.height * scale;

        page.drawPage(embedded, {
          x: cellX + (cellWidth - drawWidth) / 2,
          y: cellY + (cellHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }
    }

    const bytes = await output.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "optimized-econt-labels.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    setStatus(
      "Done. Generated optimized-econt-labels.pdf with " + printableLabels.length + " label" +
      (printableLabels.length === 1 ? "" : "s") + ".",
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus("Generation failed: " + (error.message || "Unknown error"), "error");
  } finally {
    setBusy(false);
    updateSummary();
  }
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

document.addEventListener("mousemove", (event) => {
  if (!els.blob) return;
  els.blob.style.transform = "translate3d(calc(" + event.clientX + "px - 50%), calc(" + event.clientY + "px - 50%), 0)";
});

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

els.analyzeBtn.addEventListener("click", analyzeFiles);
els.generateBtn.addEventListener("click", generateOptimizedPdf);
els.clearBtn.addEventListener("click", clearAll);
els.layoutSelect.addEventListener("change", () => {
  updateSummary();
  markSettingsChanged();
});
els.paddingInput.addEventListener("change", markSettingsChanged);
els.qualitySelect.addEventListener("change", markSettingsChanged);

renderResults();
updateSummary();
