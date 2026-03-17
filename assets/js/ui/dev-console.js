import { els } from "../state/app-state.js";

const MAX_ENTRIES = 200;
const LEVEL_CLASS = { log: "", info: "dev-info", warn: "dev-warn", error: "dev-error" };

function timestamp() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" +
    String(d.getMinutes()).padStart(2, "0") + ":" +
    String(d.getSeconds()).padStart(2, "0") + "." +
    String(d.getMilliseconds()).padStart(3, "0");
}

function appendEntry(level, args) {
  if (els.devConsole.hidden) return;

  const log = els.devConsoleLog;
  const entry = document.createElement("div");
  entry.className = "dev-entry " + (LEVEL_CLASS[level] || "");

  const time = document.createElement("span");
  time.className = "dev-time";
  time.textContent = timestamp();
  entry.appendChild(time);

  const msg = document.createElement("span");
  msg.className = "dev-msg";
  msg.textContent = args.map((a) =>
    typeof a === "object" ? JSON.stringify(a, null, 1) : String(a)
  ).join(" ");
  entry.appendChild(msg);

  log.appendChild(entry);

  while (log.children.length > MAX_ENTRIES) {
    log.removeChild(log.firstChild);
  }

  log.scrollTop = log.scrollHeight;
}

export function initDevConsole() {
  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args) => { original.log(...args); appendEntry("log", args); };
  console.info = (...args) => { original.info(...args); appendEntry("info", args); };
  console.warn = (...args) => { original.warn(...args); appendEntry("warn", args); };
  console.error = (...args) => { original.error(...args); appendEntry("error", args); };

  window.addEventListener("error", (event) => {
    appendEntry("error", ["Uncaught: " + event.message, "at " + event.filename + ":" + event.lineno]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    appendEntry("error", ["Unhandled rejection:", event.reason]);
  });

  els.devClearBtn.addEventListener("click", () => {
    els.devConsoleLog.innerHTML = "";
  });

  els.devCloseBtn.addEventListener("click", () => {
    els.devConsole.hidden = true;
  });

  console.info("Developer console initialized");
}
