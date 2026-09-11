// ===================================================================
// Catches view
// ===================================================================

function speciesLabel(id, custom) {
  if (id === "other" && custom) return custom;
  const s = Species.find((s) => s.id === id);
  return s ? s.name : (custom || "Unknown");
}
function speciesEmoji(id) {
  const s = Species.find((s) => s.id === id);
  return s ? s.emoji : "🐠";
}

function renderCatches() {
  const filtered = State.catchFilters.species === "all"
    ? State.catches
    : State.catches.filter((c) => c.species === State.catchFilters.species);

  root().innerHTML = `
    <div class="page-header">
      <h1>Catches</h1>
      <p>${State.catches.length} logged catch${State.catches.length === 1 ? "" : "es"}</p>
    </div>
    <div class="chip-row" id="catch-species-filter">
      <button class="chip ${State.catchFilters.species === "all" ? "active" : ""}" data-sp="all">All</button>
      ${Species.map((s) => `<button class="chip ${State.catchFilters.species === s.id ? "active" : ""}" data-sp="${s.id}">${s.emoji} ${esc(s.name)}</button>`).join("")}
    </div>
    <div class="card" style="padding:6px 10px;">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🐟</div>
          <h3>No catches yet</h3>
          <p>Tap "Log Catch" to record your first one — it takes under 20 seconds.</p>
          <button class="btn btn-primary" id="empty-log-catch">🎣 Log Catch</button>
        </div>
      ` : filtered.map((c) => catchListItemHTML(c)).join("")}
    </div>
    <div class="spacer-lg"></div>
  `;

  $$("#catch-species-filter .chip").forEach((chip) => chip.addEventListener("click", () => {
    State.catchFilters.species = chip.dataset.sp;
    renderCatches();
  }));
  $$(".catch-list-item").forEach((el) => el.addEventListener("click", () => openCatchDetail(el.dataset.id)));
  $("#empty-log-catch")?.addEventListener("click", () => openCatchForm());
}

function catchListItemHTML(c) {
  const d = new Date(c.datetime);
  const thumb = c.photos && c.photos[0]
    ? `<img class="list-thumb" src="${c.photos[0]}" alt="">`
    : `<div class="list-thumb placeholder">${speciesEmoji(c.species)}</div>`;
  return `
    <div class="list-item catch-list-item" data-id="${c.id}" style="cursor:pointer;">
      ${thumb}
      <div class="list-main">
        <div class="list-title">${esc(speciesLabel(c.species, c.customSpecies))}</div>
        <div class="list-sub">${c.weight ? c.weight + " kg · " : ""}${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })} · ${esc(c.technique || "")}</div>
      </div>
      <span class="list-chevron">›</span>
    </div>
  `;
}

// ---------------------------------------------------------------
// Quick catch log — fast entry, auto-filled context
// ---------------------------------------------------------------
function openCatchForm(prefillSpotId = null) {
  State.editingCatchId = null;
  State.photoBuffer = [];
  const now = new Date();
  const tide = getTideModel(now);
  const moon = getMoonPhase(now);
  const nakaiy = getCurrentNakaiy(now);
  const weather = getWeatherModel(now);
  const gps = State.gps;

  openSheet(`
    <div class="sheet-header"><h2>Log Catch</h2><button class="sheet-close" id="sheet-close-btn">✕</button></div>

    <div class="field">
      <label>Species</label>
      <div class="species-grid" id="species-grid">
        ${Species.map((s) => `<button type="button" class="species-btn" data-id="${s.id}"><span class="em">${s.emoji}</span>${esc(s.name)}</button>`).join("")}
      </div>
      <input type="text" id="custom-species-input" placeholder="Custom species name" class="hidden" style="margin-top:8px;">
    </div>

    <div class="field-row">
      <div class="field"><label>Weight (kg)</label><input type="number" step="0.1" id="catch-weight" placeholder="e.g. 12.5"></div>
      <div class="field"><label>Length (cm)</label><input type="number" step="1" id="catch-length" placeholder="e.g. 90"></div>
    </div>

    <div class="field">
      <label>Fishing spot ${State.spots.length ? "" : "<span class='field-hint'>(none saved yet)</span>"}</label>
      <select id="catch-spot">
        <option value="">— None / not saved —</option>
        ${State.spots.map((s) => `<option value="${s.id}" ${s.id === prefillSpotId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}
      </select>
    </div>

    <div class="field-row">
      <div class="field">
        <label>Technique</label>
        <select id="catch-technique">${Techniques.map((t) => `<option>${t}</option>`).join("")}</select>
      </div>
      <div class="field"><label>Lure / bait</label><input type="text" id="catch-lure" placeholder="e.g. 250g jig"></div>
    </div>

    <div class="field">
      <label>Photos</label>
      <div class="photo-picker" id="photo-picker">
        <label class="photo-add">＋<span>Add</span><input type="file" accept="image/*" capture="environment" multiple id="photo-input" style="display:none;"></label>
      </div>
    </div>

    <div class="field">
      <label>Notes</label>
      <textarea id="catch-notes" placeholder="How, where, anything worth remembering..."></textarea>
    </div>

    <div class="card card-tight" style="background:var(--lagoon-tint); border:none;">
      <div style="font-size:12px; font-weight:700; color:var(--lagoon-deep); margin-bottom:6px;">AUTO-FILLED FOR THIS CATCH</div>
      <div style="font-size:13px; line-height:1.5; color:var(--text-primary);">
        📍 ${gps ? gps.lat.toFixed(4) + ", " + gps.lng.toFixed(4) : "Location unavailable"}<br>
        🌊 Tide: ${tide.rising ? "Rising" : "Falling"}, ${tide.currentHeight} m &nbsp; · &nbsp; ${moon.emoji} ${moon.name}<br>
        📅 ${esc(nakaiy.name)} Nakaiy &nbsp; · &nbsp; ${esc(weather.condition)}, ${weather.windSpeed}kt ${weather.windDir}
      </div>
    </div>

    <button class="btn btn-primary btn-block" id="save-catch-btn" style="margin-top:8px;">Save Catch</button>
  `, { tall: true });

  let selectedSpecies = null;
  $$("#species-grid .species-btn").forEach((btn) => btn.addEventListener("click", () => {
    $$("#species-grid .species-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSpecies = btn.dataset.id;
    $("#custom-species-input").classList.toggle("hidden", selectedSpecies !== "other");
  }));

  $("#sheet-close-btn").addEventListener("click", closeSheet);
  $("#photo-input").addEventListener("change", (e) => handlePhotoInput(e, "#photo-picker"));

  $("#save-catch-btn").addEventListener("click", async () => {
    if (!selectedSpecies) { toast("Pick a species first", { icon: icon("alert", 14) }); return; }
    const record = {
      id: uid("catch"),
      species: selectedSpecies,
      customSpecies: selectedSpecies === "other" ? $("#custom-species-input").value.trim() : "",
      weight: parseFloat($("#catch-weight").value) || null,
      length: parseFloat($("#catch-length").value) || null,
      datetime: Date.now(),
      lat: gps?.lat || null,
      lng: gps?.lng || null,
      spotId: $("#catch-spot").value || null,
      technique: $("#catch-technique").value,
      lure: $("#catch-lure").value.trim(),
      tide: tide.rising ? "Rising" : "Falling",
      nakaiy: nakaiy.name,
      moon: moon.name,
      weather: weather.condition,
      wind: `${weather.windSpeed}kt ${weather.windDir}`,
      photos: [...State.photoBuffer],
      notes: $("#catch-notes").value.trim(),
    };
    await dbPut("catches", record);
    await reloadAllData();
    closeSheet();
    toast(State.online ? "Catch saved ✓" : "Saved offline ✓", { icon: State.online ? icon("check", 14) : icon("wifiOff", 14) });
    if (State.tab === "catches") renderCatches();
    if (State.tab === "home") renderHome();
    if (State.activeTripId) {
      const trip = State.trips.find((t) => t.id === State.activeTripId);
      if (trip) {
        trip.catchIds = [...(trip.catchIds || []), record.id];
        await dbPut("trips", trip);
        await reloadAllData();
        if (State.tab === "trips") renderTrips();
      }
    }
  });
}

function handlePhotoInput(e, pickerSelector) {
  const files = Array.from(e.target.files || []);
  const picker = $(pickerSelector);
  files.forEach((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      State.photoBuffer.push(dataUrl);
      const thumb = document.createElement("div");
      thumb.className = "photo-thumb";
      thumb.innerHTML = `<img src="${dataUrl}"><button class="rm" type="button">✕</button>`;
      thumb.querySelector(".rm").addEventListener("click", () => {
        const idx = State.photoBuffer.indexOf(dataUrl);
        if (idx > -1) State.photoBuffer.splice(idx, 1);
        thumb.remove();
      });
      picker.insertBefore(thumb, picker.firstChild);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = "";
}

// ---------------------------------------------------------------
// Catch detail — photo-first
// ---------------------------------------------------------------
function openCatchDetail(catchId) {
  const c = State.catches.find((x) => x.id === catchId);
  if (!c) return;
  const spot = c.spotId ? State.spots.find((s) => s.id === c.spotId) : null;
  const trip = State.trips.find((t) => (t.catchIds || []).includes(c.id));
  const d = new Date(c.datetime);

  const heroHTML = c.photos && c.photos.length
    ? `<img class="catch-hero" src="${c.photos[0]}" alt="">`
    : `<div class="catch-hero placeholder">${speciesEmoji(c.species)}</div>`;

  openSheet(`
    <div class="sheet-header"><h2>Catch details</h2><button class="sheet-close" id="sheet-close-btn">✕</button></div>
    ${heroHTML}
    ${c.photos && c.photos.length > 1 ? `
      <div class="photo-picker" style="margin-top:8px;">
        ${c.photos.map((p) => `<div class="photo-thumb"><img src="${p}"></div>`).join("")}
      </div>` : ""}
    <div class="catch-title-row">
      <div>
        <div class="catch-species">${esc(speciesLabel(c.species, c.customSpecies))}</div>
      </div>
      <button class="btn btn-ghost btn-sm" id="delete-catch-btn">Delete</button>
    </div>
    <div class="catch-metrics">
      ${c.weight ? `<div class="catch-metric"><div class="v">${c.weight} kg</div><div class="k">WEIGHT</div></div>` : ""}
      ${c.length ? `<div class="catch-metric"><div class="v">${c.length} cm</div><div class="k">LENGTH</div></div>` : ""}
    </div>

    <div style="margin-top:16px;">
      <div class="detail-row"><span class="k">Date &amp; time</span><span class="v">${d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
      <div class="detail-row"><span class="k">Location</span><span class="v">${spot ? esc(spot.name) : (c.lat ? c.lat.toFixed(4) + ", " + c.lng.toFixed(4) : "—")}</span></div>
      <div class="detail-row"><span class="k">Technique</span><span class="v">${esc(c.technique || "—")}</span></div>
      <div class="detail-row"><span class="k">Lure / bait</span><span class="v">${esc(c.lure || "—")}</span></div>
      <div class="detail-row"><span class="k">Tide</span><span class="v">${esc(c.tide || "—")}</span></div>
      <div class="detail-row"><span class="k">Nakaiy</span><span class="v">${esc(c.nakaiy || "—")}</span></div>
      <div class="detail-row"><span class="k">Moon</span><span class="v">${esc(c.moon || "—")}</span></div>
      <div class="detail-row"><span class="k">Weather</span><span class="v">${esc(c.weather || "—")} · ${esc(c.wind || "")}</span></div>
    </div>
    ${c.notes ? `<div class="card card-tight" style="margin-top:14px;"><div style="font-size:13px; line-height:1.5;">${esc(c.notes)}</div></div>` : ""}

    <div class="sheet-actions" style="margin-top:16px;">
      ${c.lat ? `<button class="btn btn-secondary btn-block" id="view-on-map-btn">View on Map</button>` : ""}
      ${trip ? `<button class="btn btn-secondary btn-block" id="view-trip-btn">View Trip</button>` : ""}
    </div>
  `, { tall: true });

  $("#sheet-close-btn").addEventListener("click", closeSheet);
  $("#delete-catch-btn").addEventListener("click", async () => {
    if (!confirm("Delete this catch? This can't be undone.")) return;
    await dbDelete("catches", c.id);
    await reloadAllData();
    closeSheet();
    toast("Catch deleted");
    if (State.tab === "catches") renderCatches();
  });
  $("#view-on-map-btn")?.addEventListener("click", () => {
    closeSheet();
    navigate("map");
    setTimeout(() => { if (State.mapObj) State.mapObj.setView([c.lat, c.lng], 14); }, 300);
  });
  $("#view-trip-btn")?.addEventListener("click", () => {
    closeSheet();
    navigate("trips");
    setTimeout(() => openTripDetail(trip.id), 200);
  });
}
