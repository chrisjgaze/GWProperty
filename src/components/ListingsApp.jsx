import React, { useEffect, useMemo, useState } from "react";
import MapView from "./MapView.jsx";

/**
 * Expects: /public/properties.json
 * Feed shape:
 *  {
 *    "status": "...",
 *    "data": { "projects": [ ... ] }
 *  }
 *
 * IMPORTANT:
 * - Create fallback images at: /public/images/pc1.jpg ... /pc5.jpg
 */

const FALLBACK_IMAGES = [
  "/images/pc1.jpg",
  "/images/pc2.jpg",
  "/images/pc3.jpg",
  "/images/pc4.jpg",
  "/images/pc5.jpg",
];

export default function ListingsApp() {
  const [all, setAll] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const mapWrapRef = React.useRef(null);

  // Filters
  const [community, setCommunity] = useState("");
  const [developer, setDeveloper] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("featured_then_name");

  useEffect(() => {
    let cancelled = false;

    fetch("/properties.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload) => {
        if (cancelled) return;

        const projects = payload?.data?.projects;
        if (!Array.isArray(projects)) {
          throw new Error("Invalid JSON: data.projects is missing or not an array");
        }

        const normalized = projects.map(normalizeProject);
        setAll(normalized);
        setLoadError("");
      })
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setLoadError(`Could not load properties.json (${String(e.message || e)})`);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const communities = useMemo(() => uniq(all.map((p) => p.community)), [all]);
  const developers = useMemo(() => uniq(all.map((p) => p.developer)), [all]);
  const statuses = useMemo(() => uniq(all.map((p) => p.statusLabel)), [all]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    let res = all.filter((p) => {
      if (community && p.community !== community) return false;
      if (developer && p.developer !== developer) return false;
      if (status && p.statusLabel !== status) return false;

      if (qq) {
        const hay = [p.title, p.community, p.developer, p.statusLabel, p.completionDate]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!hay.includes(qq)) return false;
      }

      return true;
    });

    res.sort((a, b) => sortProjects(a, b, sortBy));
    return res;
  }, [all, community, developer, status, q, sortBy]);

  const searchingLabel =
    community || developer || status || q ? "Filtered listings" : "All listings";

  const mapPinsCount = filtered.filter((p) => isFiniteNum(p.lat) && isFiniteNum(p.lng)).length;

  const selectProperty = (p, { openMap = false } = {}) => {
    if (!p) return;
    setSelectedId(String(p.id ?? ""));
    setCommunity(p.community ?? "");
    setDeveloper(p.developer ?? "");
    setStatus(p.statusLabel ?? "");
    setQ(p.title ?? "");

    if (openMap) {
      setShowMap(true);
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          mapWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    }
  };

  const resetAll = () => {
    setSelectedId("");
    setCommunity("");
    setDeveloper("");
    setStatus("");
    setQ("");
    setSortBy("featured_then_name");
    setShowMap(true);
  };

  return (
    <div className="app">
      {/* Top bar */}
      <div className="topbar">
        <div className="meta">
          <div>
            <span>Searching:</span> <strong>{searchingLabel}</strong>
          </div>
          <div>
            <span className="metaStat">{filtered.length.toLocaleString()} listings found</span>
          </div>
          <div>
            <span className="metaStat">{mapPinsCount.toLocaleString()} with map pins</span>
          </div>
        </div>

        <div className="topbarActions">
          <button onClick={resetAll} className="btn btn-outline">
            RESET
          </button>
          <button onClick={() => setShowMap((s) => !s)} className="btn btn-green">
          {showMap ? "CLOSE MAP" : "OPEN MAP"}
          </button>
        </div>
      </div>

      {/* Load error */}
      {loadError ? (
        <div className="container">
          <div className="errorBox">
            <strong>Data load error:</strong> {loadError}
            <div className="errorHint">
              Put your JSON at <code>public/properties.json</code>
            </div>
          </div>
        </div>
      ) : null}

      {/* Map */}
      {showMap && !loadError ? (
        <div className="mapWrap" ref={mapWrapRef}>
          <MapView
            properties={filtered}
            selectedId={selectedId}
            onSelect={(p) => selectProperty(p)}
          />
        </div>
      ) : null}

      <div className="container">
        {/* Search panel */}
        <div className="panel">
          <div className="panel-header">Search</div>

          <div className="filters">
            <div className="select-wrap">
              <select
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                className="input select"
              >
                <option value="">All Communities</option>
                {communities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-wrap">
              <select
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                className="input select"
              >
                <option value="">All Developers</option>
                {developers.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Street, community, developer, keyword..."
              className="input"
            />

            <div className="select-wrap">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input select">
                <option value="">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={() => {}} className="btn btn-dark">
              SEARCH
            </button>
          </div>

          <div className="controls">
            <div className="select-wrap input-compact">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input select">
                <option value="featured_then_name">Sort By (Featured → Name)</option>
                <option value="price_asc">Price (Low → High)</option>
                <option value="price_desc">Price (High → Low)</option>
                <option value="completion_asc">Completion (Sooner → Later)</option>
                <option value="completion_desc">Completion (Later → Sooner)</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
              </select>
            </div>

            <button onClick={resetAll} className="btn btn-outline">
              Clear
            </button>

            <div className="tip">Tip: filter first before using the map if it feels busy.</div>
          </div>
        </div>

        {/* Cards */}
        <div className="cards">
          {filtered.map((p, idx) => (
            <div key={p.id} className="card">
              <div className="cardMedia">
                <img
                  src={p.coverImage || getFallbackByIndex(idx)}
                  alt={p.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onClick={() => selectProperty(p, { openMap: true })}
                  onError={(e) => {
                    const failedUrl = e.currentTarget.src;
                    console.warn("[IMG FAIL]", p.id, p.title, failedUrl);

                    // Keep the failed URL visible in inspector
                    e.currentTarget.setAttribute("data-failed-src", failedUrl);

                    // Only fallback once
                    if (!e.currentTarget.dataset.fallbackApplied) {
                      e.currentTarget.dataset.fallbackApplied = "1";
                      e.currentTarget.src = getFallbackByIndex(idx, 1);
                    }
                  }}
                />

                {p.featured ? <div className="badge">FEATURED</div> : null}
              </div>

              <div className="cardBody">
                <div className="row">
                  <div>
                    <div className="title">{p.title}</div>
                    <div className="sub">
                      {p.community || "—"} <span className="dot">•</span> {p.developer || "—"}
                    </div>
                  </div>

                  <div className="price">
                    {p.minPrice != null ? `AED ${formatAED(p.minPrice)}` : "Price N/A"}
                    <div className="small">{p.statusLabel}</div>
                  </div>
                </div>

                <div className="metaLine">
                  <span className="label">Completion:</span> {p.completionDate || "—"}
                </div>

                <div className="pills">
                  {p.hasPin ? (
                    <span className="pill is-clickable" onClick={() => selectProperty(p, { openMap: true })}>
                      📍 Map
                    </span>
                  ) : (
                    <span className="pillMuted">No pin</span>
                  )}
                  {p.unitTypesLabel ? <span className="pill">{p.unitTypesLabel}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function normalizeProject(p) {
  const lat = toFloat(p.latitude);
  const lng = toFloat(p.longitude);

  const minPrice = computeMinPriceFromUnitVariations(p.unit_variations);

  const featured = !!p.featured || isLikelyFeatured(p);
  const unitTypesLabel = summarizeUnitTypes(p.unit_variations);

  return {
    id: String(p.id ?? ""),
    title: p.name ?? "Untitled",
    community: p.community ?? "",
    developer: p.developer ?? "",
    coverImage: cleanUrl(p.image ?? ""),
    lat,
    lng,
    hasPin: isFiniteNum(lat) && isFiniteNum(lng),
    completionDate: p.completion_date ?? "",
    salesStatusCode: p.sales_status,
    statusLabel: salesStatusLabel(p.sales_status),
    minPrice,
    featured,
    unitTypesLabel,
    raw: p,
  };
}

function cleanUrl(u) {
  if (!u) return "";
  try {
    const url = new URL(String(u).trim());
    return url.toString();
  } catch {
    return String(u).trim().replaceAll(" ", "%20");
  }
}

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function getFallbackByIndex(index, offset = 0) {
  const safeIndex = Number.isFinite(index) ? index : 0;
  const i = (safeIndex + offset) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[i];
}

function toFloat(v) {
  if (v == null) return null;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function isFiniteNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function formatAED(n) {
  return new Intl.NumberFormat("en-AE").format(n);
}

function computeMinPriceFromUnitVariations(unitVariations) {
  const prices = Array.isArray(unitVariations)
    ? unitVariations
        .map((uv) => parsePriceAED(uv?.starting_price))
        .filter((n) => Number.isFinite(n))
    : [];
  return prices.length ? Math.min(...prices) : null;
}

function parsePriceAED(v) {
  if (!v || typeof v !== "string") return null;
  const s = v.trim().toUpperCase();
  const m = s.match(/^([\d.]+)\s*([MK])$/);
  if (!m) return null;

  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return null;

  const mult = m[2] === "M" ? 1_000_000 : 1_000;
  return Math.round(num * mult);
}

// You can map these properly once you confirm what the codes mean
function salesStatusLabel(code) {
  const map = {
    1: "Status 1",
    2: "Status 2",
    3: "Status 3",
    4: "Status 4",
  };
  return map[code] ?? (code == null ? "Unknown" : `Status ${code}`);
}

function isLikelyFeatured(p) {
  const hasImage = !!p.image;
  const hasPin = !!(p.latitude && p.longitude);
  const hasUnits = Array.isArray(p.unit_variations) && p.unit_variations.length > 0;
  return hasImage && hasPin && hasUnits;
}

function summarizeUnitTypes(unitVariations) {
  if (!Array.isArray(unitVariations) || unitVariations.length === 0) return "";
  const types = uniq(unitVariations.map((uv) => uv?.unit_type).filter(Boolean));
  if (!types.length) return "";
  if (types.length <= 3) return types.join(" • ");
  return `${types.slice(0, 3).join(" • ")} • +${types.length - 3}`;
}

function sortProjects(a, b, sortBy) {
  const nameA = (a.title ?? "").toLowerCase();
  const nameB = (b.title ?? "").toLowerCase();

  const compA = parseCompletionDateSortable(a.completionDate);
  const compB = parseCompletionDateSortable(b.completionDate);

  switch (sortBy) {
    case "price_asc":
      return nullsLastAsc(a.minPrice, b.minPrice) || nameA.localeCompare(nameB);
    case "price_desc":
      return nullsLastDesc(a.minPrice, b.minPrice) || nameA.localeCompare(nameB);
    case "completion_asc":
      return nullsLastAsc(compA, compB) || nameA.localeCompare(nameB);
    case "completion_desc":
      return nullsLastDesc(compA, compB) || nameA.localeCompare(nameB);
    case "name_desc":
      return nameB.localeCompare(nameA);
    case "name_asc":
      return nameA.localeCompare(nameB);
    case "featured_then_name":
    default: {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      return fb - fa || nameA.localeCompare(nameB);
    }
  }
}

function nullsLastAsc(a, b) {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return a - b;
}

function nullsLastDesc(a, b) {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return b - a;
}

// Feed has completion_date like "Q3 2026"
function parseCompletionDateSortable(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim().toUpperCase();
  const m = t.match(/^Q([1-4])\s+(\d{4})$/);
  if (!m) return null;
  const q = parseInt(m[1], 10);
  const y = parseInt(m[2], 10);
  return y * 10 + q;
}
