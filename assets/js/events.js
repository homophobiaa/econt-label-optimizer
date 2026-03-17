import { els, state } from "./state/app-state.js";
import { dedupeAndAddFiles, analyzeFiles, resetAnalysis } from "./pdf/analysis.js";
import { generateOptimizedPdf } from "./pdf/export.js";
import { renderResults, setStatus, updateSummary } from "./ui/render.js";

function clearAll() {
  state.files = [];
  state.labels = [];
  state.analyzed = false;
  els.fileInput.value = "";
  renderResults();
  updateSummary();
  setStatus("Cleared. Add one or more PDF files to begin.");
}

function markSettingsChanged() {
  if (!state.files.length) return;
  resetAnalysis();
  setStatus("Settings changed. Run analysis again before generating a new PDF.", "warn");
}

function onDropZoneActivate() {
  if (!state.busy) {
    els.fileInput.click();
  }
}

function bindBlobTracking() {
  document.addEventListener("mousemove", (event) => {
    if (!els.blob) return;
    els.blob.style.transform = "translate3d(calc(" + event.clientX + "px - 50%), calc(" + event.clientY + "px - 50%), 0)";
  });
}

function bindDropZone() {
  els.dropZone.addEventListener("click", onDropZoneActivate);
  els.dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDropZoneActivate();
    }
  });

  els.fileInput.addEventListener("change", (event) => {
    dedupeAndAddFiles(event.target.files);
    els.fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragover");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    dedupeAndAddFiles(event.dataTransfer.files);
  });

  // ── Global drag overlay ──
  const overlay = document.createElement("div");
  overlay.className = "drag-overlay";
  document.body.appendChild(overlay);

  let dragCounter = 0;
  let dragParticles = [];
  let dragParticleTimer = null;

  function startDragParticles() {
    if (dragParticleTimer) return;
    dragParticleTimer = setInterval(() => {
      if (dragCounter <= 0) return;
      const p = document.createElement("div");
      p.className = "drag-particle";
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.setProperty("--dp-dur", (1.8 + Math.random() * 1.4) + "s");
      p.style.setProperty("--dp-del", (Math.random() * 0.5) + "s");
      document.body.appendChild(p);
      dragParticles.push(p);
      // Clean up old particles
      if (dragParticles.length > 20) {
        const old = dragParticles.shift();
        old.remove();
      }
    }, 180);
  }

  function stopDragParticles() {
    clearInterval(dragParticleTimer);
    dragParticleTimer = null;
    dragParticles.forEach((p) => p.remove());
    dragParticles = [];
  }

  document.addEventListener("dragenter", (event) => {
    event.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      overlay.classList.add("active");
      startDragParticles();
    }
  });

  document.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  document.addEventListener("dragleave", (event) => {
    event.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      overlay.classList.remove("active");
      stopDragParticles();
    }
  });

  document.addEventListener("drop", (event) => {
    dragCounter = 0;
    overlay.classList.remove("active");
    stopDragParticles();

    // If the drop landed inside the drop zone, it's already handled above
    if (els.dropZone.contains(event.target)) return;

    event.preventDefault();
    const files = event.dataTransfer.files;
    if (!files.length) return;

    spawnAirwave(event.clientX, event.clientY);
    dedupeAndAddFiles(files);
  });
}

function spawnAirwave(fromX, fromY) {
  const rect = els.dropZone.getBoundingClientRect();
  const toX = rect.left + rect.width / 2;
  const toY = rect.top + rect.height / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Quadratic bezier control point — perpendicular offset for a smooth arc
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const perpX = -(dy) * 0.25;
  const perpY = (dx) * 0.25;
  const cpX = midX + perpX;
  const cpY = midY + perpY;

  const duration = Math.min(700, Math.max(350, dist * 0.55));

  // Create the orb
  const orb = document.createElement("div");
  orb.className = "airwave";
  document.body.appendChild(orb);

  const start = performance.now();
  let lastTrail = 0;

  function tick(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);

    // Ease-out cubic for smooth deceleration
    const e = 1 - Math.pow(1 - t, 3);

    // Quadratic bezier: B(t) = (1-t)²·P0 + 2(1-t)t·CP + t²·P1
    const inv = 1 - e;
    const x = inv * inv * fromX + 2 * inv * e * cpX + e * e * toX;
    const y = inv * inv * fromY + 2 * inv * e * cpY + e * e * toY;

    const scale = 1 + 0.3 * Math.sin(t * Math.PI) - t * 0.6;
    orb.style.left = x + "px";
    orb.style.top = y + "px";
    orb.style.transform = "scale(" + Math.max(scale, 0.15) + ")";
    orb.style.opacity = t < 0.1 ? t / 0.1 : (t > 0.75 ? (1 - t) / 0.25 : 1);

    // Shed trail particles every ~18ms
    if (elapsed - lastTrail > 18 && t < 0.92) {
      lastTrail = elapsed;
      const size = 4 + 6 * (1 - t);
      const jitter = 4 * (1 - t);
      const trail = document.createElement("div");
      trail.className = "airwave-trail";
      trail.style.left = (x + (Math.random() - 0.5) * jitter) + "px";
      trail.style.top = (y + (Math.random() - 0.5) * jitter) + "px";
      trail.style.width = size + "px";
      trail.style.height = size + "px";
      trail.style.marginLeft = (-size / 2) + "px";
      trail.style.marginTop = (-size / 2) + "px";
      trail.style.setProperty("--trail-dur", (0.35 + 0.3 * (1 - t)) + "s");
      document.body.appendChild(trail);
      trail.addEventListener("animationend", () => trail.remove());
    }

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      orb.remove();
      spawnLandingEffect(toX, toY);
    }
  }

  requestAnimationFrame(tick);
}

function spawnLandingEffect(x, y) {
  // Burst particles
  const burstCount = 10;
  for (let i = 0; i < burstCount; i++) {
    const a = (Math.PI * 2 * i) / burstCount + (Math.random() - 0.5) * 0.4;
    const r = 18 + Math.random() * 22;
    const burst = document.createElement("div");
    burst.className = "airwave-burst";
    burst.style.left = x + "px";
    burst.style.top = y + "px";
    burst.style.setProperty("--burst-x", (Math.cos(a) * r) + "px");
    burst.style.setProperty("--burst-y", (Math.sin(a) * r) + "px");
    burst.style.setProperty("--burst-del", (Math.random() * 0.06) + "s");
    document.body.appendChild(burst);
    burst.addEventListener("animationend", () => burst.remove());
  }

  // Expanding ring
  const ring = document.createElement("div");
  ring.className = "airwave-ring";
  ring.style.left = x + "px";
  ring.style.top = y + "px";
  ring.style.width = "60px";
  ring.style.height = "60px";
  document.body.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove());

  // Drop zone flash
  els.dropZone.classList.add("drop-flash");
  setTimeout(() => els.dropZone.classList.remove("drop-flash"), 550);
}

function bindActions() {
  els.analyzeBtn.addEventListener("click", () => {
    analyzeFiles(els.qualitySelect.value, els.paddingInput.value);
  });

  els.generateBtn.addEventListener("click", generateOptimizedPdf);
  els.clearBtn.addEventListener("click", clearAll);
  els.layoutSelect.addEventListener("change", () => {
    updateSummary();
    markSettingsChanged();
  });
  els.paddingInput.addEventListener("change", markSettingsChanged);
  els.qualitySelect.addEventListener("change", markSettingsChanged);
}

export function bindEvents() {
  bindBlobTracking();
  bindDropZone();
  bindActions();
}
