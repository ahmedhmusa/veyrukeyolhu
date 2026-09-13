// ===================================================================
// Maldives Fishing Log — Application
// ===================================================================

const State = {
  tab: "home",
  spots: [],
  catches: [],
  trips: [],
  theme: "system",
  units: "metric",
  userName: "Angler",
  gps: null, // {lat, lng}
  online: navigator.onLine,
  installEvent: null,
  activeTripId: null,
  tripTimer: null,
  mapObj: null,
  markerLayer: null,
  mapMode: "view", // "view" | "drop-pin"
  mapLayerType: "street", // "street" | "satellite"
  mapFilters: { species: "all", technique: "all", atoll: "all", favouriteOnly: false },
  catchFilters: { species: "all" },
  photoBuffer: [], // data URLs staged for the open form
  editingSpotId: null,
  editingCatchId: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const root = () => $("#app-root");

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------
function toast(msg, opts = {}) {
  const stack = $("#toast-stack");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span>${opts.icon || "✓"}</span><span>${esc(msg)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .25s ease, transform .25s ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px)";
    setTimeout(() => el.remove(), 260);
  }, opts.duration || 2200);
}

// ---------------------------------------------------------------
// Theme
// ---------------------------------------------------------------
function applyTheme() {
  const t = State.theme;
  const resolved = t === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : t;
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#060E15" : "#F3F7F9");
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
  if (State.theme === "system") applyTheme();
});

// ---------------------------------------------------------------
// Online / offline
// ---------------------------------------------------------------
window.addEventListener("online", () => { State.online = true; renderOfflineBanner(); toast("Back online"); });
window.addEventListener("offline", () => { State.online = false; renderOfflineBanner(); });

function renderOfflineBanner() {
  const el = $("#offline-banner");
  if (!el) return;
  el.classList.toggle("hidden", State.online);
}

// ---------------------------------------------------------------
// Init
// ---------------------------------------------------------------
async function initApp() {
  State.theme = await getSetting("theme", "system");
  State.units = await getSetting("units", "metric");
  State.userName = await getSetting("userName", "Angler");
  State.mapLayerType = await getSetting("mapLayerType", "street");
  applyTheme();

  await seedIfEmpty();
  await reloadAllData();

  renderShell();
  navigate(location.hash.replace("#", "") || "home");
  renderOfflineBanner();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    State.installEvent = e;
    const btn = $("#install-btn");
    if (btn) btn.classList.remove("hidden");
  });

  // Try a silent, best-effort location request for auto-fill convenience.
  tryQuickLocation();
}

async function reloadAllData() {
  State.spots = await dbGetAll("spots");
  State.catches = await dbGetAll("catches");
  State.trips = await dbGetAll("trips");
  State.spots.sort((a, b) => b.createdAt - a.createdAt);
  State.catches.sort((a, b) => b.datetime - a.datetime);
  State.trips.sort((a, b) => b.date - a.date);
}

function tryQuickLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => { State.gps = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
    () => {},
    { maximumAge: 300000, timeout: 4000 }
  );
}

