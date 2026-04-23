import React, { useEffect, useMemo, useState } from "react";
import MapView from "./MapView.jsx";
import {
  extractProjects,
  formatAED,
  isFiniteNum,
  normalizeProject,
  sortProjects,
} from "../lib/normalize.js";

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
  const cardsRef = React.useRef(null);

  // Filters
  const [community, setCommunity] = useState("");
  const [developer, setDeveloper] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("featured_then_name");
  const [page, setPage] = useState(1);
  const [columns, setColumns] = useState(3);

  const ROWS_PER_PAGE = 3;

  useEffect(() => {
    let cancelled = false;

    fetch("/properties.json", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (!text.trim()) throw new Error("properties.json is empty");

        try {
          return JSON.parse(text);
        } catch (error) {
          throw new Error(`properties.json is not valid JSON: ${error.message}`);
        }
      })
      .then((payload) => {
        if (cancelled) return;

        const projects = extractProjects(payload);
        if (!Array.isArray(projects)) {
          throw new Error("Invalid JSON: expected an array of projects");
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

  useEffect(() => {
    if (typeof window === "undefined" || !cardsRef.current) return;
    const el = cardsRef.current;

    const updateColumns = () => {
      const styles = window.getComputedStyle(el);
      const minWidth = parseFloat(styles.getPropertyValue("--card-min")) || 320;
      const gap = parseFloat(styles.getPropertyValue("--card-gap")) || 14;
      const width = el.clientWidth || 0;
      const cols = Math.max(1, Math.floor((width + gap) / (minWidth + gap)));
      setColumns(cols);
    };

    updateColumns();
    const ro = new ResizeObserver(updateColumns);
    ro.observe(el);
    window.addEventListener("resize", updateColumns);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateColumns);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [community, developer, status, q, sortBy]);

  const pageSize = Math.max(1, columns * ROWS_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filtered.slice(startIndex, endIndex);

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
    setPage(1);
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
        <div className="cards" ref={cardsRef}>
          {pageItems.map((p, idx) => (
            <div key={p.id} className="card">
              <div className="cardMedia">
                <img
                  src={p.coverImage || getFallbackByIndex(startIndex + idx)}
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
                      e.currentTarget.src = getFallbackByIndex(startIndex + idx, 1);
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

        <div className="pagination">
          <div className="pagination-meta">
            Showing {Math.min(endIndex, filtered.length).toLocaleString()} of{" "}
            {filtered.length.toLocaleString()} listings
          </div>
          <div className="pagination-controls">
            <button
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </button>
            <div className="page-indicator">
              Page {safePage} of {totalPages}
            </div>
            <button
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function getFallbackByIndex(index, offset = 0) {
  const safeIndex = Number.isFinite(index) ? index : 0;
  const i = (safeIndex + offset) % FALLBACK_IMAGES.length;
  return FALLBACK_IMAGES[i];
}
