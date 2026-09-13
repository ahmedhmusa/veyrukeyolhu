// ===================================================================
// Maldives Fishing Log — Data & Calculations
// Tide / moon / Nakaiy are approximate models for a personal fishing
// log, not navigational or scientific instruments.
// ===================================================================

const Species = [
  { id: "gt", name: "Giant Trevally", emoji: "🐟" },
  { id: "yft", name: "Yellowfin Tuna", emoji: "🐟" },
  { id: "dtt", name: "Dogtooth Tuna", emoji: "🐟" },
  { id: "rsnap", name: "Red Snapper", emoji: "🐟", icon: "icons/species-red-snapper.png" },
  { id: "rubysnap", name: "Ruby Snapper", emoji: "🐟" },
  { id: "grouper", name: "Grouper", emoji: "🐟" },
  { id: "redbass", name: "Red Bass", emoji: "🐟" },
  { id: "sailfish", name: "Sailfish", emoji: "🎣" },
  { id: "wahoo", name: "Wahoo", emoji: "🐟" },
  { id: "barracuda", name: "Barracuda", emoji: "🐟" },
  { id: "jobfish", name: "Jobfish", emoji: "🐟" },
  { id: "other", name: "Other", emoji: "🐠" },
];

const Techniques = ["Jigging", "Popping", "Trolling", "Bottom fishing", "Casting", "Handline", "Fly fishing"];

const ExpenseCategories = [
  { id: "fuel", name: "Fuel", icon: "fuel" },
  { id: "tackle", name: "Tackle & Gear", icon: "hook" },
  { id: "food", name: "Food & Drinks", icon: "cup" },
  { id: "maintenance", name: "Boat & Maintenance", icon: "wrench" },
  { id: "other", name: "Other", icon: "dots" },
];