// ---------------------------------------------------------------
// Icon library — minimal line icons (SVG, currentColor) used for
// navigation and UI chrome, in place of emoji.
// ---------------------------------------------------------------
const ICONS = {
  home: '<path d="M4 11.2 12 4l8 7.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 10v9.3c0 .4.3.7.7.7H10v-5.2h4V20h2.8c.4 0 .7-.3.7-.7V10" stroke-linecap="round" stroke-linejoin="round"/>',
  map: '<path d="M4 6.5 9 4.7l6 1.8 5-1.8v13l-5 1.8-6-1.8-5 1.8Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4.7v13M15 6.5v13" stroke-linecap="round"/>',
  anchor: '<path d="M4 15.2 Q12 17.6 20 15.2 L17.3 18.7 H6.7 Z" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="15.2" x2="12" y2="3.3" stroke-linecap="round"/><path d="M12 4.3 L17.3 13.2 L12 13.2" stroke-linecap="round" stroke-linejoin="round"/>',
  fish: '<path d="M2.7 12c0-3.3 3.1-5.5 6.6-5.5 3.9 0 6.9 2.1 8.9 5.5-2 3.4-5 5.5-8.9 5.5-3.5 0-6.6-2.2-6.6-5.5Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.6 9.7 22 7.2v9.6l-3.4-2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.8 9q-1.1 3 0 6" stroke-linecap="round"/><circle cx="7.6" cy="11" r=".85" fill="currentColor" stroke="none"/>',
  sliders: '<line x1="4" y1="7" x2="20" y2="7" stroke-linecap="round"/><circle cx="9" cy="7" r="2.1" fill="currentColor" stroke="none"/><line x1="4" y1="12.5" x2="20" y2="12.5" stroke-linecap="round"/><circle cx="15" cy="12.5" r="2.1" fill="currentColor" stroke="none"/><line x1="4" y1="18" x2="20" y2="18" stroke-linecap="round"/><circle cx="7" cy="18" r="2.1" fill="currentColor" stroke="none"/>',
  hook: '<path d="M9.2 3.6v7.3a3.3 3.3 0 0 0 6.6 0" stroke-linecap="round"/><circle cx="9.2" cy="3.6" r="1" fill="currentColor" stroke="none"/>',
  pin: '<path d="M12 21s6.5-6.1 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.9 6.5 11 6.5 11Z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.1"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.2"/><line x1="15.3" y1="15.3" x2="20" y2="20" stroke-linecap="round"/>',
  locate: '<circle cx="12" cy="12" r="2.3"/><path d="M12 3v3.2M12 17.8V21M3 12h3.2M17.8 12H21" stroke-linecap="round"/>',
  layers: '<path d="M12 3.5 3.5 8 12 12.5 20.5 8Z" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 12 12 16.5 20.5 12M3.5 16 12 20.5 20.5 16" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<line x1="12" y1="4.5" x2="12" y2="19.5" stroke-linecap="round"/><line x1="4.5" y1="12" x2="19.5" y2="12" stroke-linecap="round"/>',
  star: '<path d="M12 3.7l2.5 5.3 5.8.7-4.3 4 1.1 5.8L12 16.6l-5.1 2.9 1.1-5.8-4.3-4 5.8-.7Z" stroke-linecap="round" stroke-linejoin="round"/>',
  wifiOff: '<path d="M2 8.5a15 15 0 0 1 20 0" stroke-linecap="round"/><path d="M5.5 12.3a10 10 0 0 1 13 0" stroke-linecap="round"/><path d="M9 16a5 5 0 0 1 6 0" stroke-linecap="round"/><circle cx="12" cy="19.3" r="1" fill="currentColor" stroke="none"/><line x1="3" y1="3" x2="21" y2="21" stroke-linecap="round"/>',
  alert: '<path d="M12 3.6 21.5 20H2.5Z" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9.3" x2="12" y2="14" stroke-linecap="round"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
  check: '<path d="M4.5 12.5 9 17l10.5-11" stroke-linecap="round" stroke-linejoin="round"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0" stroke-linecap="round"/><path d="M5.5 12.3a10 10 0 0 1 13 0" stroke-linecap="round"/><path d="M9 16a5 5 0 0 1 6 0" stroke-linecap="round"/><circle cx="12" cy="19.3" r="1" fill="currentColor" stroke="none"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.5"/><line x1="3.5" y1="12" x2="20.5" y2="12" stroke-linecap="round"/><path d="M4.5 7.5h15M4.5 16.5h15" stroke-linecap="round"/>',
  x: '<line x1="5" y1="5" x2="19" y2="19" stroke-linecap="round"/><line x1="19" y1="5" x2="5" y2="19" stroke-linecap="round"/>',
};

// Icons sourced from an image (custom uploads) rendered via a CSS mask
// so they still adopt currentColor like the hand-drawn SVG icons above.
const MASK_ICONS = {
  tripBoat: "./icons/tab-trip-boat.png",
  catchHook: "./icons/tab-catch-hook.png",
};

