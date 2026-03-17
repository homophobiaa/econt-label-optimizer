# Econt Label Optimizer

A browser-based tool for optimizing Econt courier label PDFs. Upload your shipping labels, automatically detect printable areas, crop them, and pack multiple labels onto A4 sheets for efficient printing.

## Features

- Upload one or multiple PDF files (drag-and-drop or file picker)
- Automatic label-area detection via pixel analysis
- Crop and repack labels onto A4 pages (2-up, 4-up, or 6-up)
- Configurable padding, quality, and optional cut guides
- Text remains selectable in the output PDF (vector embedding, not rasterization)
- Download the optimized PDF in one click

## Project Structure

```text
.
├── index.html
├── README.md
├── LICENSE
└── assets
    ├── css
    │   ├── styles.css          # Import aggregator + Google Fonts
    │   ├── base.css            # Design tokens, resets, keyframes
    │   ├── layout.css          # Shell, header, sidebar, main panel
    │   ├── controls.css        # Drop zone, inputs, buttons, toggle
    │   ├── results.css         # Empty state, label cards, badges
    │   └── responsive.css      # Tablet & mobile breakpoints
    ├── images
    │   └── Kickhub.svg
    └── js
        ├── main.js             # Entry point
        ├── events.js           # DOM event bindings
        ├── config
        │   └── constants.js    # A4 dimensions, quality presets
        ├── lib
        │   └── pdf.js          # pdf.js + pdf-lib re-exports
        ├── pdf
        │   ├── analysis.js     # File loading, crop detection
        │   └── export.js       # Optimized PDF generation
        ├── state
        │   └── app-state.js    # Centralized state & DOM cache
        ├── ui
        │   └── render.js       # Status, summary, card rendering
        └── utils
            └── format.js       # Formatting helpers
```

## Tech

- [pdf.js](https://mozilla.github.io/pdf.js/) (v4.4.168) — renders input pages for analysis
- [pdf-lib](https://pdf-lib.js.org/) (v1.17.1) — creates the optimized output PDF with vector-embedded pages
- Vanilla HTML / CSS / JS (ES modules, no build step, no backend)
- Google Fonts — Plus Jakarta Sans + Sora

## Local Development

The app uses ES modules, so it must be served over HTTP rather than opened as a local file.

```sh
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`.

## Deployment

Works as-is on any static host — GitHub Pages, Netlify, Cloudflare Pages, etc.
