import { state } from "../state/app-state.js";

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
