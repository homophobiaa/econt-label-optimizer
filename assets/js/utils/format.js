import { MM_TO_PT } from "../config/constants.js";

export function escapeHtml(value) {
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

export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

export function toMillimeters(points) {
  return points / MM_TO_PT;
}

export function formatCropBox(cropBox) {
  return (
    toMillimeters(cropBox.width).toFixed(1) + " x " +
    toMillimeters(cropBox.height).toFixed(1) + " mm"
  );
}

export function fileKey(file) {
  return [file.name, file.size, file.lastModified].join("__");
}
