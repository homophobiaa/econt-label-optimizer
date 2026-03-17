import { A4_HEIGHT, A4_WIDTH } from "../config/constants.js";
import { PDFDocument, rgb } from "../lib/pdf.js";
import { els, state } from "../state/app-state.js";
import { getPdfBytes } from "./file-io.js";
import { getLayoutConfig, setBusy, setStatus, updateSummary } from "../ui/render.js";
import { getSavedFilename, getSavedAdvanced } from "../ui/preferences.js";

const GUIDE_COLOR = rgb(0.56, 0.56, 0.56);
const GUIDE_THICKNESS = 0.8;
const GUIDE_DASH = [5, 4];

function drawScissorsMark(page, centerX, centerY) {
  const handleRadius = 2.3;
  const offset = 4.2;
  const blade = 8;

  page.drawCircle({
    x: centerX - offset,
    y: centerY + offset * 0.45,
    size: handleRadius,
    borderColor: GUIDE_COLOR,
    borderWidth: 0.9,
    opacity: 0.75,
  });

  page.drawCircle({
    x: centerX - offset,
    y: centerY - offset * 0.45,
    size: handleRadius,
    borderColor: GUIDE_COLOR,
    borderWidth: 0.9,
    opacity: 0.75,
  });

  page.drawLine({
    start: { x: centerX - 0.5, y: centerY + 1.2 },
    end: { x: centerX + blade, y: centerY + blade * 0.6 },
    thickness: 1,
    color: GUIDE_COLOR,
    opacity: 0.75,
  });

  page.drawLine({
    start: { x: centerX - 0.5, y: centerY - 1.2 },
    end: { x: centerX + blade, y: centerY - blade * 0.6 },
    thickness: 1,
    color: GUIDE_COLOR,
    opacity: 0.75,
  });
}

function drawCutGuides(page, layout, margin, gutter, cellWidth, cellHeight) {
  for (let col = 1; col < layout.cols; col += 1) {
    const x = margin + col * cellWidth + (col - 0.5) * gutter;

    page.drawLine({
      start: { x, y: margin },
      end: { x, y: A4_HEIGHT - margin },
      thickness: GUIDE_THICKNESS,
      color: GUIDE_COLOR,
      opacity: 0.7,
      dashArray: GUIDE_DASH,
    });

    drawScissorsMark(page, x - 7, A4_HEIGHT - margin * 0.5);
  }

  for (let row = 1; row < layout.rows; row += 1) {
    const y = A4_HEIGHT - margin - row * cellHeight - (row - 0.5) * gutter;

    page.drawLine({
      start: { x: margin, y },
      end: { x: A4_WIDTH - margin, y },
      thickness: GUIDE_THICKNESS,
      color: GUIDE_COLOR,
      opacity: 0.7,
      dashArray: GUIDE_DASH,
    });

    drawScissorsMark(page, margin * 0.55, y);
  }
}

export async function generateOptimizedPdf() {
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
    const showCutGuides = Boolean(els.cutGuidesToggle?.checked);
    const advanced = getSavedAdvanced();
    const margin = advanced.marginPt;
    const gutter = advanced.gutterPt;
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

      if (showCutGuides) {
        drawCutGuides(page, layout, margin, gutter, cellWidth, cellHeight);
      }

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
    const outputName = getSavedFilename() + ".pdf";
    link.href = url;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);

    setStatus(
      "Done. Generated " + outputName + " with " + printableLabels.length + " label" +
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
