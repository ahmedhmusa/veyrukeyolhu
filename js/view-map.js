// ===================================================================
// Map view — Leaflet-based fishing spot map
// ===================================================================

const MARKER_ICONS = {
  gt: "🐟", tuna: "🐟", snapper: "🐟", grouper: "🐟",
  Jigging: "🎣", Popping: "🎣",
};

function markerEmojiFor(spot) {
  if (spot.favourite) return icon("star", 15);
  return icon("pin", 15);
}

function divIconFor(spot) {
  const emoji = markerEmojiFor(spot);
  const bg = spot.favourite ? "#C8933F" : "#A62E39";
  return L.divIcon({
    html: `<div style="background:${bg}; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; box-shadow:0 3px 8px rgba(0,0,0,0.35); border:2px solid white;">${emoji}</div>`,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function renderMap() {
  const filteredSpots = getFilteredSpots();
  root().innerHTML = `
    <div class="map-wrap">
      <div id="map-canvas"></div>
      <div class="map-controls-top">
        <div class="map-search">
          <span>${icon("search", 17)}</span>
          <input type="text" id="map-search-input" placeholder="Search spots, atolls, islands...">
          <button class="map-legend-icon-btn" id="legend-btn" title="Legend">${icon("layers", 16)}</button>
        </div>
        <div class="chip-row" id="map-filter-row" style="padding-bottom:0;">
          <button class="chip ${State.mapFilters.favouriteOnly ? "active" : ""}" id="filter-fav" style="display:inline-flex; align-items:center; gap:5px;">${icon("star", 14)} Favourites</button>
          <button class="chip" id="filter-species-btn">Species: ${State.mapFilters.species === "all" ? "All" : speciesLabel(State.mapFilters.species, "")}</button>
          <button class="chip" id="filter-atoll-btn">Atoll: ${State.mapFilters.atoll === "all" ? "All" : State.mapFilters.atoll.split(" ")[0]}</button>
        </div>
      </div>
      <button class="map-fab-locate" id="layer-toggle-btn" style="bottom:calc(var(--map-strip-height) + 108px);" title="Toggle satellite view">${icon("globe", 20)}</button>
      <button class="map-fab-locate" id="locate-btn" style="bottom:calc(var(--map-strip-height) + 54px);">${icon("locate", 20)}</button>
      <button class="fab" id="drop-pin-fab" style="left:18px; right:auto; bottom:calc(var(--nav-height) + var(--safe-bottom) + var(--map-strip-height) + 42px); background:linear-gradient(160deg, var(--lagoon), var(--lagoon-deep));">
        <span class="tab-icon">${icon("plus", 18)}</span>Add Spot
      </button>
      <div class="map-spots-strip" id="map-spots-strip">
        ${filteredSpots.length === 0 ? `
          <div class="map-spot-card map-spot-card-empty">
            <div class="map-spot-card-empty-icon">${icon("pin", 20)}</div>
            <div class="map-spot-card-empty-text">No spots saved yet — tap "Add Spot" to drop your first pin</div>
          </div>
        ` : filteredSpots.map((s) => mapSpotCardHTML(s)).join("")}
      </div>
    </div>
  `;

  const startCenter = State.gps || DEFAULT_LOCATION;
  const map = L.map("map-canvas", { zoomControl: false, attributionControl: false }).setView(
    [startCenter.lat, startCenter.lng], State.gps ? 12 : 7
  );
  L.control.attribution({ position: "topright", prefix: false }).addTo(map);

  const streetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "OpenStreetMap",
  });
  const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Esri, Maxar",
  });
  const satelliteLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    pane: "overlayPane",
  });
  State.baseLayers = { street: streetLayer, satellite: satelliteLayer, satelliteLabels };

  (State.mapLayerType === "satellite" ? [satelliteLayer, satelliteLabels] : [streetLayer]).forEach((l) => l.addTo(map));
  updateMapTint();

  // No separate zoom +/- control: pinch-to-zoom covers it on touch devices,
  // and it was competing for space with the locate/layer buttons.

  State.mapObj = map;
  State.markerLayer = L.layerGroup().addTo(map);

  if (State.gps) {
    L.circleMarker([State.gps.lat, State.gps.lng], { radius: 7, color: "#A62E39", fillColor: "#D5434F", fillOpacity: 0.9, weight: 2 })
      .addTo(map).bindPopup("You are here");
  }

  drawSpotMarkers();

  map.on("click", (e) => {
    if (State.mapMode === "drop-pin") {
      finishDropPin(e.latlng.lat, e.latlng.lng);
    }
  });

  $("#layer-toggle-btn").addEventListener("click", async () => {
    const isSatellite = State.mapLayerType === "satellite";
    const { street, satellite, satelliteLabels } = State.baseLayers;
    if (isSatellite) {
      map.removeLayer(satellite);
      map.removeLayer(satelliteLabels);
      street.addTo(map);
      State.mapLayerType = "street";
      toast("Street map");
    } else {
      map.removeLayer(street);
      satellite.addTo(map);
      satelliteLabels.addTo(map);
      State.mapLayerType = "satellite";
      toast("Satellite view");
    }
    updateMapTint();
    await setSetting("mapLayerType", State.mapLayerType);
  });

  $("#locate-btn").addEventListener("click", () => {
    if (!navigator.geolocation) { toast("Location not available on this device"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        State.gps = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setView([State.gps.lat, State.gps.lng], 13);
        toast("Location updated");
      },
      () => toast("Couldn't get location", { icon: icon("alert", 14) }),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  $("#drop-pin-fab").addEventListener("click", () => startDropPin());
  $("#filter-fav").addEventListener("click", () => {
    State.mapFilters.favouriteOnly = !State.mapFilters.favouriteOnly;
    renderMap();
  });
  $("#filter-species-btn").addEventListener("click", () => openMapFilterSheet("species"));
  $("#filter-atoll-btn").addEventListener("click", () => openMapFilterSheet("atoll"));
  $("#legend-btn").addEventListener("click", openLegendSheet);

  $$(".map-spot-card[data-id]").forEach((card) => card.addEventListener("click", () => {
    const spot = State.spots.find((s) => s.id === card.dataset.id);
    if (!spot) return;
    map.setView([spot.lat, spot.lng], 14);
    const marker = State.spotMarkers?.[spot.id];
    if (marker) marker.openPopup();
  }));

  $("#map-search-input").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { drawSpotMarkers(); return; }
    const matches = getFilteredSpots().filter((s) =>
      s.name.toLowerCase().includes(q) || s.atoll.toLowerCase().includes(q) || (s.island || "").toLowerCase().includes(q)
    );
    drawSpotMarkers(matches);
    if (matches.length === 1) map.setView([matches[0].lat, matches[0].lng], 14);
  });
}

