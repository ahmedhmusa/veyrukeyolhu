// ===================================================================
// More / Settings view
// ===================================================================

function renderMore() {
  const initials = (State.userName || "A").trim().slice(0, 2).toUpperCase();
  root().innerHTML = `
    <div class="page-header"><h1>More</h1><p>Your profile &amp; app settings</p></div>

    <div class="card">
      <div class="avatar-block">
        <div class="avatar-circle">${esc(initials)}</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:16px;">${esc(State.userName)}</div>
          <div style="font-size:12.5px; color:var(--text-secondary);">${State.catches.length} catches · ${State.trips.length} trips · ${State.spots.length} spots</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="edit-name-btn">Edit</button>
      </div>
    </div>

    <div class="section-title">Appearance</div>
    <div class="card">
      <div class="settings-row">
        <span class="settings-label">🎨 Theme</span>
        <div class="segmented" style="width:180px;">
          <button data-theme-opt="light" class="${State.theme === "light" ? "active" : ""}">Light</button>
          <button data-theme-opt="dark" class="${State.theme === "dark" ? "active" : ""}">Dark</button>
          <button data-theme-opt="system" class="${State.theme === "system" ? "active" : ""}">Auto</button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-label">📏 Units</span>
        <div class="segmented" style="width:140px;">
          <button data-units-opt="metric" class="${State.units === "metric" ? "active" : ""}">kg / m</button>
          <button data-units-opt="imperial" class="${State.units === "imperial" ? "active" : ""}">lb / ft</button>
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-label">${icon("wallet", 16)} Currency</span>
        <div class="segmented" style="width:160px;">
          ${Object.keys(CurrencySymbols).map((c) => `<button data-currency-opt="${c}" class="${State.currency === c ? "active" : ""}">${c}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="section-title">App</div>
    <div class="card">
      <div class="settings-row">
        <span class="settings-label" style="display:inline-flex; align-items:center; gap:6px;">${icon("wifi", 15)} Connection</span>
        <span class="sync-pill ${State.online ? "" : "offline"}"><span class="dot"></span>${State.online ? "Online" : "Offline"}</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">💾 Data storage</span>
        <span style="font-size:13px; color:var(--text-secondary);">On this device</span>
      </div>
      <div class="settings-row">
        <span class="settings-label">☁️ Cloud sync &amp; multi-device</span>
        <button class="btn btn-ghost btn-sm" id="about-sync-btn">Learn more</button>
      </div>
      <div class="settings-row">
        <span class="settings-label">📲 Install app</span>
        <button class="btn btn-secondary btn-sm hidden" id="install-btn">Install</button>
      </div>
    </div>

    <div class="section-title">Backup</div>
    <div class="card">
      <div class="field-hint" style="margin-bottom:12px;">Export a backup file of all your trips, catches and spots — useful before switching devices, since data currently lives only on this device.</div>
      <div class="sheet-actions" style="margin:0;">
        <button class="btn btn-secondary btn-block" id="export-btn">Export backup</button>
        <label class="btn btn-secondary btn-block" style="margin:0; text-align:center;">
          Import
          <input type="file" accept=".json" id="import-input" style="display:none;">
        </label>
      </div>
    </div>

    <div class="section-title">Privacy</div>
    <div class="card">
      <div style="font-size:13.5px; line-height:1.5; color:var(--text-secondary);">
        🔒 Your fishing spot coordinates are private by default and stored only on this device. Nothing is uploaded or shared unless you explicitly export and send it yourself.
      </div>
    </div>

    <div class="section-title">Data</div>
    <div class="card">
      <button class="btn btn-danger btn-block" id="reset-data-btn">Erase all local data</button>
    </div>

    <div class="text-center" style="margin-top:18px; color:var(--text-tertiary); font-size:12px;">
      <img src="./icons/icon-192.png" alt="VeyruKeyolhu app icon" style="width:44px; height:44px; border-radius:12px; display:block; margin:0 auto 8px;">
      VeyruKeyolhu · v1.0 (static offline build)
    </div>
    <div class="spacer-lg"></div>
  `;

  if (State.installEvent) $("#install-btn").classList.remove("hidden");

  $("#edit-name-btn").addEventListener("click", openNameEditor);
  $$("[data-theme-opt]").forEach((btn) => btn.addEventListener("click", async () => {
    State.theme = btn.dataset.themeOpt;
    await setSetting("theme", State.theme);
    applyTheme();
    renderMore();
  }));
  $$("[data-units-opt]").forEach((btn) => btn.addEventListener("click", async () => {
    State.units = btn.dataset.unitsOpt;
    await setSetting("units", State.units);
    renderMore();
  }));
  $$("[data-currency-opt]").forEach((btn) => btn.addEventListener("click", async () => {
    State.currency = btn.dataset.currencyOpt;
    await setSetting("currency", State.currency);
    renderMore();
  }));
  $("#about-sync-btn").addEventListener("click", openSyncInfoSheet);
  $("#install-btn").addEventListener("click", async () => {
    if (!State.installEvent) return;
    State.installEvent.prompt();
    const { outcome } = await State.installEvent.userChoice;
    if (outcome === "accepted") toast("Installed! Find it on your home screen.");
    State.installEvent = null;
  });
  $("#export-btn").addEventListener("click", exportBackup);
  $("#import-input").addEventListener("change", importBackup);
  $("#reset-data-btn").addEventListener("click", eraseAllData);
}

function openNameEditor() {
  openSheet(`
    <div class="sheet-header"><h2>Your name</h2></div>
    <div class="field"><input type="text" id="name-input" value="${esc(State.userName)}" placeholder="Your name"></div>
    <button class="btn btn-primary btn-block" id="save-name-btn">Save</button>
  `);
  $("#save-name-btn").addEventListener("click", async () => {
    const val = $("#name-input").value.trim() || "Angler";
    State.userName = val;
    await setSetting("userName", val);
    closeSheet();
    renderMore();
  });
}

function openSyncInfoSheet() {
  openSheet(`
    <div class="sheet-header"><h2>Cloud sync</h2></div>
    <div style="font-size:14px; line-height:1.55; color:var(--text-primary);">
      This build of VeyruKeyolhu stores everything locally on your device using IndexedDB, so it works fully offline on the boat — nothing disappears if you lose signal.<br><br>
      It is not yet connected to a cloud backend, so catches, trips and spots won't automatically appear on a second device. Use <b>Export backup</b> in the Backup section to save a copy you can move to another device or restore later.
    </div>
  `);
}

async function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "veyrukeyolhu",
    version: 1,
    spots: State.spots,
    catches: State.catches,
    trips: State.trips,
    settings: { userName: State.userName, theme: State.theme, units: State.units, nakaiyNotes: await getSetting("nakaiyNotes", {}) },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veyrukeyolhu-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Backup downloaded");
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!confirm(`Import ${data.spots?.length || 0} spots, ${data.catches?.length || 0} catches, ${data.trips?.length || 0} trips? Existing records with matching IDs will be overwritten.`)) return;
      for (const s of data.spots || []) await dbPut("spots", s);
      for (const c of data.catches || []) await dbPut("catches", c);
      for (const t of data.trips || []) await dbPut("trips", t);
      if (data.settings) {
        if (data.settings.userName) await setSetting("userName", data.settings.userName);
        if (data.settings.theme) await setSetting("theme", data.settings.theme);
        if (data.settings.units) await setSetting("units", data.settings.units);
        if (data.settings.nakaiyNotes) await setSetting("nakaiyNotes", data.settings.nakaiyNotes);
      }
      await initApp();
      toast("Backup imported ✓");
    } catch (err) {
      toast("Couldn't read that file", { icon: icon("alert", 14) });
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

async function eraseAllData() {
  if (!confirm("This will permanently erase all trips, catches, spots and expenses on this device. This can't be undone. Continue?")) return;
  for (const s of State.spots) await dbDelete("spots", s.id);
  for (const c of State.catches) await dbDelete("catches", c.id);
  for (const t of State.trips) await dbDelete("trips", t.id);
  for (const e of State.expenses) await dbDelete("expenses", e.id);
  await reloadAllData();
  toast("All data erased");
  renderMore();
}
