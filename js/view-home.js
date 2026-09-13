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

function tierColorVar(tagClass) {
  if (tagClass === "grass") return "var(--seagrass)";
  if (tagClass === "gold") return "var(--reef-gold)";
  return "var(--lagoon-deep)";
}

function buildScoreCurveSVG(points, nowHours, windows = []) {
  const w = 340, h = 150;
  const padL = 30, padR = 8, padT = 16, padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  // Auto-scale to the day's actual range (with headroom) so the curve's
  // shape stays readable instead of flattening against the top or bottom.
  const scores = points.map((p) => p.score);
  const dataMin = Math.min(...scores);
  const dataMax = Math.max(...scores);
  const span = Math.max(dataMax - dataMin, 12);
  const yMin = Math.max(0, dataMin - span * 0.45);
  const yMax = Math.min(100, dataMax + span * 0.45);

  const toX = (hh) => padL + (hh / 24) * plotW;
  const toY = (val) => padT + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.h).toFixed(1)},${toY(p.score).toFixed(1)}`).join(" ");
  const areaPath = `${path} L${toX(24).toFixed(1)},${padT + plotH} L${toX(0).toFixed(1)},${padT + plotH} Z`;

  const stops = points.filter((_, i) => i % 2 === 0).map((p) =>
    `<stop offset="${((p.h / 24) * 100).toFixed(1)}%" stop-color="${tierColorVar(p.tagClass)}"/>`
  ).join("");

  const clampedNow = Math.min(24, Math.max(0, nowHours));
  const nowScore = points.reduce((closest, p) => Math.abs(p.h - clampedNow) < Math.abs(closest.h - clampedNow) ? p : closest, points[0]);
  const nowX = toX(clampedNow);
  const nowY = toY(nowScore.score);
  const nowLabel = (() => {
    const d = new Date();
    d.setHours(Math.floor(clampedNow), Math.round((clampedNow % 1) * 60), 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  })();

  // Band gridlines at the real tier thresholds, only where visible
  const bands = [
    { val: 75, label: "HIGH" },
    { val: 55, label: "MED" },
  ].filter((b) => b.val > yMin + 2 && b.val < yMax - 2);
  const bandMarkup = bands.map((b) => `
    <line x1="${padL}" y1="${toY(b.val).toFixed(1)}" x2="${w - padR}" y2="${toY(b.val).toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,4" opacity="0.7"/>
    <text x="4" y="${(toY(b.val) + 3.5).toFixed(1)}" font-size="8.5" font-weight="700" fill="var(--text-tertiary)" letter-spacing="0.04em">${b.label}</text>
  `).join("");

  // Highlighted major (peak) windows, like the reference app's shaded columns
  const windowMarkup = windows.filter((wd) => wd.kind === "major").map((wd) => {
    const x = toX(wd.startH);
    const width = toX(wd.endH) - x;
    return `<rect x="${x.toFixed(1)}" y="${padT}" width="${Math.max(width, 1).toFixed(1)}" height="${plotH}" fill="var(--seagrass)" opacity="0.14" rx="3"/>`;
  }).join("");

  const hourLabels = [4, 8, 12, 16, 20].map((hh) =>
    `<text x="${toX(hh).toFixed(1)}" y="${h - 8}" font-size="9" fill="var(--text-tertiary)" text-anchor="middle" font-weight="600">${String(hh).padStart(2, "0")}:00</text>`
  ).join("");

  return `
  <svg viewBox="0 0 ${w} ${h}" width="100%" style="display:block;">
    <defs>
      <linearGradient id="scoreLineGrad" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
      <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${tierColorVar(nowScore.tagClass)}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${tierColorVar(nowScore.tagClass)}" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${windowMarkup}
    ${bandMarkup}
    <path d="${areaPath}" fill="url(#scoreAreaGrad)" stroke="none"/>
    <path d="${path}" fill="none" stroke="url(#scoreLineGrad)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="${nowX.toFixed(1)}" y1="${padT}" x2="${nowX.toFixed(1)}" y2="${padT + plotH}" stroke="var(--text-tertiary)" stroke-width="1" opacity="0.5"/>
    <circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="4.5" fill="${tierColorVar(nowScore.tagClass)}"/>
    <circle cx="${nowX.toFixed(1)}" cy="${nowY.toFixed(1)}" r="8" fill="${tierColorVar(nowScore.tagClass)}" opacity="0.22"/>
    <rect x="${(nowX - 20).toFixed(1)}" y="1" width="40" height="14" rx="7" fill="var(--surface-solid)" stroke="var(--glass-border-soft)"/>
    <text x="${nowX.toFixed(1)}" y="11" font-size="8.5" font-weight="700" fill="var(--text-primary)" text-anchor="middle">${nowLabel}</text>
    ${hourLabels}
  </svg>`;
}

function buildScoreGaugeSVG(score, tagClass) {
  const cx = 70, cy = 70;
  const rOuter = 60, rInner = 48;
  const color = tierColorVar(tagClass);
  const totalTicks = 72;
  const activeTicks = Math.round((score / 100) * totalTicks);
  // Leave a gap at the bottom so the dial reads as a gauge, not a full ring
  const startAngle = 130, sweep = 280;

  let ticks = "";
  for (let i = 0; i < totalTicks; i++) {
    const angle = startAngle + (i / (totalTicks - 1)) * sweep;
    const rad = (angle * Math.PI) / 180;
    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy + rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy + rOuter * Math.sin(rad);
    const on = i < activeTicks;
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${on ? color : "var(--border)"}" stroke-width="${on ? 2.6 : 2}" stroke-linecap="round" opacity="${on ? 1 : 0.55}"/>`;
  }
  return `<svg viewBox="0 0 140 140" width="150" height="150">${ticks}</svg>`;
}

