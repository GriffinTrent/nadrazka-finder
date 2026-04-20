'use client';

// Pure vanilla Leaflet — no react-leaflet components.
// Loaded via dynamic(..., { ssr: false }) so top-level Leaflet import is safe.
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Custom circle marker — cleaner than the default pin icon
// isSelected: currently open (bright yellow + enlarged)
// isVerified: verified pub (blue) vs unverified (amber)
function createMarkerIcon(isSelected, isVerified = true) {
  // Selected overrides everything — bright yellow
  const bg = isSelected ? '#FBBF24' : (isVerified ? '#1E40AF' : '#F59E0B');
  return L.divIcon({
    html: `<div style="
      position: relative;
      width: 20px;
      height: 20px;
      transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
      transition: transform 0.15s;
    ">
      <div style="
        width: 20px;
        height: 20px;
        background: ${bg};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      "></div>
    </div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

/**
 * @param {{ mapData?: any[], onLocationSelect?: (location: any) => void, selectedId?: string | null, darkMode?: boolean }} props
 */
export default function Map({ mapData = [], onLocationSelect = () => {}, selectedId = null, darkMode = false }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef([]);
  const onSelectRef = useRef(onLocationSelect);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // Initialize Leaflet map once on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Czech Republic centre
    const map = L.map(containerRef.current, { zoomControl: false }).setView([49.8175, 15.4730], 7);

    const tile = L.tileLayer(darkMode ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapRef.current = map;
    tileRef.current = tile;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap tile layer when darkMode changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;

    map.removeLayer(tileRef.current);
    const tile = L.tileLayer(darkMode ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    tileRef.current = tile;
  }, [darkMode]);

  // Add markers whenever mapData changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapData.length) return;

    const currentSelectedId = selectedIdRef.current;
    const markers = mapData
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((nadrazka) => {
        const isSelected = nadrazka.id === currentSelectedId;
        const marker = L.marker([nadrazka.lat, nadrazka.lng], {
          icon: createMarkerIcon(isSelected, nadrazka.verified),
        });
        marker.on('click', () => {
          onSelectRef.current(nadrazka);
        });
        marker.addTo(map);
        marker._locationId = nadrazka.id;
        marker._verified = nadrazka.verified;
        return marker;
      });

    markersRef.current = markers;

    return () => {
      markers.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [mapData]);

  // Update marker appearances when selection changes
  useEffect(() => {
    markersRef.current.forEach((m) => {
      m.setIcon(createMarkerIcon(
        m._locationId === selectedId,
        m._verified,
      ));
    });
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100vh', width: '100%' }}
    />
  );
}
