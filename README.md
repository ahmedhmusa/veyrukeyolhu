# VeyruKeyolhu — Static PWA (Phase 1)

A fully working, installable, offline-first fishing companion. No backend, no build step — just static files.

## What's actually working
- **Home** — live tide estimate + curve, moon phase, current Nakaiy with your own personal notes, weather, and a personal/estimated "fishing score" with a plain-language recommendation.
- **Map** — real Leaflet + OpenStreetMap map, GPS "locate me," drop-a-pin to add a spot, edit/delete spots, filter by species/atoll/favourite, search.
- **Trips** — create a trip, live trip mode with an elapsed timer and current tide/wind, log catches straight from the live trip, end trip.
- **Catches** — under-20-second quick log (species grid, weight/length, photo, auto-filled GPS/tide/moon/Nakaiy/weather), photo-first catch detail, "View on Map" / "View Trip" links.
- **More** — name, light/dark/auto theme, units toggle, install-to-home-screen, JSON backup export/import, erase local data.
- **Offline** — every record is written to IndexedDB first. A service worker caches the app shell and map tiles you've viewed, so the app and your data survive a dead connection on the boat. "Saved offline ✓" shows when you log something with no connection.

## Important honesty note
This build has **no cloud backend**. Data lives in IndexedDB on the one device/browser you're using — there's no Supabase, no multi-device sync, no login yet. That's Phase 2 (the Next.js + Supabase version), which needs its own project setup to actually run. Use **More → Export backup** to save/move your data in the meantime.

## How to run it
Service workers and camera/GPS APIs require **https or localhost** — opening `index.html` directly via `file://` will mostly work but the service worker (offline caching) won't register. Pick one:

**Quickest (local test on your computer):**
```bash
cd veyrukeyolhu
python3 -m http.server 8080
# open http://localhost:8080
```

**Deploy with GitHub Pages (recommended for a real installable app):**

A ready-made deploy workflow is already included at `.github/workflows/deploy.yml`.

1. Create a new **public** repo on GitHub (e.g. `veyrukeyolhu`) — don't add a README, .gitignore, or license, so it starts empty.
2. From inside this `veyrukeyolhu` folder, push its *contents* to the repo root:
   ```bash
   cd veyrukeyolhu
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages** and set **Source** to **GitHub Actions** (only needs doing once — the included workflow handles every push after that).
4. Wait about a minute for the **Actions** tab to show a green check, then your app is live at:
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`
5. Open that URL in Safari on your iPhone → Share → **Add to Home Screen**.

Any time you push a change to `main`, the workflow redeploys automatically — no manual steps.

**On your iPhone (no terminal, using Netlify instead):**
1. Drag the folder onto [Netlify Drop](https://app.netlify.com/drop) for a one-off link, no GitHub or signup needed.
2. Open the resulting URL in Safari on your iPhone.
3. Tap the Share icon → **Add to Home Screen**.
4. Launch it from the home screen icon — it now runs full-screen, works offline, and behaves like a native app.

## File map
```
index.html        shell + PWA meta tags
manifest.json      installability config
sw.js              offline caching (app shell + map tiles)
css/styles.css     full design system (light/dark, glass cards, nav)
js/data.js         tide/moon/Nakaiy models, species list, sample data
js/db.js           IndexedDB wrapper
js/app.js          router, state, shell, theme, toasts
js/view-*.js       one file per tab (home, map, trips, catches, more)
icons/             app icons (generated)
.github/workflows/deploy.yml   auto-deploys to GitHub Pages on push
```

## Known limitations (by design, for this phase)
- Tide, weather, and sunrise/sunset are seeded estimates for personal reference, not real marine-forecast data — swap in a real tide/weather API in Phase 2.
- Nakaiy date ranges are illustrative; traditional sources vary slightly.
- No login/auth — the app assumes one user per device.
- Existing photos on a spot can't be individually removed once saved (newly added ones can, before saving).
