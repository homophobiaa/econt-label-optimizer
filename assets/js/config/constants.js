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

// Epson color maintenance marks — tiny CMY blocks printed at the top-left of
// every page so color nozzles get exercised on each print job.
export const EPSON_MAINTENANCE_MARKS_DEFAULT_ENABLED = true;
export const EPSON_MAINTENANCE_MARKS_TOP_MM = 2;
export const EPSON_MAINTENANCE_MARKS_LEFT_MM = 2;
export const EPSON_MAINTENANCE_MARK_WIDTH_MM = 2;
export const EPSON_MAINTENANCE_MARK_HEIGHT_MM = 0.6;
export const EPSON_MAINTENANCE_MARK_GAP_MM = 0.6;
