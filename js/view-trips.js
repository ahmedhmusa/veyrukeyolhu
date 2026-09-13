// ===================================================================
// Trips view
// ===================================================================

function renderTrips() {
  const activeTrip = State.trips.find((t) => t.status === "active");
  if (activeTrip) State.activeTripId = activeTrip.id;

  root().innerHTML = `
    <div class="page-header">
      <h1>Trips</h1>
      <p>${State.trips.length} trip${State.trips.length === 1 ? "" : "s"} logged</p>
    </div>

    ${activeTrip ? liveTripCardHTML(activeTrip) : `
      <button class="btn btn-primary btn-block" id="new-trip-btn" style="margin-bottom:18px;">+ New Trip</button>
    `}

    <div class="section-title">${activeTrip ? "Past trips" : "All trips"}</div>
    <div class="card" style="padding:6px 10px;">
      ${State.trips.filter((t) => t.id !== activeTrip?.id).length === 0 ? `
        <div class="empty-state">
          <div class="icon">🎣</div>
          <h3>No trips yet</h3>
          <p>Start a trip to track live conditions and log catches as you go.</p>
        </div>
      ` : State.trips.filter((t) => t.id !== activeTrip?.id).map((t) => tripListItemHTML(t)).join("")}
    </div>
    <div class="spacer-lg"></div>
  `;

  $("#new-trip-btn")?.addEventListener("click", () => openTripForm());
  $$(".trip-list-item").forEach((el) => el.addEventListener("click", () => openTripDetail(el.dataset.id)));
  if (activeTrip) bindLiveTripCard(activeTrip);
}

function tripListItemHTML(t) {
  const d = new Date(t.date);
  const catchCount = (t.catchIds || []).length;
  return `
    <div class="list-item trip-list-item" data-id="${t.id}" style="cursor:pointer;">
      <div class="list-thumb placeholder">🎣</div>
      <div class="list-main">
        <div class="list-title">${esc(t.name)}</div>
        <div class="list-sub">${d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${esc(t.atoll || "")}</div>
      </div>
      <span class="badge grass">${catchCount} 🐟</span>
    </div>
  `;
}

function liveTripCardHTML(trip) {
  return `
    <div class="card score-card" id="live-trip-card">
      <div class="score-top">
        <div>
          <div class="score-label">🔴 LIVE TRIP</div>
          <div class="score-value-row"><span class="score-value" id="live-elapsed" style="font-size:32px;">00:00</span></div>
        </div>
        <span class="score-tag grass">${esc(trip.name)}</span>
      </div>
      <div class="grid-2" style="margin-top:14px;">
        <div class="stat-tile"><div class="stat-label">TIDE</div><div class="stat-value" id="live-tide" style="font-size:16px;">—</div></div>
        <div class="stat-tile"><div class="stat-label">WIND</div><div class="stat-value" id="live-wind" style="font-size:16px;">—</div></div>
      </div>
      <button class="btn btn-primary btn-block" id="live-log-catch-btn" style="margin-top:16px; padding:16px;">🎣 LOG CATCH</button>
      <button class="btn btn-ghost btn-block" id="end-trip-btn" style="margin-top:6px;">End Trip</button>
    </div>
  `;
}

function bindLiveTripCard(trip) {
  const updateElapsed = () => {
    const el = $("#live-elapsed");
    if (!el) return;
    const ms = Date.now() - trip.date;
    const totalMin = Math.floor(ms / 60000);
    const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
    const m = String(totalMin % 60).padStart(2, "0");
    el.textContent = `${h}:${m}`;
  };
  updateElapsed();
  if (State.tripTimer) clearInterval(State.tripTimer);
  State.tripTimer = setInterval(updateElapsed, 15000);

  const tide = getTideModel();
  const weather = getWeatherModel();
  $("#live-tide") && ($("#live-tide").textContent = `${tide.rising ? "↑" : "↓"} ${tide.currentHeight}m`);
  $("#live-wind") && ($("#live-wind").textContent = `${ktToMph(weather.windSpeed)}mph ${weather.windDir}`);

  $("#live-log-catch-btn").addEventListener("click", () => openCatchForm());
  $("#end-trip-btn").addEventListener("click", async () => {
    if (!confirm("End this trip?")) return;
    trip.status = "completed";
    trip.endTime = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    await dbPut("trips", trip);
    await reloadAllData();
    clearInterval(State.tripTimer);
    State.activeTripId = null;
    toast("Trip ended — nice work! 🎣");
    renderTrips();
  });
}