// Tints the OSM street tiles toward the app's ocean palette so the map
// doesn't look like a bare, generic embed. Satellite imagery is left
// untouched since filtering photo tiles looks bad.
function updateMapTint() {
  const canvas = $("#map-canvas");
  if (!canvas) return;
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    || (State.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (State.mapLayerType === "satellite") {
    canvas.style.filter = isDark ? "brightness(0.82) saturate(1.05)" : "none";
    return;
  }
  canvas.style.filter = isDark
    ? "invert(1) hue-rotate(185deg) brightness(0.95) contrast(0.9) saturate(0.9)"
    : "saturate(1.15) hue-rotate(-4deg) brightness(1.02)";
}

function mapSpotCardHTML(s) {
  const speciesTxt = (s.targetSpecies || []).slice(0, 2).map((id) => speciesLabel(id, "")).join(", ");
  return `
    <div class="map-spot-card" data-id="${s.id}">
      <div class="map-spot-card-icon" style="background:${s.favourite ? "#C8933F" : "#A62E39"};">${s.favourite ? icon("star", 15) : icon("pin", 15)}</div>
      <div class="map-spot-card-name">${esc(s.name)}</div>
      <div class="map-spot-card-meta">${esc(s.atoll.split(" ")[0])}${speciesTxt ? " · " + esc(speciesTxt) : ""}</div>
    </div>
  `;
}

function getFilteredSpots() {
  return State.spots.filter((s) => {
    if (State.mapFilters.favouriteOnly && !s.favourite) return false;
    if (State.mapFilters.species !== "all" && !(s.targetSpecies || []).includes(State.mapFilters.species)) return false;
    if (State.mapFilters.atoll !== "all" && s.atoll !== State.mapFilters.atoll) return false;
    return true;
  });
}

function drawSpotMarkers(customList = null) {
  if (!State.markerLayer) return;
  State.markerLayer.clearLayers();
  State.spotMarkers = {};
  const list = customList || getFilteredSpots();
  list.forEach((spot) => {
    const marker = L.marker([spot.lat, spot.lng], { icon: divIconFor(spot) });
    marker.bindPopup(spotPopupHTML(spot));
    marker.on("popupopen", () => bindSpotPopupActions(spot.id));
    marker.addTo(State.markerLayer);
    State.spotMarkers[spot.id] = marker;
  });
}

function spotPopupHTML(spot) {
  return `
    <div class="spot-popup">
      <div class="name">${esc(spot.name)}${spot.favourite ? ` ${icon("star", 13)}` : ""}</div>
      <div class="meta">${esc(spot.atoll)} · ${esc(spot.depth || "")}</div>
      <div class="meta">${(spot.targetSpecies || []).map((id) => speciesLabel(id, "")).join(", ")}</div>
      <div class="actions">
        <button data-action="view" data-id="${spot.id}" style="background:var(--lagoon-tint); color:var(--lagoon-deep);">Details</button>
        <button data-action="catch" data-id="${spot.id}" style="background:var(--coral-tint); color:var(--coral);">Log Catch</button>
      </div>
    </div>
  `;
}

function bindSpotPopupActions(spotId) {
  $$(`.spot-popup button[data-id="${spotId}"]`).forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.action === "view") openSpotDetail(spotId);
      if (btn.dataset.action === "catch") openCatchForm(spotId);
    });
  });
}