function icon(name, size = 20) {
  if (MASK_ICONS[name]) {
    const src = MASK_ICONS[name];
    return `<span aria-hidden="true" style="display:inline-block; width:${size}px; height:${size}px; background-color:currentColor; -webkit-mask-image:url('${src}'); mask-image:url('${src}'); -webkit-mask-size:contain; mask-size:contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; -webkit-mask-position:center; mask-position:center;"></span>`;
  }
  const body = ICONS[name] || "";
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${body}</svg>`;
}

// ---------------------------------------------------------------
// Species icon — uses a custom image if the species defines one
// (e.g. Red Snapper), otherwise falls back to its emoji.
// ---------------------------------------------------------------
function speciesIconHTML(species, size = 20) {
  if (!species) return "";
  if (species.icon) {
    return `<img src="${species.icon}" alt="" style="width:${size}px; height:${size}px; border-radius:${Math.round(size * 0.28)}px; object-fit:cover; display:block;">`;
  }
  return `<span style="font-size:${size}px; line-height:1;">${species.emoji}</span>`;
}
function speciesIconById(id, size = 20) {
  return speciesIconHTML(Species.find((s) => s.id === id), size);
}

// ---------------------------------------------------------------
// Shell + tab bar
// ---------------------------------------------------------------
const TABS = [
  { id: "home", label: "Home", icon: "home" },
  { id: "map", label: "Map", icon: "map" },
  { id: "trips", label: "Trips", icon: "tripBoat" },
  { id: "catches", label: "Catches", icon: "catchHook" },
  { id: "more", label: "More", icon: "sliders" },
];

function renderShell() {
  const app = document.getElementById("app-shell");
  app.innerHTML = `
    <div id="offline-banner" class="offline-banner hidden" style="position:fixed; top:calc(var(--safe-top) + 8px); left:12px; right:12px; z-index:55;">
      <span>${icon("wifiOff", 16)}</span><span>Offline — changes are saved on this device and kept safe.</span>
    </div>
    <main id="app-root" class="app"></main>
    <button id="fab-log-catch" class="fab fab-icon-only" title="Log catch" aria-label="Log catch"><span class="tab-icon">${icon("hook", 22)}</span></button>
    <nav class="tabbar" id="tabbar">
      ${TABS.map((t) => `
        <button class="tab" data-tab="${t.id}">
          <span class="tab-icon">${icon(t.icon, 21)}</span>
          <span>${t.label}</span>
        </button>
      `).join("")}
    </nav>
    <div id="toast-stack" class="toast-stack"></div>
    <div id="sheet-root"></div>
  `;
  $$(".tab").forEach((btn) => btn.addEventListener("click", () => navigate(btn.dataset.tab)));
  $("#fab-log-catch").addEventListener("click", () => openCatchForm());
}

function navigate(tab) {
  if (!TABS.find((t) => t.id === tab)) tab = "home";
  State.tab = tab;
  location.hash = tab;
  $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  const fab = $("#fab-log-catch");
  fab.style.display = tab === "catches" ? "flex" : "none";

  const views = { home: renderHome, map: renderMap, trips: renderTrips, catches: renderCatches, more: renderMore };
  (views[tab] || renderHome)();
}
window.addEventListener("hashchange", () => navigate(location.hash.replace("#", "")));

// ---------------------------------------------------------------
// Sheet (bottom modal) helper
// ---------------------------------------------------------------
function openSheet(innerHTML, { tall = false, onClose = null } = {}) {
  const sheetRoot = $("#sheet-root");
  sheetRoot.innerHTML = `
    <div class="sheet-overlay" id="active-sheet-overlay">
      <div class="sheet ${tall ? "sheet-tall" : ""}" id="active-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-body">${innerHTML}</div>
      </div>
      <button class="sheet-float-close" id="sheet-float-close-btn" aria-label="Close">${icon("x", 18)}</button>
    </div>
  `;
  const overlay = $("#active-sheet-overlay");
  requestAnimationFrame(() => overlay.classList.add("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSheet();
  });
  $("#sheet-float-close-btn").addEventListener("click", closeSheet);
  overlay._onClose = onClose;
  return overlay;
}
function closeSheet() {
  const overlay = $("#active-sheet-overlay");
  if (!overlay) return;
  overlay.classList.remove("open");
  const cb = overlay._onClose;
  setTimeout(() => { $("#sheet-root").innerHTML = ""; if (cb) cb(); }, 260);
}

document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

// Kick off
document.addEventListener("DOMContentLoaded", initApp);
