# SmartMove — Intelligent Transportation Ecosystem (Hackathon Prototype)

> We don't just tell commuters where to go. We help them decide **how** they should travel.

This document is the API/data-source investigation required before writing any code, per the
project brief. It records what was actually verified (as of **2026-08-19**), not assumptions.
Every entry below states: availability, key requirement, free quota, restrictions, and the
decision made for this prototype.

---

## 1. Decision Table

| # | Capability | Chosen Provider | API Key Needed? | Free Quota (verified) | Notes / Fallback |
|---|---|---|---|---|---|
| 1 | Map display | **Leaflet + OpenStreetMap raster tiles** | No | Free, but OSM tile usage policy requires reasonable use + attribution; no heavy/bulk scripted tile pulling | If load is heavy, swap tile URL to MapTiler/Carto free tier later |
| 2 | Geocoding | **Nominatim** (OSM) | No | Public endpoint capped at **1 req/sec**, requires a real `User-Agent`, results must be cached client-side | We cache geocode results in-memory/localStorage per session |
| 3 | Routing (car/bike/walk/cycle) | **OSRM public demo server** (`router.project-osrm.org`) | No | No hard published quota; informal ~1 req/sec; **non-commercial demo use only**, can be withdrawn anytime | Provider abstraction (`RoutingProvider`) lets us swap to a self-hosted OSRM or OpenRouteService later |
| 3b | Routing (secondary/alt-route source) | **OpenRouteService** | **Yes** | 2,500 requests/day, 40,000/month, 40 concurrent | **Optional** — only used if `ORS_API_KEY` is supplied; otherwise OSRM alone powers routing |
| 4 | Live traffic (condition, incidents, delay) | **TomTom Traffic API** | **Yes** | 2,500 non-tile requests/day, 50,000 tile requests/day, free forever tier, no card required | **STOP POINT — needs your key.** Without it, traffic is shown as "Traffic data unavailable" — we will NOT fabricate live congestion. A clearly-labeled time-of-day traffic **heuristic** (rush hour bands) is used only as a visibly-marked estimate, never presented as live data |
| 5 | Accident-prone / road safety | **No suitable free live API found** | N/A | data.gov.in road-accident datasets exist but are **state/UT-level yearly aggregates**, not geocoded point/segment data usable for map visualization | **This feature requires a dataset from you.** We build a CSV import pipeline (`lat, lon, date, severity, road, city`) and a safety-scoring engine around it. Until a real dataset is supplied, the safety layer runs in a clearly labeled **DEMO/mock mode** with an on-screen banner — never presented as real accident history |
| 6 | Parking locations | **Overpass API** (OSM `amenity=parking`, `amenity=bicycle_parking`) | No | Free, fair-use rate limits on public Overpass instances (~10,000 elements/request soft limit, avoid hammering) | Only **location**, name, and OSM tags (fee/opening_hours if mapped) are shown — never fabricated real-time space counts |
| 6b | Parking (richer place data, optional) | Foursquare Places | **Yes** | Free tier changed recently (500–10,000 Pro calls/month depending on account, confirm in your dashboard) | **Optional** — only wired in if you supply `FOURSQUARE_API_KEY`; Overpass is the primary/default source and works with zero keys |
| 7 | Chennai public transport (bus routes/stops/times) | **Transitland-archived MTC Chennai GTFS** (`gtfs-archives-not-hosted-elsewhere/mtc_chennai.zip`) | No | Free static download | Documented as **outdated/incomplete** by the archive itself (some stop coordinates are wrong). We use it only as a **demo GTFS import** to prove the pipeline works, clearly labeled "demo dataset, not live MTC data." **If you have access to an official, current CUMTA/MTC/CMRL GTFS export, please provide it** — the importer (routes.txt/stops.txt/trips.txt/stop_times.txt/calendar.txt) will ingest it directly |
| 8 | Public transport real-time ETA | None found (no public MTC/CMRL real-time GPS feed) | — | — | Architecture supports a `RealtimeProvider` interface; today we only show **scheduled** times from GTFS, always labeled "Scheduled" not "Live" |
| 9 | Crowd-sourcing (bus fullness) | Built in-house (no external API) | No | — | Simple weighted-recency aggregation service, stored in our own DB |
| 10 | Emissions | Built in-house (`EmissionService`) | No | — | Configurable g CO₂/km factors per mode, not a live pollution API (per brief, avoid paid pollution APIs) |
| 11 | AI recommendation engine | **Groq** (`openai/gpt-oss-20b`) | **Yes** (provided) | 30 req/min, 6,000 tokens/min, 14,400 req/day, free forever, no card | Note: `llama-3.3-70b-versatile` (originally planned) returned `model_not_found` for this key at implementation time — Groq's free-tier model lineup had moved on. Verified working model on this key: `openai/gpt-oss-20b` (reasoning model; needs `reasoning_effort: low` + a larger `max_tokens` budget, since reasoning tokens count against the limit). `AIProvider` abstraction still applies if the lineup changes again |

