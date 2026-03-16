import { MM_TO_PT, QUALITY_SCALE, QUALITY_STEP } from "../config/constants.js";
import { pdfjsLib } from "../lib/pdf.js";
import { state } from "../state/app-state.js";
import { fileKey } from "../utils/format.js";
import { renderResults, setBusy, setStatus, updateSummary } from "../ui/render.js";

export async function loadSourceBuffer(fileEntry) {
  if (!fileEntry.sourceBuffer) {
    fileEntry.sourceBuffer = await fileEntry.file.arrayBuffer();
  }
  return fileEntry.sourceBuffer;
}

export async function getPdfBytes(fileEntry) {
  const sourceBuffer = await loadSourceBuffer(fileEntry);
  return new Uint8Array(sourceBuffer.slice(0));
}

export function resetAnalysis() {
  state.labels = [];
  state.analyzed = false;
  renderResults();
  updateSummary();
}

export function dedupeAndAddFiles(fileList) {
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

export async function detectCropBox(page, quality, paddingPt) {
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

export async function analyzeFiles(quality, paddingMm) {
  if (!state.files.length) {
    setStatus("Add some PDF files first.", "warn");
    return;
  }

  resetAnalysis();
  setBusy(true);

  const paddingPt = Math.max(0, Number(paddingMm) || 0) * MM_TO_PT;
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
