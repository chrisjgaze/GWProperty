import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ properties }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;

    mapRef.current = L.map(elRef.current, { zoomControl: true }).setView([25.2048, 55.2708], 11);

    // NOTE: Replace this tiles URL with a proper tiles provider for production.
    // For quick dev/testing, this often works:
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapRef.current);

    layerRef.current = L.layerGroup().addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;

    layerRef.current.clearLayers();

    const pts = properties
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => {
        const m = L.marker([p.lat, p.lng]).bindPopup(
          `<strong>${p.title ?? ""}</strong><br/>${p.community ?? ""}<br/>${p.status ?? ""}`
        );
        m.addTo(layerRef.current);
        return [p.lat, p.lng];
      });

    if (pts.length) {
      const bounds = L.latLngBounds(pts);
      mapRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [properties]);

  return <div ref={elRef} style={{ height: "100%", width: "100%" }} />;
}