---

## 2. What I need from you before those specific features go live

| Env var | Feature it unlocks | If not provided |
|---|---|---|
| `TOMTOM_API_KEY` | Live traffic condition/incidents/delay | Traffic shows "Traffic data unavailable" + a labeled heuristic estimate only |
| `GROQ_API_KEY` | AI recommendation explanations | Recommendation falls back to a deterministic rule-based explanation generator (no LLM prose, but same scoring logic) |
| Accident dataset (CSV: `latitude,longitude,date,severity,road,city`) | Real accident-prone-area overlay & safety scoring | Safety layer runs in DEMO mode with a visible "demo data, not real accident history" banner |
| (Optional) Official Chennai GTFS zip | Accurate, current bus data | We use the Transitland archived MTC feed as a labeled demo dataset |
| (Optional) `ORS_API_KEY` | Alternate-route diversity from OpenRouteService | OSRM alone still powers all routing |
| (Optional) `FOURSQUARE_API_KEY` | Richer parking metadata (hours/price) | Overpass (OSM) still powers parking locations |

**I am not inventing values for any of these.** Everything gated behind a missing key/dataset will
be visibly marked as unavailable or demo in the UI, never presented as real data.

---

## 3. Architecture

```
src/
  components/         UI building blocks (SearchBar, ModeCard, MapView, ...)
  pages/               Home / results screen
  services/
    routing/           RoutingProvider interface + OsrmProvider, OrsProvider
    traffic/           TrafficProvider interface + TomTomProvider, HeuristicFallback
    parking/           ParkingProvider interface + OverpassProvider, FoursquareProvider
    publicTransport/    GTFS import + query engine, CrowdReportService
    emissions/          EmissionService (configurable factors)
    safety/             AccidentDataService (CSV import) + SafetyScoringService
    ai/                 AIProvider interface + GroqProvider, RuleBasedFallbackProvider
    scoring/            RouteScoringService (configurable weights)
  data/                 Static config: emission factors, scoring weights, mock/demo flags
  utils/
  types/
```

Every external integration sits behind a provider interface (`RoutingProvider`,
`TrafficProvider`, `ParkingProvider`, `PublicTransportProvider`, `AIProvider`,
`SafetyDataProvider`) with an explicit fallback path, per the brief's Section 21.

## 4. Build order (matches brief Section 24)

Phase 1 UI shell → 2 Map (Leaflet+OSM) → 3 Geocoding (Nominatim) → 4 Routing (OSRM) →
5 Traffic (TomTom or heuristic fallback) → 6 Private-transport comparison + scoring →
7 Emissions → 8 Parking (Overpass) → 9 Chennai GTFS import/demo → 10 Crowd reporting →
11 AI recommendation layer → 12 Polish for demo.

Each phase will be smoke-tested before moving to the next.

## 5. Tech stack

- Frontend: React + TypeScript + Tailwind CSS + React-Leaflet
- Backend: Node.js + Express
- DB: SQLite for the hackathon prototype (swap-in path to Postgres/Supabase documented, not required to demo)
- All keys read from `.env`, never hard-coded, never sent to the frontend bundle — backend proxies all third-party calls.