// ---------------------------------------------------------------
// Drop pin / add spot flow
// ---------------------------------------------------------------
function startDropPin() {
  State.mapMode = "drop-pin";
  toast("Tap the map to drop a pin", { icon: icon("pin", 14) });
  const fab = $("#drop-pin-fab");
  if (fab) { fab.innerHTML = "<span>✕</span>Cancel"; fab.onclick = () => { State.mapMode = "view"; renderMap(); }; }
}

function finishDropPin(lat, lng) {
  State.mapMode = "view";
  openSpotForm({ lat, lng });
}

function openSpotForm(spot = {}) {
  const isEdit = !!spot.id;
  State.editingSpotId = spot.id || null;
  State.photoBuffer = spot.photos ? [...spot.photos] : [];

  openSheet(`
    <div class="sheet-header"><h2>${isEdit ? "Edit Spot" : "New Fishing Spot"}</h2></div>

    <div class="field"><label>Spot name</label><input type="text" id="spot-name" value="${esc(spot.name || "")}" placeholder="e.g. Channel Drop-off"></div>

    <div class="field-row">
      <div class="field"><label>Latitude</label><input type="number" step="0.0001" id="spot-lat" value="${spot.lat ?? ""}"></div>
      <div class="field"><label>Longitude</label><input type="number" step="0.0001" id="spot-lng" value="${spot.lng ?? ""}"></div>
    </div>

    <div class="field-row">
      <div class="field">
        <label>Atoll</label>
        <select id="spot-atoll">${Atolls.map((a) => `<option ${a === spot.atoll ? "selected" : ""}>${a}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Island / area</label><input type="text" id="spot-island" value="${esc(spot.island || "")}"></div>
    </div>

    <div class="field-row">
      <div class="field"><label>Depth</label><input type="text" id="spot-depth" value="${esc(spot.depth || "")}" placeholder="e.g. 10-30m"></div>
      <div class="field">
        <label>Technique</label>
        <select id="spot-technique">${Techniques.map((t) => `<option ${t === spot.technique ? "selected" : ""}>${t}</option>`).join("")}</select>
      </div>
    </div>

    <div class="field"><label>Structure</label><input type="text" id="spot-structure" value="${esc(spot.structure || "")}" placeholder="e.g. Reef pinnacle, channel wall"></div>

    <div class="field">
      <label>Target species</label>
      <div class="species-grid" id="spot-species-grid">
        ${Species.map((s) => `<button type="button" class="species-btn ${((spot.targetSpecies || []).includes(s.id)) ? "active" : ""}" data-id="${s.id}"><span class="em">${speciesIconHTML(s, 22)}</span>${esc(s.name)}</button>`).join("")}
      </div>
    </div>

    <div class="field-row">
      <div class="field"><label>Best tide</label><input type="text" id="spot-best-tide" value="${esc(spot.bestTide || "")}" placeholder="e.g. Incoming"></div>
      <div class="field"><label>Best time</label><input type="text" id="spot-best-time" value="${esc(spot.bestTime || "")}" placeholder="e.g. Dawn"></div>
    </div>

    <div class="field">
      <label>Photos</label>
      <div class="photo-picker" id="spot-photo-picker">
        <label class="photo-add">＋<span>Add</span><input type="file" accept="image/*" capture="environment" multiple id="spot-photo-input" style="display:none;"></label>
        ${(spot.photos || []).map((p) => `<div class="photo-thumb"><img src="${p}"></div>`).join("")}
      </div>
    </div>

    <div class="field"><label>Notes</label><textarea id="spot-notes" placeholder="Anything worth remembering about this spot...">${esc(spot.notes || "")}</textarea></div>

    <div class="settings-row" style="border:none; padding:4px;">
      <span class="settings-label" style="display:inline-flex; align-items:center; gap:6px;">${icon("star", 15)} Favourite spot</span>
      <button type="button" class="switch ${spot.favourite ? "on" : ""}" id="spot-fav-toggle"></button>
    </div>

    <div class="field-hint" style="margin-bottom:10px;">Your exact coordinates stay private on this device — nothing is shared publicly.</div>

    <div class="sheet-actions">
      ${isEdit ? `<button class="btn btn-danger" id="delete-spot-btn">Delete</button>` : ""}
      <button class="btn btn-primary btn-block" id="save-spot-btn">${isEdit ? "Save Changes" : "Save Spot"}</button>
    </div>
  `, { tall: true });

  $("#spot-photo-input").addEventListener("change", (e) => handlePhotoInput(e, "#spot-photo-picker"));
  $("#spot-fav-toggle").addEventListener("click", (e) => e.target.classList.toggle("on"));
  $$("#spot-species-grid .species-btn").forEach((btn) => btn.addEventListener("click", () => btn.classList.toggle("active")));

  $("#delete-spot-btn")?.addEventListener("click", async () => {
    if (!confirm("Delete this fishing spot?")) return;
    await dbDelete("spots", spot.id);
    await reloadAllData();
    closeSheet();
    toast("Spot deleted");
    renderMap();
  });

  $("#save-spot-btn").addEventListener("click", async () => {
    const name = $("#spot-name").value.trim();
    const lat = parseFloat($("#spot-lat").value);
    const lng = parseFloat($("#spot-lng").value);
    if (!name || isNaN(lat) || isNaN(lng)) { toast("Name and coordinates are required", { icon: icon("alert", 14) }); return; }
    const targetSpecies = $$("#spot-species-grid .species-btn.active").map((b) => b.dataset.id);
    const record = {
      id: spot.id || uid("spot"),
      name, lat, lng,
      atoll: $("#spot-atoll").value,
      island: $("#spot-island").value.trim(),
      depth: $("#spot-depth").value.trim(),
      structure: $("#spot-structure").value.trim(),
      technique: $("#spot-technique").value,
      targetSpecies,
      bestTide: $("#spot-best-tide").value.trim(),
      bestTime: $("#spot-best-time").value.trim(),
      favourite: $("#spot-fav-toggle").classList.contains("on"),
      notes: $("#spot-notes").value.trim(),
      photos: [...State.photoBuffer],
      successCount: spot.successCount || 0,
      createdAt: spot.createdAt || Date.now(),
    };
    await dbPut("spots", record);
    await reloadAllData();
    closeSheet();
    toast(State.online ? "Spot saved ✓" : "Saved offline ✓", { icon: State.online ? icon("check", 14) : icon("wifiOff", 14) });
    renderMap();
  });
}

function openSpotDetail(spotId) {
  const spot = State.spots.find((s) => s.id === spotId);
  if (!spot) return;
  const catches = State.catches.filter((c) => c.spotId === spotId);
  openSheet(`
    <div class="sheet-header"><h2>${esc(spot.name)}</h2></div>
    ${spot.photos && spot.photos.length ? `<img class="catch-hero" src="${spot.photos[0]}" style="margin-bottom:14px;">` : ""}
    <div class="detail-row"><span class="k">Atoll</span><span class="v">${esc(spot.atoll)}</span></div>
    <div class="detail-row"><span class="k">Island / area</span><span class="v">${esc(spot.island || "—")}</span></div>
    <div class="detail-row"><span class="k">Depth</span><span class="v">${esc(spot.depth || "—")}</span></div>
    <div class="detail-row"><span class="k">Structure</span><span class="v">${esc(spot.structure || "—")}</span></div>
    <div class="detail-row"><span class="k">Technique</span><span class="v">${esc(spot.technique || "—")}</span></div>
    <div class="detail-row"><span class="k">Target species</span><span class="v">${(spot.targetSpecies || []).map((id) => speciesLabel(id, "")).join(", ") || "—"}</span></div>
    <div class="detail-row"><span class="k">Best tide</span><span class="v">${esc(spot.bestTide || "—")}</span></div>
    <div class="detail-row"><span class="k">Best time</span><span class="v">${esc(spot.bestTime || "—")}</span></div>
    <div class="detail-row"><span class="k">Catches logged here</span><span class="v">${catches.length}</span></div>
    ${spot.notes ? `<div class="card card-tight" style="margin-top:12px;"><div style="font-size:13px; line-height:1.5;">${esc(spot.notes)}</div></div>` : ""}
    <div class="sheet-actions" style="margin-top:16px;">
      <button class="btn btn-secondary btn-block" id="edit-spot-btn">Edit</button>
      <button class="btn btn-primary btn-block" id="log-catch-here-btn">🎣 Log Catch</button>
    </div>
  `, { tall: true });
  $("#edit-spot-btn").addEventListener("click", () => openSpotForm(spot));
  $("#log-catch-here-btn").addEventListener("click", () => openCatchForm(spot.id));
}

function openMapFilterSheet(kind) {
  const isSpecies = kind === "species";
  const options = isSpecies ? [{ id: "all", name: "All species" }, ...Species] : ["all", ...Atolls];
  openSheet(`
    <div class="sheet-header"><h2>Filter by ${isSpecies ? "species" : "atoll"}</h2></div>
    <div class="chip-row" style="flex-wrap:wrap; overflow:visible;" id="filter-options">
      ${isSpecies
        ? options.map((o) => `<button class="chip ${State.mapFilters.species === o.id ? "active" : ""}" data-val="${o.id}">${o.emoji || ""} ${esc(o.name)}</button>`).join("")
        : options.map((o) => `<button class="chip ${State.mapFilters.atoll === o ? "active" : ""}" data-val="${o}">${esc(o === "all" ? "All atolls" : o)}</button>`).join("")}
    </div>
  `);
  $$("#filter-options .chip").forEach((chip) => chip.addEventListener("click", () => {
    if (isSpecies) State.mapFilters.species = chip.dataset.val;
    else State.mapFilters.atoll = chip.dataset.val;
    closeSheet();
    renderMap();
  }));
}

function openLegendSheet() {
  openSheet(`
    <div class="sheet-header"><h2>Map legend</h2></div>
    <div class="detail-row"><span class="k" style="display:inline-flex; align-items:center; gap:6px;">${icon("star", 15)} Gold marker</span><span class="v">Favourite spot</span></div>
    <div class="detail-row"><span class="k" style="display:inline-flex; align-items:center; gap:6px;">${icon("pin", 15)} Red marker</span><span class="v">General fishing spot</span></div>
    <div class="detail-row"><span class="k">Red dot</span><span class="v">Your current location</span></div>
    <div class="field-hint" style="margin-top:10px;">Tap any marker for quick details, or "Add Spot" then tap the map to drop a pin.</div>
  `);
}
