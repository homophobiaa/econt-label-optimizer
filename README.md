# Econt Label Optimizer

A static browser tool for optimizing courier label PDFs:

- Upload one or multiple PDF files
- Detect non-white label bounds automatically
- Crop each label area
- Pack labels onto A4 pages (4-up or 6-up)
- Download `optimized-econt-labels.pdf`

## Project Structure

```text
.
|-- index.html
|-- README.md
|-- assets
|   |-- css
|   |   `-- styles.css
|   |-- images
|   |   `-- kickhub.png
|   `-- js
|       |-- main.js
|       |-- config
|       |   `-- constants.js
|       `-- lib
|           `-- pdf.js
`-- Pdfs
    |-- econt.pdf
    |-- econt1.pdf
    `-- econt2.pdf
```

## Tech

- `pdf.js` for rendering/analyzing input pages
- `pdf-lib` for creating the optimized output PDF
- Vanilla HTML/CSS/JS (no backend)

## Local Development

Because the app uses ES modules, run it from a local static server instead of opening the file directly.

Examples:

```powershell
# Python
python -m http.server 8080

# Node (if installed)
npx serve .
```

Then open:

- `http://localhost:8080`

## Deployment

Works as-is on static hosting:

- GitHub Pages
- Netlify
- Cloudflare Pages