## 6. Getting started

```bash
# 1. backend
cd server
npm install
npm run dev          # http://localhost:4000

# 2. frontend (separate terminal)
cd client
npm install
npm run dev           # http://localhost:5173 (proxies /api to :4000)
```

`.env` (project root) holds `TOMTOM_API_KEY`, `GROQ_API_KEY`, and optional `ORS_API_KEY` /
`FOURSQUARE_API_KEY`. Copy `.env.example` to `.env` and fill in your own keys — `.env` is
gitignored and never committed. On first run the server seeds a small **demo** Chennai bus
dataset (clearly labeled in the UI) covering a few illustrative corridors so the public
transport feature has something to query end-to-end.

### Importing a real GTFS feed

When an official CUMTA/MTC/CMRL GTFS export is available, drop the zip anywhere and run:

```bash
cd server
npm run import-gtfs -- /path/to/official-gtfs.zip "CUMTA official export"
```

This replaces the demo dataset with the real one (`routes.txt`, `stops.txt`, `trips.txt`,
`stop_times.txt` are all ingested; `calendar.txt` is not currently used for service-day
filtering, so all trips are treated as running daily — fine for a hackathon demo, worth
revisiting for production).

## 7. Deployment

The backend can serve the built frontend itself, so the whole app deploys as **one service**
with no CORS or cross-origin API URL wiring needed.

```bash
npm run install:all   # installs client + server deps
npm run build          # builds client (Vite) then server (tsc) into client/dist and server/dist
npm start               # node server/dist/index.js — serves the API and the built frontend together
```

### Deploying to Render (recommended, free tier)

1. Push this repo to GitHub (see Section 8 below).
2. On [render.com](https://render.com), click **New → Web Service** and connect the GitHub repo.
3. Settings:
   - **Root directory:** repo root (where this README lives)
   - **Build command:** `npm run build`
   - **Start command:** `npm start`
   - **Environment variables:** add `TOMTOM_API_KEY`, `GROQ_API_KEY` (and optionally `ORS_API_KEY`,
     `FOURSQUARE_API_KEY`) from your local `.env` — never commit real keys to the repo.
4. Deploy. Render assigns a public URL serving both the app and the API.

**Caveat:** Render's free tier filesystem is ephemeral — the SQLite file (crowd reports, SOS
incidents, imported GTFS data) resets on every redeploy/restart. Fine for a demo; for a
persistent deployment, attach a Render Disk (paid) or swap `better-sqlite3` for a hosted
Postgres (e.g. Supabase, also free tier) — the demo GTFS reseeds automatically either way.

### Alternative: split deployment (Vercel + Render)

If you'd rather host the frontend on Vercel and the backend separately on Render:
- Deploy `server/` to Render as above (build command `npm run build --prefix .` inside `server/`,
  or just `npm install && npm run build`; start command `npm start`).
- Deploy `client/` to Vercel as a static Vite app (root directory `client`, build command
  `npm run build`, output directory `dist`).
- Set `VITE_API_BASE_URL` on Vercel to your Render backend URL, and update `client/src/api.ts`
  to prefix requests with `import.meta.env.VITE_API_BASE_URL` instead of relying on the dev-only
  proxy in `vite.config.ts`.
- On the backend, restrict `cors()` in `server/src/index.ts` to your Vercel domain instead of
  the current permissive default.

The single-service Render deployment above avoids all of this and is what this project is
set up for out of the box.

## 8. Publishing to GitHub

```bash
cd smartmove
git init
git add .
git commit -m "SmartMove: intelligent transportation ecosystem prototype"
```

Then create an empty repository on GitHub (github.com → New repository → do **not** initialize
with a README/license, since this repo already has one), and push:

```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

`.env` (with your real API keys) is gitignored and will not be pushed — only `.env.example` is
committed. Anyone cloning the repo copies `.env.example` to `.env` and fills in their own keys.
