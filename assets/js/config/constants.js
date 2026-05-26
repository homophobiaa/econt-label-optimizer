export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;
export const MM_TO_PT = 72 / 25.4;

export const QUALITY_SCALE = {
  fast: 1.15,
  balanced: 1.7,
  high: 2.4,
};

export const QUALITY_STEP = {
  fast: 2,
  balanced: 1,
  high: 1,
};

// ── General settings defaults ──────────────────────────────────────────────
export const DEFAULT_LAYOUT = "4";
export const DEFAULT_PADDING = "4";         // padding input value in mm
export const DEFAULT_QUALITY = "balanced";
export const DEFAULT_CUT_GUIDES = true;
export const DEFAULT_FILENAME = "optimized-econt-labels";

// ── Appearance defaults ────────────────────────────────────────────────────
export const DEFAULT_ACCENT_COLOR = "#34d058";
export const DEFAULT_BLOB = true;
export const DEFAULT_GRID = true;
export const DEFAULT_ANIMATIONS = true;

// ── Advanced / layout defaults ─────────────────────────────────────────────
export const DEFAULT_WHITE_THRESHOLD = 245; // pixel brightness cutoff (200–255)
export const DEFAULT_MARGIN_PT = 18;        // page margin in points
export const DEFAULT_GUTTER_PT = 10;        // gutter between labels in points
export const DEFAULT_DEV_CONSOLE = false;

// ── Epson color maintenance marks ──────────────────────────────────────────
// Tiny solid CMY rectangles printed at the top-left of every page so color
// nozzles get exercised on each print job.
export const EPSON_MAINTENANCE_MARKS_DEFAULT_ENABLED = true;

export const EPSON_MAINTENANCE_MARKS_TOP_MM = 2;
export const EPSON_MAINTENANCE_MARKS_LEFT_MM = 2;

export const EPSON_MAINTENANCE_MARK_WIDTH_MM = 2.5;
export const EPSON_MAINTENANCE_MARK_HEIGHT_MM = 1;
export const EPSON_MAINTENANCE_MARK_GAP_MM = 0.6;