function buildStarRating(score, tagClass) {
  const stars = score >= 75 ? 3 : score >= 55 ? 2 : 1;
  const color = tierColorVar(tagClass);
  let out = "";
  for (let i = 0; i < 3; i++) {
    out += `<svg viewBox="0 0 24 24" width="13" height="13" fill="${i < stars ? color : "var(--border)"}" style="margin:0 1px;"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9L3.5 9.7l5.9-.8Z"/></svg>`;
  }
  return out;
}

function renderHome() {
  const now = new Date();
  const tide = getTideModel(now);
  const weather = getWeatherModel(now);
  const moon = getMoonPhase(now);
  const nakaiy = getCurrentNakaiy(now);
  const score = getFishingScore(tide, weather, moon);
  const scoreCurve = getFishingScoreCurve(now, weather, moon);
  const reco = getRecommendation(tide, weather, moon, score);
  const bestSpots = getBestSpotsToday(State.spots, State.catches, tide, weather, moon, score, now);
  const timeWindows = getMajorMinorWindows(scoreCurve);
  const majorWindows = timeWindows.filter((w) => w.kind === "major");
  const minorWindows = timeWindows.filter((w) => w.kind === "minor");

  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  root().innerHTML = `
    <div class="page-header center">
      <div class="hero-date">${esc(dateStr)}</div>
      <h1 class="brand-title">VeyruKeyolhu</h1>
    </div>

    <div class="card score-card">
      <div class="score-label" style="text-align:center;">FISHING CONDITIONS</div>
      <div class="score-gauge-wrap">
        ${buildScoreGaugeSVG(score.score, score.tagClass)}
        <div class="score-gauge-center">
          <span class="score-value ${score.tagClass}">${score.score}</span>
          <div class="score-stars">${buildStarRating(score.score, score.tagClass)}</div>
        </div>
      </div>
      <div class="score-headline ${score.tagClass}">${score.tag === "Excellent" ? "High" : score.tag === "Moderate" ? "Moderate" : "Low"} fish activity</div>
      <div class="score-note" style="text-align:center;">${esc(reco)}</div>
      <div class="tide-curve-wrap" style="margin-top:14px;">${buildScoreCurveSVG(scoreCurve, tide.nowHours, timeWindows)}</div>
      ${timeWindows.length ? `
        <div class="time-windows-row">
          <div class="time-windows-col">
            <div class="time-windows-label grass">MAJOR TIMES</div>
            ${majorWindows.length ? majorWindows.map((w) => `<div class="time-window-chip grass">${w.startTime} – ${w.endTime}</div>`).join("") : `<div class="time-window-chip empty">None today</div>`}
          </div>
          <div class="time-windows-col">
            <div class="time-windows-label gold">MINOR TIMES</div>
            ${minorWindows.length ? minorWindows.map((w) => `<div class="time-window-chip gold">${w.startTime} – ${w.endTime}</div>`).join("") : `<div class="time-window-chip empty">None today</div>`}
          </div>
        </div>
      ` : ""}
      ${bestSpots.length ? `
        <div class="best-spot-pick" id="top-pick-row">
          <span class="best-spot-pick-icon">${icon("pin", 15)}</span>
          <span>Top pick today: <b>${esc(bestSpots[0].spot.name)}</b></span>
          <span class="list-chevron">›</span>
        </div>
      ` : ""}
      <div class="score-disclaimer">Personal, estimated score based on tide, moon, wind and your logged preferences — not a scientific forecast.</div>
    </div>

    ${bestSpots.length ? `
      <div class="section-title">Best Spots Today</div>
      <div class="card" style="padding:6px 10px;">
        ${bestSpots.map((r, i) => `
          <div class="list-item best-spot-row" data-spot-id="${r.spot.id}" style="cursor:pointer;">
            <div class="best-spot-rank">${i + 1}</div>
            <div class="list-main">
              <div class="list-title">${esc(r.spot.name)}${r.spot.favourite ? ` ${icon("star", 12)}` : ""}</div>
              <div class="list-sub">${esc(r.reasons[0] || "")}</div>
              ${r.reasons.length > 1 ? `<div class="best-spot-reasons">${r.reasons.slice(1).map((rs) => `<span class="badge grass" style="margin-top:4px;">${esc(rs)}</span>`).join("")}</div>` : ""}
            </div>
            <span class="list-chevron">›</span>
          </div>
        `).join("")}
      </div>
      <div class="score-disclaimer" style="margin: -8px 2px 4px;">Based on today's tide/moon/wind and your own logged spots and catches — a personal suggestion, not a guarantee.</div>
    ` : (State.spots.length === 0 ? `
      <div class="section-title">Best Spots Today</div>
      <div class="card text-center" style="padding:24px 18px;">
        <div style="font-size:13.5px; color:var(--text-secondary); line-height:1.5;">Add a few fishing spots on the Map tab — with a best tide/time set — and log some catches, and this section will suggest where to go today.</div>
      </div>
    ` : "")}

    <div class="section-title">Conditions</div>
    <div class="card" id="conditions-card" style="cursor:pointer;">
      <div class="card-row" style="margin-bottom:12px;">
        <div class="card-title"><span class="emoji">☀️</span>${esc(weather.condition)}</div>
        <div style="font-family:var(--font-display); font-size:22px; font-weight:750;">${weather.temp}°C</div>
      </div>
      <div class="grid-2">
        <div class="stat-tile">
          <div class="stat-label">WIND</div>
          <div class="stat-value">${ktToMph(weather.windSpeed)} mph</div>
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
  $("#top-pick-row")?.addEventListener("click", () => openSpotDetail(bestSpots[0].spot.id));
  $$(".best-spot-row").forEach((el) => el.addEventListener("click", () => openSpotDetail(el.dataset.spotId)));
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
    <div class="sheet-header"><h2>Tide forecast</h2></div>

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
    <div class="sheet-header"><h2>Weather detail</h2></div>

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
          <div style="font-size:10.5px; color:var(--text-tertiary); margin-top:2px;">${ktToMph(h.windSpeed)}mph</div>
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
        <div class="stat-value">${ktToMph(weather.windSpeed)} mph</div>
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

}

function openNakaiyNoteEditor(nakaiyName) {
  getSetting("nakaiyNotes", {}).then((notes) => {
    const existing = notes[nakaiyName] || "";
    openSheet(`
      <div class="sheet-header"><h2>Notes for ${esc(nakaiyName)}</h2></div>
      <div class="field">
        <label>Your personal fishing notes</label>
        <textarea id="nakaiy-note-input" placeholder="e.g. Best GT bite I've had was during this Nakaiy at the channel mouth...">${esc(existing)}</textarea>
      </div>
      <button class="btn btn-primary btn-block" id="save-nakaiy-note">Save note</button>
    `);
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