const CurrencySymbols = { MVR: "Rf", USD: "$", EUR: "€", GBP: "£" };
function formatCurrency(amount, currency = "MVR") {
  const symbol = CurrencySymbols[currency] || currency;
  const val = (Math.round((amount || 0) * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol} ${val}`;
}
const Atolls = [
  "Kaafu (Male' Atoll)", "Baa Atoll", "Ari Atoll", "Vaavu Atoll", "Meemu Atoll",
  "Laamu Atoll", "Gaafu Alifu", "Gaafu Dhaalu", "Addu Atoll", "Haa Alifu", "Haa Dhaalu",
];

// ---------------------------------------------------------------
// Nakaiy: the traditional Maldivian calendar of 27 periods (13-14
// days each) tied to fixed Gregorian date ranges every year — not a
// rotating cycle. 9 periods fall in Iruvai (NE monsoon, roughly
// Dec-Apr) and 18 in Hulhangu (SW monsoon, roughly Apr-Dec). Dates
// and characteristics reflect commonly published traditional
// descriptions; local sources can vary by a day or two.
// ---------------------------------------------------------------
const NakaiyList = [
  { name: "Mula", startMonth: 12, startDay: 10, endMonth: 12, endDay: 22, season: "Iruvai (NE monsoon)", note: "Strong winds and rough seas. Northern waters tend to fish well." },
  { name: "Furahalha", startMonth: 12, startDay: 23, endMonth: 1, endDay: 5, season: "Iruvai (NE monsoon)", note: "Strong north-easterly winds and rough seas, but a good fishing stretch up north." },
  { name: "Uthurahalha", startMonth: 1, startDay: 6, endMonth: 1, endDay: 18, season: "Iruvai (NE monsoon)", note: "Clear skies with strong wind and rougher seas." },
  { name: "Huvan", startMonth: 1, startDay: 19, endMonth: 1, endDay: 31, season: "Iruvai (NE monsoon)", note: "Calmer seas and clear skies. Eastern waters fish well." },
  { name: "Dhinasha", startMonth: 2, startDay: 1, endMonth: 2, endDay: 13, season: "Iruvai (NE monsoon)", note: "North-easterly winds, moderate seas and plenty of sun." },
  { name: "Hiyaviha", startMonth: 2, startDay: 14, endMonth: 2, endDay: 26, season: "Iruvai (NE monsoon)", note: "Calm seas with hot days and nights." },
  { name: "Furabadhuruva", startMonth: 2, startDay: 27, endMonth: 3, endDay: 11, season: "Iruvai (NE monsoon)", note: "Short, sharp thunderstorms can roll through." },
  { name: "Fasbadhuruva", startMonth: 3, startDay: 12, endMonth: 3, endDay: 25, season: "Iruvai (NE monsoon)", note: "Usually clear, settled skies." },
  { name: "Reyva", startMonth: 3, startDay: 26, endMonth: 4, endDay: 7, season: "Iruvai (NE monsoon)", note: "Storms can turn severe if they form. Northern fishing tends to be good." },
  { name: "Assidha", startMonth: 4, startDay: 8, endMonth: 4, endDay: 21, season: "Hulhangu (SW monsoon)", note: "Often opens with a storm before turning hot and dry. Fishing can be slower." },
  { name: "Burunu", startMonth: 4, startDay: 22, endMonth: 5, endDay: 5, season: "Hulhangu (SW monsoon)", note: "Starts stormy with strong wind, then settles down." },
  { name: "Kethi", startMonth: 5, startDay: 6, endMonth: 5, endDay: 19, season: "Hulhangu (SW monsoon)", note: "Dark clouds and frequent rain." },
  { name: "Roanu", startMonth: 5, startDay: 20, endMonth: 6, endDay: 2, season: "Hulhangu (SW monsoon)", note: "Storms, strong wind and rougher seas." },
  { name: "Miyahelia", startMonth: 6, startDay: 3, endMonth: 6, endDay: 16, season: "Hulhangu (SW monsoon)", note: "Storms, rough seas and strong westerly wind." },
  { name: "Adha", startMonth: 6, startDay: 17, endMonth: 6, endDay: 30, season: "Hulhangu (SW monsoon)", note: "South-westerly wind, light rain, and baitfish schools moving through." },
  { name: "Funoas", startMonth: 7, startDay: 1, endMonth: 7, endDay: 14, season: "Hulhangu (SW monsoon)", note: "Storms and rough seas with sudden gales." },
  { name: "Fus", startMonth: 7, startDay: 15, endMonth: 7, endDay: 28, season: "Hulhangu (SW monsoon)", note: "Wet and overcast, but a good fishing stretch." },
  { name: "Ahuliha", startMonth: 7, startDay: 29, endMonth: 8, endDay: 10, season: "Hulhangu (SW monsoon)", note: "Storms ease off and days turn calmer." },
  { name: "Maa", startMonth: 8, startDay: 11, endMonth: 8, endDay: 23, season: "Hulhangu (SW monsoon)", note: "Generally calm conditions." },
  { name: "Fura", startMonth: 8, startDay: 24, endMonth: 9, endDay: 6, season: "Hulhangu (SW monsoon)", note: "Mostly dry with isolated showers and light north-westerly wind." },
  { name: "Uthura", startMonth: 9, startDay: 7, endMonth: 9, endDay: 20, season: "Hulhangu (SW monsoon)", note: "Strong north-westerly wind with isolated showers." },
  { name: "Atha", startMonth: 9, startDay: 21, endMonth: 10, endDay: 3, season: "Hulhangu (SW monsoon)", note: "Generally clear and calm with the odd shower." },
  { name: "Hitha", startMonth: 10, startDay: 4, endMonth: 10, endDay: 17, season: "Hulhangu (SW monsoon)", note: "Light wind with isolated showers." },
  { name: "Hey", startMonth: 10, startDay: 18, endMonth: 10, endDay: 30, season: "Hulhangu (SW monsoon)", note: "Strong wind from every direction — a traditionally excellent tuna run." },
  { name: "Viha", startMonth: 11, startDay: 1, endMonth: 11, endDay: 13, season: "Hulhangu (SW monsoon)", note: "Calm days and a good fishing stretch." },
  { name: "Nora", startMonth: 11, startDay: 14, endMonth: 11, endDay: 26, season: "Hulhangu (SW monsoon)", note: "Light wind with sun showers as currents unsettle ahead of the NE monsoon." },
  { name: "Dosha", startMonth: 11, startDay: 27, endMonth: 12, endDay: 9, season: "Hulhangu (SW monsoon)", note: "Light north-easterly wind and a good fishing stretch." },
];

function getCurrentNakaiy(date = new Date()) {
  const targetYear = date.getFullYear();
  for (const entry of NakaiyList) {
    for (const anchorYear of [targetYear - 1, targetYear, targetYear + 1]) {
      const start = new Date(anchorYear, entry.startMonth - 1, entry.startDay, 0, 0, 0);
      const endYear = anchorYear + (entry.endMonth < entry.startMonth ? 1 : 0);
      const end = new Date(endYear, entry.endMonth - 1, entry.endDay, 23, 59, 59);
      if (date >= start && date <= end) {
        return { ...entry, startDate: start, endDate: end };
      }
    }
  }
  // Fallback (should not happen — the 27 ranges cover the full year)
  return { ...NakaiyList[0], startDate: date, endDate: date };
}

function fmtDateShort(d) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------
// Moon phase (astronomical approximation, synodic month 29.53059 d)
// ---------------------------------------------------------------
function getMoonPhase(date = new Date()) {
  const synodic = 29.53058867;
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14));
  const diffDays = (date.getTime() - knownNewMoon.getTime()) / 86400000;
  let phase = (diffDays % synodic) / synodic;
  if (phase < 0) phase += 1;

  const names = [
    { max: 0.03, name: "New Moon", emoji: "🌑" },
    { max: 0.25, name: "Waxing Crescent", emoji: "🌒" },
    { max: 0.28, name: "First Quarter", emoji: "🌓" },
    { max: 0.5, name: "Waxing Gibbous", emoji: "🌔" },
    { max: 0.53, name: "Full Moon", emoji: "🌕" },
    { max: 0.75, name: "Waning Gibbous", emoji: "🌖" },
    { max: 0.78, name: "Last Quarter", emoji: "🌗" },
    { max: 1.01, name: "Waning Crescent", emoji: "🌘" },
  ];
  const match = names.find((n) => phase <= n.max) || names[names.length - 1];
  const illumination = Math.round((1 - Math.cos(phase * 2 * Math.PI)) / 2 * 100);
  return { phase, name: match.name, emoji: match.emoji, illumination };
}

// ---------------------------------------------------------------
// Tide model: semi-diurnal sine approximation seeded by date so it
// is stable across reloads. Not derived from real harmonic tide
// station data — clearly presented as an estimate in the UI.
// ---------------------------------------------------------------
function ktToMph(kt) {
  return Math.round(kt * 1.15078);
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getTideModel(date = new Date()) {
  // Male/North Male Atoll tides are predominantly semi-diurnal: two highs
  // and two lows per day, advancing later by ~50 minutes daily because the
  // driving cycle is the lunar day (24h50m), not the 24h solar day. The
  // M2 constituent period below (12.4206 h) is the real dominant tidal
  // period for this region — the timing pattern is physically correct.
  // The exact phase (which hour "today" is high) is still an estimate,
  // not pulled from a real station — use the "Live tide" link for that.
  const lunarDayHours = 24.8412;
  const periodHours = lunarDayHours / 2; // 12.4206h — real M2 semi-diurnal period
  const referenceEpoch = Date.UTC(2026, 0, 1, 4, 0); // arbitrary fixed reference for a stable, repeatable phase
  const localMidnight = new Date(date); localMidnight.setHours(0, 0, 0, 0);
  const hoursSinceEpochAtMidnight = (localMidnight.getTime() - referenceEpoch) / 3600000;
  const dayIndex = Math.floor(date.getTime() / 86400000);
  // phaseShift positions the curve so hour-of-day (h, 0-24) lines up with the
  // real advancing tidal cycle from one day to the next (~50 min later daily).
  const phaseShift = ((hoursSinceEpochAtMidnight % periodHours) / periodHours) * 2 * Math.PI;
  const baseHeight = 0.48; // matches the observed Male low-to-high midpoint (~0 to ~0.95m)
  const amplitude = 0.42 + seededRandom(dayIndex + 1) * 0.06; // realistic ~0.7-0.9m high-to-low range

  const nowHours = date.getHours() + date.getMinutes() / 60;
  const heightAt = (h) => baseHeight + amplitude * Math.sin((2 * Math.PI * h) / periodHours + phaseShift);
  const rateAt = (h) => amplitude * (2 * Math.PI / periodHours) * Math.cos((2 * Math.PI * h) / periodHours + phaseShift);

  // find extrema over 30h window by scanning
  const points = [];
  for (let h = -2; h <= 28; h += 0.1) points.push({ h, height: heightAt(h) });

  const events = [];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    if (b.height > a.height && b.height > c.height) events.push({ h: b.h, height: b.height, type: "high" });
    if (b.height < a.height && b.height < c.height) events.push({ h: b.h, height: b.height, type: "low" });
  }

  const toTimeStr = (h) => {
    let hh = ((h % 24) + 24) % 24;
    const hours = Math.floor(hh);
    const mins = Math.round((hh - hours) * 60);
    const d2 = new Date(date);
    d2.setHours(hours, mins, 0, 0);
    return d2.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const futureEvents = events.filter((e) => e.h >= nowHours).slice(0, 4);
  const nextHigh = futureEvents.find((e) => e.type === "high");
  const nextLow = futureEvents.find((e) => e.type === "low");
  const currentHeight = heightAt(nowHours);
  const rising = rateAt(nowHours) > 0;

  const nextEvent = futureEvents[0];
  const hoursUntilChange = nextEvent ? (nextEvent.h - nowHours) : null;

  return {
    currentHeight: Math.round(currentHeight * 100) / 100,
    rising,
    nextHigh: nextHigh ? { time: toTimeStr(nextHigh.h), height: Math.round(nextHigh.height * 100) / 100 } : null,
    nextLow: nextLow ? { time: toTimeStr(nextLow.h), height: Math.round(nextLow.height * 100) / 100 } : null,
    hoursUntilChange,
    curvePoints: points.filter((p) => p.h >= 0 && p.h <= 24),
    nowHours,
    amplitude,
    baseHeight,
  };
}

// ---------------------------------------------------------------
// Extended tide forecast — same M2-period model as getTideModel,
// projected out over multiple days for a fuller "forecast" view.
// ---------------------------------------------------------------
function getExtendedTideForecast(date = new Date(), daysAhead = 3) {
  const lunarDayHours = 24.8412;
  const periodHours = lunarDayHours / 2;
  const referenceEpoch = Date.UTC(2026, 0, 1, 4, 0);
  const localMidnight = new Date(date); localMidnight.setHours(0, 0, 0, 0);
  const hoursSinceEpochAtMidnight = (localMidnight.getTime() - referenceEpoch) / 3600000;
  const dayIndex = Math.floor(date.getTime() / 86400000);
  const phaseShift = ((hoursSinceEpochAtMidnight % periodHours) / periodHours) * 2 * Math.PI;
  const baseHeight = 0.48;
  const amplitude = 0.42 + seededRandom(dayIndex + 1) * 0.06;

  const totalHours = daysAhead * 24;
  const heightAt = (h) => baseHeight + amplitude * Math.sin((2 * Math.PI * h) / periodHours + phaseShift);

  const points = [];
  for (let h = 0; h <= totalHours; h += 0.1) points.push({ h, height: heightAt(h) });

  const events = [];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    if (b.height > a.height && b.height > c.height) events.push({ h: b.h, height: b.height, type: "high" });
    if (b.height < a.height && b.height < c.height) events.push({ h: b.h, height: b.height, type: "low" });
  }

  const labelled = events.map((e) => {
    const d2 = new Date(localMidnight.getTime() + e.h * 3600000);
    return {
      type: e.type,
      height: Math.round(e.height * 100) / 100,
      time: d2.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      dayLabel: d2.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
      isToday: d2.toDateString() === date.toDateString(),
    };
  });

  return { points, events: labelled, totalHours, baseHeight, amplitude };
}

// ---------------------------------------------------------------
// Weather (demo/offline model — seeded pseudo-forecast).
// In a connected build this would call a marine weather API.
// ---------------------------------------------------------------
function getWeatherModel(date = new Date()) {
  const daySeed = Math.floor(date.getTime() / 86400000);
  const conditions = ["Sunny", "Partly cloudy", "Scattered showers", "Clear skies", "Breezy & clear"];
  const cond = conditions[Math.floor(seededRandom(daySeed + 5) * conditions.length)];
  const windDirs = ["NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  const windDir = windDirs[Math.floor(seededRandom(daySeed + 7) * windDirs.length)];
  const windSpeed = Math.round(8 + seededRandom(daySeed + 9) * 14);
  const waveHeight = Math.round((0.4 + seededRandom(daySeed + 11) * 1.1) * 10) / 10;
  const temp = Math.round(27 + seededRandom(daySeed + 13) * 4);

  const sunrise = "06:0" + Math.floor(seededRandom(daySeed + 15) * 9);
  const sunset = "18:1" + Math.floor(seededRandom(daySeed + 17) * 9);

  const humidity = Math.round(62 + seededRandom(daySeed + 19) * 22);
  const pressure = Math.round(1006 + seededRandom(daySeed + 21) * 12);
  const uvIndex = Math.round(6 + seededRandom(daySeed + 23) * 5);
  const visibility = Math.round((8 + seededRandom(daySeed + 25) * 6) * 10) / 10;
  const cloudCover = Math.round(seededRandom(daySeed + 27) * 70);
  const feelsLike = temp + Math.round(seededRandom(daySeed + 29) * 3);

  return {
    condition: cond, windDir, windSpeed, waveHeight, temp, sunrise, sunset,
    humidity, pressure, uvIndex, visibility, cloudCover, feelsLike,
  };
}

// ---------------------------------------------------------------
// Short-range hourly outlook — derived from the same seeded model
// with a simple diurnal temperature curve and small hour-to-hour
// jitter, purely for personal-reference "next few hours" context.
// ---------------------------------------------------------------
function getHourlyOutlook(date = new Date(), hoursAhead = 8) {
  const base = getWeatherModel(date);
  const hours = [];
  for (let i = 1; i <= hoursAhead; i++) {
    const future = new Date(date.getTime() + i * 3600000);
    const hourOfDay = future.getHours();
    const daySeed = Math.floor(future.getTime() / 86400000);
    const diurnal = Math.sin(((hourOfDay - 6) / 24) * Math.PI * 2 - Math.PI / 2);
    const temp = Math.round(base.temp + diurnal * 2.5 + (seededRandom(daySeed + hourOfDay) - 0.5) * 1.5);
    const windSpeed = Math.max(3, Math.round(base.windSpeed + (seededRandom(daySeed + hourOfDay + 50) - 0.5) * 6));
    const isNight = hourOfDay < 6 || hourOfDay >= 19;
    hours.push({
      time: future.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
      hourOfDay, temp, windSpeed, isNight,
      condition: base.condition,
    });
  }
  return hours;
}

// ---------------------------------------------------------------
// Fishing score — a simple, transparent heuristic. Explicitly
// labelled in the UI as personal/estimated, not scientific.
// ---------------------------------------------------------------
function getFishingScore(tide, weather, moon) {
  let score = 55;
  // strong tidal movement is good
  const movement = Math.abs(tide.amplitude);
  score += Math.min(movement * 18, 20);
  // rising tide bonus
  if (tide.rising) score += 6;
  // wind sweet spot 6-16 kt
  if (weather.windSpeed >= 6 && weather.windSpeed <= 16) score += 10;
  else score -= 5;
  // moon: new/full = stronger currents, historically favoured
  if (moon.name === "New Moon" || moon.name === "Full Moon") score += 8;
  // wave comfort
  if (weather.waveHeight <= 1.0) score += 6;
  else if (weather.waveHeight > 1.5) score -= 8;

  score = Math.max(8, Math.min(97, Math.round(score)));
  let tag = "Slow", tagClass = "slow";
  if (score >= 75) { tag = "Excellent"; tagClass = "grass"; }
  else if (score >= 55) { tag = "Moderate"; tagClass = "gold"; }
  else { tag = "Slow"; tagClass = "slow"; }
  return { score, tag, tagClass };
}

// ---------------------------------------------------------------
// Best spots today — cross-references today's tide/moon/weather
// with each saved spot's own best-tide/best-time notes and the
// user's own catch history at that spot. This is a personal,
// rules-based match score (not a scientific prediction) meant to
// help decide where to fish today based on your own logged data.
// ---------------------------------------------------------------
function getTimeBucketKeywords(hour) {
  if (hour < 5) return ["night"];
  if (hour < 7) return ["dawn", "early morning", "sunrise", "morning"];
  if (hour < 10) return ["morning"];
  if (hour < 12) return ["late morning", "morning", "midday"];
  if (hour < 14) return ["midday", "noon", "afternoon"];
  if (hour < 17) return ["afternoon"];
  if (hour < 19) return ["dusk", "evening", "sunset"];
  return ["evening", "night"];
}

function bestTimeMatches(bestTime, hour) {
  if (!bestTime) return false;
  const bt = bestTime.toLowerCase();
  if (bt.includes("any")) return true;
  return getTimeBucketKeywords(hour).some((k) => bt.includes(k));
}

function bestTideMatches(bestTide, tideRising, nearHigh, nearLow) {
  if (!bestTide) return false;
  const bt = bestTide.toLowerCase();
  if (bt.includes("any")) return true;
  if ((bt.includes("incoming") || bt.includes("rising")) && tideRising) return true;
  if ((bt.includes("outgoing") || bt.includes("falling")) && !tideRising) return true;
  if (bt.includes("high") && nearHigh) return true;
  if (bt.includes("low") && nearLow && !bt.includes("low to rising")) return true;
  if (bt.includes("low to rising") && (nearLow || tideRising)) return true;
  return false;
}

function getBestSpotsToday(spots, catches, tide, weather, moon, dayScore, now) {
  if (!spots || spots.length === 0) return [];
  const hour = now.getHours() + now.getMinutes() / 60;
  const nearHigh = tide.currentHeight > tide.baseHeight + tide.amplitude * 0.65;
  const nearLow = tide.currentHeight < tide.baseHeight - tide.amplitude * 0.65;

  const results = spots.map((spot) => {
    let points = 0;
    const reasons = [];

    if (bestTideMatches(spot.bestTide, tide.rising, nearHigh, nearLow)) {
      points += 28;
      reasons.push(`Matches its best tide (${spot.bestTide})`);
    }
    if (bestTimeMatches(spot.bestTime, hour)) {
      points += 18;
      reasons.push(`Good time of day (${spot.bestTime})`);
    }

    const spotCatches = catches.filter((c) => c.spotId === spot.id);
    if (spotCatches.length > 0) {
      points += Math.min(spotCatches.length * 8, 24);
      reasons.push(`${spotCatches.length} catch${spotCatches.length === 1 ? "" : "es"} logged here`);

      const tideMatchCount = spotCatches.filter((c) => (c.tide === "Rising") === tide.rising).length;
      if (tideMatchCount > 0) {
        points += 10;
        reasons.push(`Past catch here on a similar tide`);
      }
      const moonMatchCount = spotCatches.filter((c) => c.moon === moon.name).length;
      if (moonMatchCount > 0) {
        points += 6;
        reasons.push(`Caught here during a ${moon.name.toLowerCase()} before`);
      }
    }
    if (spot.favourite) points += 6;

    // Scale by today's overall conditions score, so a slow day pulls every pick down
    points = Math.round(points * (0.55 + dayScore.score / 200));

    return { spot, points, reasons, catchCount: spotCatches.length };
  });

  return results.filter((r) => r.points > 0).sort((a, b) => b.points - a.points).slice(0, 2);
}

// ---------------------------------------------------------------
// Fishing score across the day — same weighting as getFishingScore,
// but re-evaluates the tide-driven terms (movement + rising) at
// each hour while holding today's weather/moon constant, so it can
// be drawn as a curve the same way the tide card is.
// ---------------------------------------------------------------
function getFishingScoreCurve(date, weather, moon) {
  const lunarDayHours = 24.8412;
  const periodHours = lunarDayHours / 2;
  const referenceEpoch = Date.UTC(2026, 0, 1, 4, 0);
  const localMidnight = new Date(date); localMidnight.setHours(0, 0, 0, 0);
  const hoursSinceEpochAtMidnight = (localMidnight.getTime() - referenceEpoch) / 3600000;
  const dayIndex = Math.floor(date.getTime() / 86400000);
  const phaseShift = ((hoursSinceEpochAtMidnight % periodHours) / periodHours) * 2 * Math.PI;
  const amplitude = 0.42 + seededRandom(dayIndex + 1) * 0.06;

  const points = [];
  for (let h = 0; h <= 24; h += 0.25) {
    const angle = (2 * Math.PI * h) / periodHours + phaseShift;
    const rate = amplitude * (2 * Math.PI / periodHours) * Math.cos(angle);
    const rising = rate > 0;
    const movement = Math.abs(rate);

    let score = 55;
    score += Math.min(movement * 18, 20);
    if (rising) score += 6;
    if (weather.windSpeed >= 6 && weather.windSpeed <= 16) score += 10;
    else score -= 5;
    if (moon.name === "New Moon" || moon.name === "Full Moon") score += 8;
    if (weather.waveHeight <= 1.0) score += 6;
    else if (weather.waveHeight > 1.5) score -= 8;
    score = Math.max(8, Math.min(97, Math.round(score)));

    let tagClass = "slow";
    if (score >= 75) tagClass = "grass";
    else if (score >= 55) tagClass = "gold";

    points.push({ h, score, tagClass });
  }
  return points;
}

// ---------------------------------------------------------------
// Major/Minor best-time windows — groups the score curve into
// contiguous "Major" (Excellent-tier) and "Minor" (Moderate-tier)
// stretches, similar to how solunar tables present peak windows.
// ---------------------------------------------------------------
function getMajorMinorWindows(scoreCurve) {
  const toTimeStr = (h) => {
    const hh = Math.floor(h) % 24;
    const mm = Math.round((h - Math.floor(h)) * 60);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  const windows = [];
  let current = null;
  for (const p of scoreCurve) {
    const kind = p.tagClass === "grass" ? "major" : p.tagClass === "gold" ? "minor" : null;
    if (kind && current && current.kind === kind) {
      current.endH = p.h;
    } else {
      if (current) windows.push(current);
      current = kind ? { kind, startH: p.h, endH: p.h } : null;
    }
  }
  if (current) windows.push(current);

  return windows
    .filter((w) => w.endH - w.startH >= 0.75)
    .map((w) => ({ ...w, startTime: toTimeStr(w.startH), endTime: toTimeStr(w.endH) }));
}

function getRecommendation(tide, weather, moon, score) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 9 ? "early morning" : hour < 12 ? "late morning" : hour < 16 ? "afternoon" : hour < 19 ? "evening" : "night";
  if (score.score >= 75) {
    return tide.rising
      ? `Strong incoming tide + ${timeOfDay} conditions. Good time to target reef predators near channels and drop-offs.`
      : `Fast outgoing tide is pulling baitfish off the flats — worth a run on the channel mouths for GT and jobfish.`;
  }
  if (score.score >= 55) {
    return `Moderate movement today. Structure-hugging species like grouper and snapper are the safer bet over open-water trolling.`;
  }
  return `Light tidal movement and softer conditions today — a slower bite is likely. Consider bottom fishing over deeper reef structure.`;
}

// ---------------------------------------------------------------
// Sample seed data (used only if the local database is empty)
// ---------------------------------------------------------------
const SampleSpots = [
  {
    id: "seed-spot-1", name: "Vaavu Channel Drop-off", lat: 3.4083, lng: 73.4844,
    atoll: "Vaavu Atoll", island: "Felidhoo Channel", depth: "18-40m", structure: "Channel wall, current edge",
    technique: "Jigging", targetSpecies: ["gt", "dtt"], bestTide: "Incoming", bestTime: "Early morning",
    favourite: true, notes: "GT stack up on the outgoing current near the bommie at the channel mouth.",
    photos: [], successCount: 6, createdAt: Date.now() - 86400000 * 40,
  },
  {
    id: "seed-spot-2", name: "Ari Reef Pinnacle", lat: 3.9702, lng: 72.8306,
    atoll: "Ari Atoll", island: "Maamigili area", depth: "6-25m", structure: "Reef pinnacle, coral bommie",
    technique: "Popping", targetSpecies: ["gt"], bestTide: "High", bestTime: "Dusk",
    favourite: true, notes: "Poppers work best in the last hour of light as the tide tops out.",
    photos: [], successCount: 4, createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: "seed-spot-3", name: "Addu Outer Reef", lat: -0.6301, lng: 73.1069,
    atoll: "Addu Atoll", island: "Gan", depth: "30-90m", structure: "Steep outer wall, blue water",
    technique: "Trolling", targetSpecies: ["yft", "wahoo", "sailfish"], bestTide: "Any", bestTime: "Mid-morning",
    favourite: false, notes: "Bait balls often show up on the sounder just past the drop.",
    photos: [], successCount: 2, createdAt: Date.now() - 86400000 * 18,
  },
  {
    id: "seed-spot-4", name: "Laamu Lagoon Flats", lat: 1.8762, lng: 73.4394,
    atoll: "Laamu Atoll", island: "Gan (Laamu)", depth: "2-6m", structure: "Sand flats, coral heads",
    technique: "Casting", targetSpecies: ["rsnap", "redbass"], bestTide: "Low to rising", bestTime: "Morning",
    favourite: false, notes: "Good sight-casting when the water is calm and clear.",
    photos: [], successCount: 3, createdAt: Date.now() - 86400000 * 9,
  },
];

const SampleCatches = [
  {
    id: "seed-catch-1", species: "gt", customSpecies: "", weight: 18.4, length: 112,
    datetime: Date.now() - 86400000 * 2, lat: 3.4083, lng: 73.4844, spotId: "seed-spot-1",
    technique: "Jigging", lure: "250g knife jig, silver", tide: "Rising", nakaiy: "Rihi",
    moon: "Waxing Gibbous", weather: "Partly cloudy", wind: "16mph NE", photos: [], notes: "Hit on the drop, second cast at the ledge.",
  },
  {
    id: "seed-catch-2", species: "yft", customSpecies: "", weight: 9.1, length: 74,
    datetime: Date.now() - 86400000 * 6, lat: -0.6301, lng: 73.1069, spotId: "seed-spot-3",
    technique: "Trolling", lure: "Purple/black skirted lure", tide: "Falling", nakaiy: "Burunu",
    moon: "Full Moon", weather: "Sunny", wind: "10mph E", photos: [], notes: "School was working bait just off the wall.",
  },
  {
    id: "seed-catch-3", species: "grouper", customSpecies: "", weight: 4.2, length: 48,
    datetime: Date.now() - 86400000 * 11, lat: 3.9702, lng: 72.8306, spotId: "seed-spot-2",
    technique: "Bottom fishing", lure: "Cut bait, squid", tide: "High", nakaiy: "Miya",
    moon: "Last Quarter", weather: "Clear skies", wind: "13mph SE", photos: [], notes: "",
  },
];

const SampleTrips = [
  {
    id: "seed-trip-1", name: "Vaavu Channel Morning", date: Date.now() - 86400000 * 2,
    startTime: "05:40", endTime: "10:20", startLocation: "Felidhoo jetty", atoll: "Vaavu Atoll",
    island: "Felidhoo", boat: "Dhoni — Reef Runner", partners: "Ahmed, Ibrahim", targetSpecies: ["gt", "dtt"],
    technique: "Jigging", weather: "Partly cloudy", seaCondition: "Slight", wind: "16mph NE",
    notes: "Strong current at the channel, two GT landed.", photos: [], catchIds: ["seed-catch-1"], status: "completed",
  },
];

const SampleExpenses = [
  { id: "seed-exp-1", date: Date.now() - 86400000 * 2, category: "fuel", amount: 850, description: "Diesel top-up", tripId: "seed-trip-1", notes: "", photos: [] },
  { id: "seed-exp-2", date: Date.now() - 86400000 * 5, category: "tackle", amount: 1250, description: "250g jigs x3", tripId: null, notes: "New silver knife jigs", photos: [] },
  { id: "seed-exp-3", date: Date.now() - 86400000 * 2, category: "food", amount: 180, description: "Snacks & water", tripId: "seed-trip-1", notes: "", photos: [] },
  { id: "seed-exp-4", date: Date.now() - 86400000 * 9, category: "maintenance", amount: 600, description: "Engine oil change", tripId: null, notes: "", photos: [] },
];

const DEFAULT_LOCATION = { lat: 4.1755, lng: 73.5093, label: "Male', Maldives" }; // fallback map center
