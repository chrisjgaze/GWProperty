// src/components/ListingsApp.jsx
import React, { useEffect, useMemo, useState } from "react";
import MapView from "./MapView.jsx";

/**
 * Expects your JSON at: /public/properties.json
 * Shape:
 *  {
 *    "status": "...",
 *    "data": {
 *      "projects": [ { id, name, latitude, longitude, community, developer, image, sales_status, completion_date, unit_variations: [...] } ]
 *    }
 *  }
 */

export default function ListingsApp() {
  const [all, setAll] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [showMap, setShowMap] = useState(true);

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
        const hay = [
          p.title,
          p.community,
          p.developer,
          p.statusLabel,
          p.completionDate,
        ]
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

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh" }}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline" }}>
          <div>
            <span style={{ opacity: 0.8 }}>Searching:</span>{" "}
            <strong>{searchingLabel}</strong>
          </div>
          <div style={{ opacity: 0.75 }}>
            {filtered.length.toLocaleString()} listings found
          </div>
          <div style={{ opacity: 0.55 }}>
            {mapPinsCount.toLocaleString()} with map pins
          </div>
        </div>

        <button onClick={() => setShowMap((s) => !s)} style={styles.mapButton}>
          {showMap ? "CLOSE MAP" : "OPEN MAP"}
        </button>
      </div>

      {/* Load error */}
      {loadError ? (
        <div style={{ padding: 16 }}>
          <div style={styles.errorBox}>
            <strong>Data load error:</strong> {loadError}
            <div style={{ marginTop: 8, opacity: 0.8 }}>
              Put your JSON at <code>public/properties.json</code>
            </div>
          </div>
        </div>
      ) : null}

      {/* Map */}
      {showMap && !loadError ? (
        <div style={{ height: 420, borderBottom: "1px solid #e5e7eb" }}>
          <MapView properties={filtered} />
        </div>
      ) : null}

      <div style={{ padding: 18 }}>
        {/* Search panel */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>Search</div>

          <div style={styles.filtersRow}>
            <select value={community} onChange={(e) => setCommunity(e.target.value)} style={styles.input}>
              <option value="">All Communities</option>
              {communities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select value={developer} onChange={(e) => setDeveloper(e.target.value)} style={styles.input}>
              <option value="">All Developers</option>
              {developers.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Street, community, developer, keyword..."
              style={styles.input}
            />

            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button onClick={() => {}} style={styles.searchButton}>
              SEARCH
            </button>
          </div>

          <div style={styles.controlsRow}>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...styles.input, maxWidth: 320 }}>
              <option value="featured_then_name">Sort By (Featured → Name)</option>
              <option value="price_asc">Price (Low → High)</option>
              <option value="price_desc">Price (High → Low)</option>
              <option value="completion_asc">Completion (Sooner → Later)</option>
              <option value="completion_desc">Completion (Later → Sooner)</option>
              <option value="name_asc">Name (A → Z)</option>
              <option value="name_desc">Name (Z → A)</option>
            </select>

            <button
              onClick={() => {
                setCommunity("");
                setDeveloper("");
                setStatus("");
                setQ("");
                setSortBy("featured_then_name");
              }}
              style={styles.clearButton}
            >
              Clear
            </button>

            <div style={{ marginLeft: "auto", opacity: 0.7, fontSize: 13 }}>
              Tip: filter first before using the map if it feels busy.
            </div>
          </div>
        </div>

        {/* Cards */}
        <div style={styles.cardsGrid}>
          {filtered.map((p) => (
            <div key={p.id} style={styles.card}>
              <div style={{ position: "relative" }}>
                <img
                  src={p.coverImage || "/images/placeholder.jpg"}
                  alt={p.title}
                  style={styles.cardImage}
                  loading="lazy"
                  onError={(e) => {
                    // fallback if remote image fails
                    e.currentTarget.src = "/images/placeholder.jpg";
                  }}
                />

                {p.featured ? (
                  <div style={styles.featuredBadge}>FEATURED</div>
                ) : null}
              </div>

              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18, lineHeight: 1.15 }}>
                      {p.title}
                    </div>
                    <div style={{ color: "#6b7280", marginTop: 6 }}>
                      {p.community || "—"}{" "}
                      <span style={{ opacity: 0.6 }}>•</span>{" "}
                      {p.developer || "—"}
                    </div>
                  </div>

                  <div style={{ fontWeight: 900, textAlign: "right", minWidth: 120 }}>
                    {p.minPrice != null ? `AED ${formatAED(p.minPrice)}` : "Price N/A"}
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                      {p.statusLabel}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, color: "#374151", fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>Completion:</span>{" "}
                  {p.completionDate || "—"}
                </div>

                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {p.hasPin ? <span style={styles.pill}>📍 Map</span> : <span style={styles.pillMuted}>No pin</span>}
                  {p.unitTypesLabel ? <span style={styles.pill}>{p.unitTypesLabel}</span> : null}
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
    coverImage: p.image ?? "",
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

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean).sort((a, b) => a.localeCompare(b));
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

// Handles strings like "7.32 M" or "715 K" (as seen in your feed)
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

// Replace this mapping once you confirm what the codes mean in your source
function salesStatusLabel(code) {
  const map = {
    1: "Status 1",
    2: "Status 2",
    3: "Status 3",
    4: "Status 4",
  };
  return map[code] ?? (code == null ? "Unknown" : `Status ${code}`);
}

// Optional: guess "featured" if your feed doesn't contain a featured flag
function isLikelyFeatured(p) {
  // e.g. any project with an image + has pin + has at least one unit price
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

/**
 * Your feed has completion_date like "Q3 2026" in the snippet.
 * This turns it into a sortable number: YYYYQ (e.g., 20263)
 */
function parseCompletionDateSortable(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim().toUpperCase(); // "Q3 2026"
  const m = t.match(/^Q([1-4])\s+(\d{4})$/);
  if (!m) return null;
  const q = parseInt(m[1], 10);
  const y = parseInt(m[2], 10);
  return y * 10 + q; // 20263
}

/* ---------------- Styles ---------------- */

const styles = {
  topBar: {
    background: "#111827",
    color: "white",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  mapButton: {
    background: "#16a34a",
    border: 0,
    color: "white",
    padding: "10px 14px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 800,
    letterSpacing: 0.3,
    whiteSpace: "nowrap",
  },
  errorBox: {
    background: "white",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: 14,
    color: "#7f1d1d",
  },
  panel: {
    background: "white",
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  panelHeader: {
    background: "#1f2937",
    color: "white",
    padding: 16,
    fontSize: 22,
    fontWeight: 800,
  },
  filtersRow: {
    padding: 16,
    display: "grid",
    gridTemplateColumns: "1.2fr 1.2fr 2fr 1fr auto",
    gap: 12,
    alignItems: "center",
  },
  controlsRow: {
    padding: "0 16px 16px",
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    outline: "none",
    background: "white",
  },
  searchButton: {
    background: "#111827",
    color: "white",
    border: 0,
    padding: "12px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.4,
  },
  clearButton: {
    background: "transparent",
    border: "1px solid #d1d5db",
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  cardsGrid: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 14,
  },
  card: {
    background: "white",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  },
  cardImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    display: "block",
  },
  featuredBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    background: "#111827",
    color: "white",
    padding: "6px 10px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 900,
  },
  pill: {
    fontSize: 12,
    background: "#eef2ff",
    color: "#1f2937",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontWeight: 700,
  },
  pillMuted: {
    fontSize: 12,
    background: "#f3f4f6",
    color: "#6b7280",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontWeight: 700,
  },
};
