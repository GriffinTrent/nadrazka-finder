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
// Note: 'nádražka' is NOT listed here — it has its own dedicated +2 in getMarkerSize()
// to avoid double-counting. 'graffiti' appears only once (removed duplicate).
const POSITIVE_WORDS = [
  // Czech — gritty/cheap/local signals
  'nádražní hospoda', 'kouř', 'cigaret', 'graffiti',
  'levné pivo', 'levný piv', 'dobré pivo', 'skvělé pivo', 'výborné pivo',
  'levn', 'lacin', 'špinav', 'místní', 'stamgast', 'dělník',
  'starý pán', 'staříc', 'starej', 'pivko', 'pivo za', 'levný', 'lokální',
  'klobás', 'hotovk', 'guláš', 'řízek',
  'čekáte na vlak', 'před odjezdem', 'drobáku', 'korun za',
  'klasic', 'staromódní',                  // classic/old-fashioned Czech signals
  'oldschool', 'oldskool',                 // borrowed English — common in Czech reviews too
  // English
  'smoking', 'smoke', 'cheap beer', 'good beer',
  'great beer', 'locals', 'local', 'dirty', 'workers', 'old men', 'regulars',
  'authentic', 'gritty', 'rough', 'cheap', 'classic',
  'old school', 'old-school',
];

// Keywords that signal a fancy/clean place (score down → smaller marker)
const NEGATIVE_WORDS = [
  // Czech
  'nádherné', 'čistota', 'moderní', 'zrekonstruov',
  'romantick', 'elegantní', 'stylové', 'stylový',
  'čisté záchody', 'čisté toalet', 'wellness', 'wine bar', 'vinotéka',
  // English
  'lovely', 'beautiful', 'clean bathroom', 'clean toilet', 'spotless',
  'modern', 'renovated', 'romantic', 'elegant', 'fancy', 'stylish',
  'nice decor', 'welcoming atmosphere',
];

// Classic Czech pub/bar categories — split by score tier so both arrays are actually used
const TOP_PUB_CATEGORIES  = ['Hospoda', 'Hostinec', 'Pivní výčep'];
const GOOD_PUB_CATEGORIES = ['Bar', 'Sportovní bar'];

/**
 * Compute authenticity score for a nadrazka.
 * Higher = more gritty/local/cheap → bigger marker.
 * Returns: 'large' | 'medium' | 'small'
 */
function getMarkerSize(nadrazka) {
  const reviews = nadrazka.reviews ?? [];
  const reviewCount = nadrazka.reviewCount ?? 0;
  const cats = nadrazka.categories ?? [];

  let score = 0;

  // Category bonus: classic pub types get a head start
  if (cats.some(c => TOP_PUB_CATEGORIES.includes(c)))       score += 3;
  else if (cats.some(c => GOOD_PUB_CATEGORIES.includes(c))) score += 2;

  // Price level: cheaper = more authentic
  if (nadrazka.priceLevel === 1) score += 2;
  else if (nadrazka.priceLevel === 2) score += 1;
  else if (nadrazka.priceLevel >= 3) score -= 1;

  // Review text signals
  for (const r of reviews) {
    const text = (r.text ?? '').toLowerCase();
    if (!text) continue;
    for (const kw of POSITIVE_WORDS) { if (text.includes(kw)) score += 1; }
    for (const kw of NEGATIVE_WORDS) { if (text.includes(kw)) score -= 1; }
    // Strong signal: reviewer explicitly calls it a nádražka
    if (text.includes('nádražka')) score += 2;
  }

  // Review count bonus (more reviews = more prominent)
  if (reviewCount >= 500) score += 3;
  else if (reviewCount >= 200) score += 2;
  else if (reviewCount >= 50)  score += 1;

  if (score >= 5)  return 'large';
  if (score <= 1)  return 'small';
  return 'medium';
}

const SIZES = { large: 26, medium: 18, small: 14 };

// Quality tier ring patterns (inset box-shadows, applied when not selected):
//   large  → solid white border, no rings  (best pubs)
//   medium → white border + 1 black inset ring
//   small  → white border + 2 black inset rings (separated by a white gap)
//
// Shadow list is front-to-back, so: front=1px black, mid=2px white, back=3px black
// produces three concentric bands: black | white | black visible from border edge inward.
function createMarkerIcon(isSelected, isVerified = true, size = 'medium') {
  const bg   = isSelected ? '#FBBF24' : (isVerified ? '#1E40AF' : '#F59E0B');
  const px   = isSelected ? Math.round(SIZES[size] * 1.35) : SIZES[size];
  const bord = size === 'large' ? 3 : 2;
  const drop = `0 2px ${size === 'large' ? 10 : 6}px rgba(0,0,0,${size === 'large' ? 0.45 : 0.3})`;

  let rings = '';
  if (!isSelected) {
    if (size === 'medium') {
      rings = `, inset 0 0 0 1.5px rgba(0,0,0,0.75)`;
    } else if (size === 'small') {
      rings = `, inset 0 0 0 1px rgba(0,0,0,0.8), inset 0 0 0 2px rgba(255,255,255,0.95), inset 0 0 0 3px rgba(0,0,0,0.8)`;
    }
  }

  return L.divIcon({
    html: `<div style="
      width: ${px}px; height: ${px}px;
      background: ${bg};
      border-radius: 50%;
      border: ${bord}px solid white;
      box-shadow: ${drop}${rings};
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
