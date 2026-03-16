import { A4_HEIGHT, A4_WIDTH } from "../config/constants.js";
import { PDFDocument } from "../lib/pdf.js";
import { state } from "../state/app-state.js";
import { getPdfBytes } from "./analysis.js";
import { getLayoutConfig, setBusy, setStatus, updateSummary } from "../ui/render.js";

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
