import { state } from "../state/app-state.js";

const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export async function fetchPdfFromUrl(rawUrl) {
  const url = rawUrl.trim();
  if (!url) throw new Error("URL is empty.");

  let res;
  // Try direct fetch first (works if the server sends CORS headers)
  try {
    res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
  } catch {
    // Fall through to CORS proxies
    res = null;
  }

  if (!res) {
    for (const proxy of CORS_PROXIES) {
      try {
        res = await fetch(proxy(url));
        if (res.ok) break;
        res = null;
      } catch {
        res = null;
      }
    }
  }

  if (!res) throw new Error("Could not fetch the PDF. The server may be blocking requests.");

  const contentType = res.headers.get("content-type") || "";
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // Verify it's actually a PDF (magic bytes: %PDF)
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("The response is not a valid PDF file.");
  }

  // Derive a filename from the URL or use a default
  let name = "econt-label.pdf";
  try {
    const parsed = new URL(url);
    const pathName = parsed.pathname.split("/").pop();
    if (pathName && pathName.includes(".")) name = decodeURIComponent(pathName);
    if (!name.toLowerCase().endsWith(".pdf")) name += ".pdf";
  } catch { /* keep default */ }

  return new File([buf], name, { type: "application/pdf" });
}

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

export function fileKey(file) {
  return [file.name, file.size, file.lastModified].join("__");
}

export function dedupeFiles(incoming) {
  const existing = new Set(state.files.map((entry) => fileKey(entry.file)));
  const added = [];

  for (const file of incoming) {
    const key = fileKey(file);
    if (existing.has(key)) continue;

    const entry = {
      id: crypto.randomUUID(),
      file,
      sourceBuffer: null,
      pageCount: 0,
    };
    state.files.push(entry);
    existing.add(key);
    added.push(entry);
  }

  return added;
}
