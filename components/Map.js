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

// Keywords that signal a proper gritty station pub (score up → bigger marker)
const POSITIVE_WORDS = [
  // Czech
  'kouř', 'cigaret', 'graffiti', 'levn', 'lacin', 'levné pivo', 'dobré pivo',
  'skvělé pivo', 'výborné pivo', 'špinav', 'místní', 'stamgast', 'dělník',
  'starý pán', 'staříc', 'starej', 'pivko', 'pivo za', 'levný', 'lokální',
  // English
  'smoking', 'smoke', 'graffiti', 'cheap', 'cheap beer', 'good beer',
  'great beer', 'locals', 'local', 'dirty', 'workers', 'old men', 'regulars',
  'authentic', 'gritty', 'rough',
];

// Keywords that signal a fancy/clean place (score down → smaller marker)
const NEGATIVE_WORDS = [
  // Czech
  'krásn', 'nádherné', 'čisté', 'čistota', 'moderní', 'zrekonstruov',
  'romantick', 'elegantní', 'stylové', 'stylový', 'pěkné prostředí',
  'hezké prostředí', 'čisté záchody', 'čisté toalet',
  // English
  'lovely', 'beautiful', 'clean bathroom', 'clean toilet', 'spotless',
  'modern', 'renovated', 'romantic', 'elegant', 'fancy', 'stylish',
  'nice decor', 'family friendly', 'welcoming atmosphere',
];

/**
 * Compute authenticity score for a nadrazka.
 * Positive = gritty/local → bigger marker. Negative = clean/fancy → smaller.
 * Returns: 'large' | 'medium' | 'small'
 */
function getMarkerSize(nadrazka) {
  const reviews = nadrazka.reviews ?? [];
  const reviewCount = nadrazka.reviewCount ?? 0;

  let score = 0;

  // Review text signals
  for (const r of reviews) {
    const text = (r.text ?? '').toLowerCase();
    if (!text) continue;
    for (const kw of POSITIVE_WORDS) { if (text.includes(kw)) score += 1; }
    for (const kw of NEGATIVE_WORDS) { if (text.includes(kw)) score -= 1; }
  }

  // Review count bonus (more reviews = more prominent)
  if (reviewCount >= 500) score += 3;
  else if (reviewCount >= 200) score += 2;
  else if (reviewCount >= 50)  score += 1;

  if (score >= 2)  return 'large';
  if (score <= -1) return 'small';
  return 'medium';
}

const SIZES = { large: 26, medium: 18, small: 11 };

// Custom circle marker — cleaner than the default pin icon
// isSelected: currently open (bright yellow + enlarged)
// isVerified: verified pub (blue) vs unverified (amber)
// size: 'large' | 'medium' | 'small'
function createMarkerIcon(isSelected, isVerified = true, size = 'medium') {
  const bg = isSelected ? '#FBBF24' : (isVerified ? '#1E40AF' : '#F59E0B');
  const px = isSelected ? Math.round(SIZES[size] * 1.35) : SIZES[size];
  return L.divIcon({
    html: `<div style="
      width: ${px}px; height: ${px}px;
      background: ${bg};
      border-radius: 50%;
      border: ${size === 'large' ? 3 : 2}px solid white;
      box-shadow: 0 2px ${size === 'large' ? 10 : 6}px rgba(0,0,0,${size === 'large' ? 0.45 : 0.3});
      transition: transform 0.15s;
    "></div>`,
    className: '',
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
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
        const size = getMarkerSize(nadrazka);
        const marker = L.marker([nadrazka.lat, nadrazka.lng], {
          icon: createMarkerIcon(isSelected, nadrazka.verified, size),
        });
        marker.on('click', () => {
          onSelectRef.current(nadrazka);
        });
        marker.addTo(map);
        marker._locationId = nadrazka.id;
        marker._verified = nadrazka.verified;
        marker._size = size;
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
        m._size ?? 'medium',
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
