// ===================================================================
// Maldives Fishing Log — Local database (IndexedDB)
// Offline-first: every record lives here first. There is no cloud
// backend wired up in this build, so "sync" reflects local save
// status only — see the More tab for details on cloud sync.
// ===================================================================

const DB_NAME = "veyrukeyolhu";
const DB_VERSION = 2;
const STORES = ["spots", "catches", "trips", "settings", "expenses"];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("spots")) db.createObjectStore("spots", { keyPath: "id" });
      if (!db.objectStoreNames.contains("catches")) db.createObjectStore("catches", { keyPath: "id" });
      if (!db.objectStoreNames.contains("trips")) db.createObjectStore("trips", { keyPath: "id" });
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings", { keyPath: "key" });
      if (!db.objectStoreNames.contains("expenses")) db.createObjectStore("expenses", { keyPath: "id" });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function dbCount(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------
// Seed sample data on first run only
// ---------------------------------------------------------------
async function seedIfEmpty() {
  const count = await dbCount("spots");
  if (count > 0) return false;
  for (const s of SampleSpots) await dbPut("spots", s);
  for (const c of SampleCatches) await dbPut("catches", c);
  for (const t of SampleTrips) await dbPut("trips", t);
  for (const e of SampleExpenses) await dbPut("expenses", e);
  return true;
}

// ---------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------
async function getSetting(key, fallback = null) {
  const rec = await dbGet("settings", key);
  return rec ? rec.value : fallback;
}
async function setSetting(key, value) {
  return dbPut("settings", { key, value });
}
