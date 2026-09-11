// ===================================================================
// Home view
// ===================================================================

function buildTideCurveSVG(tide) {
  const w = 320, h = 90, pad = 4;
  const pts = tide.curvePoints;
  const minH = Math.min(...pts.map((p) => p.height));
  const maxH = Math.max(...pts.map((p) => p.height));
  const range = Math.max(0.1, maxH - minH);
  const toX = (hh) => pad + (hh / 24) * (w - pad * 2);
  const toY = (val) => h - pad - ((val - minH) / range) * (h - pad * 2);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.h).toFixed(1)},${toY(p.height).toFixed(1)}`).join(" ");
  const areaPath = `${path} L${toX(24).toFixed(1)},${h} L${toX(0).toFixed(1)},${h} Z`;

  const nowX = toX(Math.min(24, Math.max(0, tide.nowHours)));
  const nowY = toY(tide.currentHeight);

  return `
  <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--lagoon)" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="var(--lagoon)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#tideGrad)" stroke="none"/>
    <path d="${path}" fill="none" stroke="var(--lagoon-deep)" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="4.5" fill="var(--coral)"/>
    <circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="8" fill="var(--coral)" opacity="0.22"/>
  </svg>`;
}

function renderHome() {
  const now = new Date();
  const tide = getTideModel(now);
  const weather = getWeatherModel(now);
  const moon = getMoonPhase(now);
  const nakaiy = getCurrentNakaiy(now);
  const score = getFishingScore(tide, weather, moon);
  const reco = getRecommendation(tide, weather, moon, score);

  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  root().innerHTML = `
    <div class="page-header">
      <div class="hero-date">${esc(dateStr)}</div>
      <h1>VeyruKeyolhu</h1>
    </div>

    <div class="card score-card">
      <div class="score-top">
        <div>
          <div class="score-label">FISHING CONDITIONS</div>
          <div class="score-value-row">
            <span class="score-value">${score.score}%</span>
          </div>
        </div>
        <span class="score-tag ${score.tagClass}">${score.tag}</span>
      </div>
      <div class="score-bar"><div class="score-bar-fill" style="width:${score.score}%"></div></div>
      <div class="score-note">${esc(reco)}</div>
      <div class="score-disclaimer">Personal, estimated score based on tide, moon, wind and your logged preferences — not a scientific forecast.</div>
    </div>

    <div class="section-title">Conditions</div>
    <div class="card" id="conditions-card" style="cursor:pointer;">
      <div class="card-row" style="margin-bottom:12px;">
        <div class="card-title"><span class="emoji">☀️</span>${esc(weather.condition)}</div>
        <div style="font-family:var(--font-display); font-size:22px; font-weight:750;">${weather.temp}°C</div>
      </div>
      <div class="grid-2">
        <div class="stat-tile">
          <div class="stat-label">WIND</div>
          <div class="stat-value">${weather.windSpeed} kt</div>
          <div class="stat-sub">${weather.windDir}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">WAVES</div>
          <div class="stat-value">${weather.waveHeight} m</div>
          <div class="stat-sub">Sea state</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">SUNRISE</div>
          <div class="stat-value">${weather.sunrise}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">SUNSET</div>
          <div class="stat-value">${weather.sunset}</div>
        </div>
      </div>
      <div class="card-link" style="margin-top:10px; display:flex; align-items:center; gap:4px;">More detail ›</div>
    </div>

    <div class="section-title">Tide</div>
    <div class="card" id="tide-card" style="cursor:pointer;">
      <div class="tide-events">
        <div class="tide-event">
          <div class="k">CURRENT</div>
          <div class="t">${tide.currentHeight} m</div>
          <div class="h">${tide.rising ? "Rising ↑" : "Falling ↓"}</div>
        </div>
        ${tide.nextHigh ? `
        <div class="tide-event">
          <div class="k">NEXT HIGH</div>
          <div class="t">${tide.nextHigh.time}</div>
          <div class="h">${tide.nextHigh.height} m</div>
        </div>` : ""}
        ${tide.nextLow ? `
        <div class="tide-event">
          <div class="k">NEXT LOW</div>
          <div class="t">${tide.nextLow.time}</div>
          <div class="h">${tide.nextLow.height} m</div>
        </div>` : ""}
      </div>
      <div class="tide-curve-wrap">${buildTideCurveSVG(tide)}</div>
      <div class="card-row" style="margin-top:10px;">
        <div class="score-disclaimer" style="margin-top:0;">Estimated curve, real M2 tidal period — exact times aren't from a live station.</div>
        <a href="https://www.surf-forecast.com/breaks/Male/tides/latest" target="_blank" rel="noopener" class="btn-link-live" id="live-tide-link">Live tide ↗</a>
      </div>
      <div class="card-link" style="margin-top:8px; display:flex; align-items:center; gap:4px;">3-day forecast ›</div>
    </div>

    <div class="section-title">Nakaiy</div>
    <div class="card">
      <span class="nakaiy-badge">🌊 ${esc(nakaiy.season)}</span>
      <div class="nakaiy-name">${esc(nakaiy.name)} <span style="font-size:15px;">${moon.emoji}</span></div>
      <div class="nakaiy-range">${fmtDateShort(nakaiy.startDate)} – ${fmtDateShort(nakaiy.endDate)} · Moon: ${esc(moon.name)}</div>
      <div class="nakaiy-desc">${esc(nakaiy.note)}</div>
      <div id="nakaiy-note-display"></div>
      <button class="btn btn-ghost" id="edit-nakaiy-note" style="padding-left:0; margin-top:4px;">✏️ Add your notes for this Nakaiy</button>
    </div>

    <div class="spacer-lg"></div>
  `;

  loadNakaiyPersonalNote(nakaiy.name);
  $("#edit-nakaiy-note").addEventListener("click", () => openNakaiyNoteEditor(nakaiy.name));
  $("#conditions-card").addEventListener("click", () => openWeatherDetailSheet(weather, now));
  $("#tide-card").addEventListener("click", (e) => {
    if (e.target.closest("#live-tide-link")) return;
    openTideDetailSheet(now);
  });
}

function buildExtendedTideCurveSVG(forecast) {
  const w = 700, h = 160, pad = 6;
  const pts = forecast.points;
  const minH = Math.min(...pts.map((p) => p.height));
  const maxH = Math.max(...pts.map((p) => p.height));
  const range = Math.max(0.1, maxH - minH);
  const toX = (hh) => pad + (hh / forecast.totalHours) * (w - pad * 2);
  const toY = (val) => h - pad - ((val - minH) / range) * (h - pad * 2);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.h).toFixed(1)},${toY(p.height).toFixed(1)}`).join(" ");
  const areaPath = `${path} L${toX(forecast.totalHours).toFixed(1)},${h} L${toX(0).toFixed(1)},${h} Z`;

  const dayLines = [];
  for (let d = 24; d < forecast.totalHours; d += 24) {
    dayLines.push(`<line x1="${toX(d).toFixed(1)}" y1="0" x2="${toX(d).toFixed(1)}" y2="${h}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,4"/>`);
  }

  return `
  <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="extTideGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--lagoon)" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="var(--lagoon)" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${dayLines.join("")}
    <path d="${areaPath}" fill="url(#extTideGrad)" stroke="none"/>
    <path d="${path}" fill="none" stroke="var(--lagoon-deep)" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

function openTideDetailSheet(now) {
  const forecast = getExtendedTideForecast(now, 3);
  const grouped = {};
  forecast.events.forEach((e) => {
    grouped[e.dayLabel] = grouped[e.dayLabel] || [];
    grouped[e.dayLabel].push(e);
  });

  openSheet(`
    <div class="sheet-header"><h2>Tide forecast</h2><button class="sheet-close" id="sheet-close-btn">✕</button></div>

    <div class="tide-curve-wrap" style="margin-bottom:6px;">${buildExtendedTideCurveSVG(forecast)}</div>
    <div class="score-disclaimer" style="margin-bottom:16px;">3-day estimate from the same M2-period model as the Home tide card — not from a live tide station.</div>

    ${Object.entries(grouped).map(([day, events]) => `
      <div class="section-title" style="margin-top:18px;">${esc(day)}</div>
      <div class="card card-tight">
        ${events.map((e) => `
          <div class="detail-row">
            <span class="k" style="display:flex; align-items:center; gap:6px;">
              <span class="badge ${e.type === "high" ? "grass" : "gold"}">${e.type === "high" ? "High" : "Low"}</span>
              ${e.time}
            </span>
            <span class="v">${e.height} m</span>
          </div>
        `).join("")}
      </div>
    `).join("")}

    <a href="https://www.surf-forecast.com/breaks/Male/tides/latest" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="margin-top:16px; text-decoration:none;">View live tide station data ↗</a>
  `, { tall: true });

  $("#sheet-close-btn").addEventListener("click", closeSheet);
}

async function loadNakaiyPersonalNote(nakaiyName) {
  const notes = await getSetting("nakaiyNotes", {});
  const box = $("#nakaiy-note-display");
  if (!box) return;
  if (notes[nakaiyName]) {
    box.innerHTML = `<div class="nakaiy-note-box">📝 ${esc(notes[nakaiyName])}</div>`;
  }
}

function openWeatherDetailSheet(weather, now) {
  const hourly = getHourlyOutlook(now, 8);
  const uvLabel = weather.uvIndex >= 8 ? "Very high" : weather.uvIndex >= 6 ? "High" : weather.uvIndex >= 3 ? "Moderate" : "Low";

  openSheet(`
    <div class="sheet-header"><h2>Weather detail</h2><button class="sheet-close" id="sheet-close-btn">✕</button></div>

    <div class="card-row" style="margin-bottom:14px;">
      <div class="card-title" style="font-size:17px;"><span class="emoji">☀️</span>${esc(weather.condition)}</div>
      <div style="font-family:var(--font-display); font-size:30px; font-weight:750;">${weather.temp}°C</div>
    </div>

    <div class="section-title" style="margin-top:4px;">Next few hours</div>
    <div class="chip-row" style="padding-bottom:4px;">
      ${hourly.map((h) => `
        <div style="flex-shrink:0; text-align:center; background:var(--surface); border:1px solid var(--glass-border-soft); border-radius:var(--radius-md); padding:10px 14px; min-width:64px;">
          <div style="font-size:11.5px; color:var(--text-tertiary); font-weight:600;">${h.time}</div>
          <div style="font-size:17px; margin:6px 0 4px;">${h.isNight ? "🌙" : "☀️"}</div>
          <div style="font-family:var(--font-display); font-weight:700; font-size:15px;">${h.temp}°</div>
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">${h.windSpeed}kt</div>
        </div>
      `).join("")}
    </div>

    <div class="section-title">Details</div>
    <div class="grid-2">
      <div class="stat-tile">
        <div class="stat-label">FEELS LIKE</div>
        <div class="stat-value">${weather.feelsLike}°C</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">HUMIDITY</div>
        <div class="stat-value">${weather.humidity}%</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">UV INDEX</div>
        <div class="stat-value">${weather.uvIndex}</div>
        <div class="stat-sub">${uvLabel}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">VISIBILITY</div>
        <div class="stat-value">${weather.visibility} km</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">PRESSURE</div>
        <div class="stat-value">${weather.pressure} hPa</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">CLOUD COVER</div>
        <div class="stat-value">${weather.cloudCover}%</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">WIND</div>
        <div class="stat-value">${weather.windSpeed} kt</div>
        <div class="stat-sub">${weather.windDir}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-label">WAVES</div>
        <div class="stat-value">${weather.waveHeight} m</div>
        <div class="stat-sub">Sea state</div>
      </div>
    </div>

    <div class="score-disclaimer" style="margin-top:14px;">Estimated, personal-reference weather model — not a connected marine forecast. Always check official sources before heading out.</div>
  `, { tall: true });

  $("#sheet-close-btn").addEventListener("click", closeSheet);
}

function openNakaiyNoteEditor(nakaiyName) {
  getSetting("nakaiyNotes", {}).then((notes) => {
    const existing = notes[nakaiyName] || "";
    openSheet(`
      <div class="sheet-header"><h2>Notes for ${esc(nakaiyName)}</h2><button class="sheet-close" id="sheet-close-btn">✕</button></div>
      <div class="field">
        <label>Your personal fishing notes</label>
        <textarea id="nakaiy-note-input" placeholder="e.g. Best GT bite I've had was during this Nakaiy at the channel mouth...">${esc(existing)}</textarea>
      </div>
      <button class="btn btn-primary btn-block" id="save-nakaiy-note">Save note</button>
    `);
    $("#sheet-close-btn").addEventListener("click", closeSheet);
    $("#save-nakaiy-note").addEventListener("click", async () => {
      const val = $("#nakaiy-note-input").value.trim();
      const all = await getSetting("nakaiyNotes", {});
      all[nakaiyName] = val;
      await setSetting("nakaiyNotes", all);
      closeSheet();
      toast("Note saved");
      renderHome();
    });
  });
}
