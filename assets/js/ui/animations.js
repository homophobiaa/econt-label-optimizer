import { els } from "../state/app-state.js";

/* ── Blob cursor tracking ── */
export function bindBlobTracking() {
  document.addEventListener("mousemove", (event) => {
    if (!els.blob) return;
    els.blob.style.transform = "translate3d(calc(" + event.clientX + "px - 50%), calc(" + event.clientY + "px - 50%), 0)";
  });
}

/* ── Global drag overlay + floating particles ── */
let dragOverlay = null;
let dragCounter = 0;
let dragParticles = [];
let dragParticleTimer = null;

export function createDragOverlay() {
  dragOverlay = document.createElement("div");
  dragOverlay.className = "drag-overlay";
  document.body.appendChild(dragOverlay);
}

export function showDragOverlay() {
  dragCounter++;
  if (dragCounter === 1) {
    dragOverlay.classList.add("active");
    startDragParticles();
  }
}

export function hideDragOverlay() {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dragOverlay.classList.remove("active");
    stopDragParticles();
  }
}

export function resetDragOverlay() {
  dragCounter = 0;
  dragOverlay.classList.remove("active");
  stopDragParticles();
}

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

/* ── Airwave (file-drop projectile) ── */
export function spawnAirwave(fromX, fromY) {
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

  const ring = document.createElement("div");
  ring.className = "airwave-ring";
  ring.style.left = x + "px";
  ring.style.top = y + "px";
  ring.style.width = "60px";
  ring.style.height = "60px";
  document.body.appendChild(ring);
  ring.addEventListener("animationend", () => ring.remove());

  els.dropZone.classList.add("drop-flash");
  setTimeout(() => els.dropZone.classList.remove("drop-flash"), 550);
}
