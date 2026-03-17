import { bindEvents } from "./events.js";
import { renderResults, updateSummary } from "./ui/render.js";
import { initPreferences } from "./ui/preferences.js";
import { initDevConsole } from "./ui/dev-console.js";

initPreferences();
initDevConsole();
bindEvents();
renderResults();
updateSummary();