function openTripForm() {
  openSheet(`
    <div class="sheet-header"><h2>New Trip</h2></div>
    <div class="field"><label>Trip name</label><input type="text" id="trip-name" placeholder="e.g. Vaavu Channel Morning"></div>
    <div class="field-row">
      <div class="field"><label>Atoll</label><select id="trip-atoll">${Atolls.map((a) => `<option>${a}</option>`).join("")}</select></div>
      <div class="field"><label>Island</label><input type="text" id="trip-island" placeholder="e.g. Felidhoo"></div>
    </div>
    <div class="field"><label>Starting location</label><input type="text" id="trip-start-location" placeholder="e.g. Jetty name"></div>
    <div class="field-row">
      <div class="field"><label>Boat</label><input type="text" id="trip-boat" placeholder="e.g. Dhoni name"></div>
      <div class="field"><label>Partners</label><input type="text" id="trip-partners" placeholder="e.g. Ahmed, Ibrahim"></div>
    </div>
    <div class="field">
      <label>Target species</label>
      <div class="species-grid" id="trip-species-grid">
        ${Species.map((s) => `<button type="button" class="species-btn" data-id="${s.id}"><span class="em">${speciesIconHTML(s, 22)}</span>${esc(s.name)}</button>`).join("")}
      </div>
    </div>
    <div class="field"><label>Technique</label><select id="trip-technique">${Techniques.map((t) => `<option>${t}</option>`).join("")}</select></div>
    <div class="field"><label>Notes</label><textarea id="trip-notes" placeholder="Plan, goals, anything to remember..."></textarea></div>
    <div class="field-hint" style="margin-bottom:10px;">Starting this trip will automatically record your GPS location, tide, moon phase, Nakaiy and sunrise/sunset.</div>
    <button class="btn btn-primary btn-block" id="start-trip-btn">Start Trip</button>
  `, { tall: true });

  $$("#trip-species-grid .species-btn").forEach((btn) => btn.addEventListener("click", () => btn.classList.toggle("active")));

  $("#start-trip-btn").addEventListener("click", async () => {
    const name = $("#trip-name").value.trim();
    if (!name) { toast("Give your trip a name", { icon: icon("alert", 14) }); return; }
    const now = new Date();
    const tide = getTideModel(now);
    const moon = getMoonPhase(now);
    const nakaiy = getCurrentNakaiy(now);
    const weather = getWeatherModel(now);
    const record = {
      id: uid("trip"),
      name,
      date: Date.now(),
      startTime: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      endTime: null,
      startLocation: $("#trip-start-location").value.trim(),
      atoll: $("#trip-atoll").value,
      island: $("#trip-island").value.trim(),
      boat: $("#trip-boat").value.trim(),
      partners: $("#trip-partners").value.trim(),
      targetSpecies: $$("#trip-species-grid .species-btn.active").map((b) => b.dataset.id),
      technique: $("#trip-technique").value,
      weather: weather.condition,
      seaCondition: weather.waveHeight <= 0.8 ? "Calm" : weather.waveHeight <= 1.3 ? "Slight" : "Moderate",
      wind: `${ktToMph(weather.windSpeed)}mph ${weather.windDir}`,
      notes: $("#trip-notes").value.trim(),
      photos: [],
      catchIds: [],
      status: "active",
      gps: State.gps,
      startTide: tide.rising ? "Rising" : "Falling",
      startMoon: moon.name,
      startNakaiy: nakaiy.name,
    };
    await dbPut("trips", record);
    await reloadAllData();
    State.activeTripId = record.id;
    closeSheet();
    toast("Trip started — tight lines! 🎣");
    renderTrips();
  });
}

function openTripDetail(tripId) {
  const trip = State.trips.find((t) => t.id === tripId);
  if (!trip) return;
  const catches = State.catches.filter((c) => (trip.catchIds || []).includes(c.id));
  const d = new Date(trip.date);

  openSheet(`
    <div class="sheet-header"><h2>${esc(trip.name)}</h2></div>
    <div class="detail-row"><span class="k">Date</span><span class="v">${d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span></div>
    <div class="detail-row"><span class="k">Time</span><span class="v">${esc(trip.startTime || "—")}${trip.endTime ? " – " + esc(trip.endTime) : ""}</span></div>
    <div class="detail-row"><span class="k">Location</span><span class="v">${esc(trip.island || trip.atoll || "—")}</span></div>
    <div class="detail-row"><span class="k">Boat</span><span class="v">${esc(trip.boat || "—")}</span></div>
    <div class="detail-row"><span class="k">Partners</span><span class="v">${esc(trip.partners || "—")}</span></div>
    <div class="detail-row"><span class="k">Weather</span><span class="v">${esc(trip.weather || "—")} · ${esc(trip.wind || "")}</span></div>
    <div class="detail-row"><span class="k">Sea condition</span><span class="v">${esc(trip.seaCondition || "—")}</span></div>
    <div class="detail-row"><span class="k">Nakaiy</span><span class="v">${esc(trip.startNakaiy || "—")}</span></div>
    ${trip.notes ? `<div class="card card-tight" style="margin-top:12px;"><div style="font-size:13px; line-height:1.5;">${esc(trip.notes)}</div></div>` : ""}

    <div class="section-title">Catches on this trip (${catches.length})</div>
    <div class="card" style="padding:6px 10px;">
      ${catches.length === 0
        ? `<div class="empty-state" style="padding:24px 12px;"><p>No catches logged on this trip yet.</p></div>`
        : catches.map((c) => catchListItemHTML(c)).join("")}
    </div>

    ${trip.status !== "active" ? `<button class="btn btn-danger btn-block" id="delete-trip-btn" style="margin-top:14px;">Delete Trip</button>` : ""}
  `, { tall: true });

  $$(".catch-list-item").forEach((el) => el.addEventListener("click", () => openCatchDetail(el.dataset.id)));
  $("#delete-trip-btn")?.addEventListener("click", async () => {
    if (!confirm("Delete this trip? Catches logged on it will be kept.")) return;
    await dbDelete("trips", trip.id);
    await reloadAllData();
    closeSheet();
    toast("Trip deleted");
    renderTrips();
  });
}
