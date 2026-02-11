import React, { useEffect, useRef, useState } from "react";

const MAX_MARKERS = 400;
const MIDDLE_EAST_BBOX = {
  minLat: 12.0,
  maxLat: 36.5,
  minLng: 34.0,
  maxLng: 64.0,
};

export default function MapView({ properties, selectedId, onSelect }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const iconRef = useRef(null);
  const [ready, setReady] = useState(false);
  const selectedIdStr = selectedId ? String(selectedId) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!elRef.current || mapRef.current) return;

    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;

      // Bright pin for dark basemap
      iconRef.current = {
        default: L.divIcon({
          className: "map-pin",
          html: '<span class="map-pin-dot"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -12],
        }),
        selected: L.divIcon({
          className: "map-pin",
          html: '<span class="map-pin-dot is-selected"></span>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -12],
        }),
      };

      mapRef.current = L.map(elRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
      }).setView(
        [25.2048, 55.2708],
        11
      );

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      }).addTo(mapRef.current);

      layerRef.current = L.layerGroup().addTo(mapRef.current);
      setReady(true);
    })();

    return () => {
      try {
        mapRef.current?.remove();
        mapRef.current = null;
        layerRef.current = null;
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (!ready || !layerRef.current || !iconRef.current) return;

    (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;

      layerRef.current.clearLayers();

      const pins = (properties || [])
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .filter((p) => isInMiddleEastBBox(p.lat, p.lng))
        .slice(0, MAX_MARKERS);

      const bounds = [];
      let selectedLatLng = null;

      for (const p of pins) {
        bounds.push([p.lat, p.lng]);

        // 🔴 Use explicit icon here
        const isSelected = selectedIdStr && String(p.id) === selectedIdStr;
        const priceLabel = p.minPrice != null ? `AED ${formatAED(p.minPrice)}` : "Price N/A";
        const statusLabel = p.statusLabel || "Status";
        const marker = L.marker([p.lat, p.lng], {
          icon: isSelected ? iconRef.current.selected : iconRef.current.default,
        })
          .bindPopup(
            `<div class="map-popup">
              <div class="map-popup-title">${escapeHtml(p.title)}</div>
              <div class="map-popup-sub">${escapeHtml(p.community)} • ${escapeHtml(p.developer)}</div>
              <div class="map-popup-row">
                <span class="map-popup-price">${escapeHtml(priceLabel)}</span>
                <span class="map-popup-pill">${escapeHtml(statusLabel)}</span>
              </div>
            </div>`
          )
          .addTo(layerRef.current);

        if (typeof onSelect === "function") {
          marker.on("click", () => onSelect(p));
        }

        marker.on("mouseover", () => marker.openPopup());
        marker.on("mouseout", () => {
          if (!isSelected) marker.closePopup();
        });

        if (isSelected) {
          selectedLatLng = [p.lat, p.lng];
          marker.openPopup();
        }
      }

      mapRef.current.invalidateSize();
      if (selectedLatLng) {
        mapRef.current.setView(selectedLatLng, Math.max(mapRef.current.getZoom(), 13));
      } else if (bounds.length) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
      }
    })();
  }, [ready, properties, selectedIdStr, onSelect]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={elRef} style={{ height: "100%", width: "100%" }} />
    </>
  );
}

function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatAED(n) {
  return new Intl.NumberFormat("en-AE").format(n);
}

function isInMiddleEastBBox(lat, lng) {
  return (
    lat >= MIDDLE_EAST_BBOX.minLat &&
    lat <= MIDDLE_EAST_BBOX.maxLat &&
    lng >= MIDDLE_EAST_BBOX.minLng &&
    lng <= MIDDLE_EAST_BBOX.maxLng
  );
}
