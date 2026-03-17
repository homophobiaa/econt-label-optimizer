export const state = {
  files: [],
  labels: [],
  analyzed: false,
  busy: false,
};

export const els = {
  blob: document.querySelector(".blob"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  generateBtn: document.getElementById("generateBtn"),
  clearBtn: document.getElementById("clearBtn"),
  layoutSelect: document.getElementById("layoutSelect"),
  paddingInput: document.getElementById("paddingInput"),
  qualitySelect: document.getElementById("qualitySelect"),
  cutGuidesToggle: document.getElementById("cutGuidesToggle"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  fileCountPill: document.getElementById("fileCountPill"),
  pageCountPill: document.getElementById("pageCountPill"),
  sheetEstimatePill: document.getElementById("sheetEstimatePill"),
  analysisStatePill: document.getElementById("analysisStatePill"),
};
