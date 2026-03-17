import { bindEvents } from "./events.js";
import { renderResults, updateSummary } from "./ui/render.js";
import { initPreferences } from "./ui/preferences.js";

initPreferences();
bindEvents();
renderResults();
updateSummary();
