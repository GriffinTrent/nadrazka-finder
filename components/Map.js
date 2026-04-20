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
// Note: 'nádražka'/'nádržka' are NOT listed here — they get their own +3 in
// getMarkerSize() to avoid double-counting with the per-review keyword pass.
const POSITIVE_WORDS = [
  // Czech — gritty/cheap/local signals
  'nádražní hospoda', 'kouř', 'cigaret', 'graffiti',
  'levné pivo', 'levný piv', 'dobré pivo', 'skvělé pivo', 'výborné pivo',
  'levn', 'lacin', 'špinav', 'místní', 'stamgast', 'dělník',
  'starý pán', 'staříc', 'starej', 'pivko', 'pivo za', 'levný', 'lokální',
  'klobás', 'hotovk', 'hotovky', 'guláš', 'řízek', 'výpečk',
  'čekáte na vlak', 'před odjezdem', 'drobáku', 'korun za',
  'klasic', 'staromódní',
  'oldschool', 'oldskool',
  // Czech — time-stopped/authentic atmosphere
  'závan',            // "závan starých časů" — whiff of old times
  'zastavil čas',     // "kde se zastavil čas" — where time stood still
  'zastavil se čas',
  'retro',
  'z dob minulých',
  'beze změn',
  'zachoval',
  'hospůdka',         // affectionate diminutive
  'lokálk',           // "Lokálka" — Czech slang for a local/regular pub
  'vesnick',          // "vesnická hospůdka" — village pub
  'venkovsk',         // "venkovská hospoda" — rural pub
  'osazenstvo',       // "the regulars" — pub-specific vocabulary
  'bufet',            // station buffet — classic nádražka format
  // Czech — draught beer vocabulary
  'točen',            // "točené pivo", "točený" — draught beer
  'čepovan',          // "čepované pivo"
  'výčepní',          // barperson who draws beer — very pub-specific
  'výčepová',
  // Czech — price/portion signals
  'nízké ceny',
  'velké porce',
  'poctivá česká',
  'poctivé ceny',
  // Czech — pub fixtures
  'kulečník',         // billiard table — classic pub fixture
  'půllitr',
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
  // Czech — wrong-type-of-place signals
  'kebab', 'döner', 'turecký', 'vietnamsk', 'asijsk', 'pizza',
  'cappuccino', 'latte', 'flat white', 'barista', 'koktejl', 'koktejly',
  // English
  'lovely', 'beautiful', 'clean bathroom', 'clean toilet', 'spotless',
  'modern', 'renovated', 'romantic', 'elegant', 'fancy', 'stylish',
  'nice decor', 'welcoming atmosphere',
  'cocktail', 'cocktails', 'brunch', 'specialty coffee',
];

// Classic Czech pub/bar categories — split by score tier so both arrays are actually used
const TOP_PUB_CATEGORIES  = ['Hospoda', 'Hostinec', 'Pivní výčep'];
const GOOD_PUB_CATEGORIES = ['Bar', 'Sportovní bar', 'Bufetová restaurace'];

/**
 * Compute authenticity score for a nadrazka.
 * Higher = more gritty/local/cheap → bigger marker.
 * Returns: 'large' | 'medium' | 'small'
 */
function getMarkerSize(nadrazka) {
  const reviews = nadrazka.reviews ?? [];
  const reviewCount = nadrazka.reviewCount ?? 0;
  const cats = nadrazka.categories ?? [];
  const name = (nadrazka.name ?? '').toLowerCase();

  let score = 0;

  // Name bonus: "Nádražní restaurace", "Hospoda U Nádraží" etc. are strong signals
  if (name.includes('nádraž') || name.includes('nadrazi') || name.includes('nadraz')) score += 2;
  if (name.includes('hospod') || name.includes('hostinec') || name.includes('výčep') || name.includes('pivnic')) score += 1;

  // Category bonus: classic pub types get a head start
  if (cats.some(c => TOP_PUB_CATEGORIES.includes(c)))       score += 3;
  else if (cats.some(c => GOOD_PUB_CATEGORIES.includes(c))) score += 2;

  // Price level: cheaper = more authentic
  if (nadrazka.priceLevel === 1) score += 2;
  else if (nadrazka.priceLevel === 2) score += 1;
  else if (nadrazka.priceLevel >= 3) score -= 1;

  // Review text signals — capped at ±3 per review to prevent keyword stuffing
  for (const r of reviews) {
    const text = (r.text ?? '').toLowerCase();
    if (!text) continue;
    let rs = 0;
    for (const kw of POSITIVE_WORDS) { if (text.includes(kw)) rs += 1; }
    for (const kw of NEGATIVE_WORDS) { if (text.includes(kw)) rs -= 1; }
    // Strong explicit signal: reviewer calls it a nádražka (or colloquial nádržka)
    if (text.includes('nádražka') || text.includes('nádržka')) rs += 3;
    score += Math.max(-3, Math.min(3, rs));
  }

  // Review count bonus (more reviews = more prominent)
  if (reviewCount >= 500) score += 3;
  else if (reviewCount >= 200) score += 2;
  else if (reviewCount >= 50)  score += 1;

  if (score >= 5)  return 'large';
  if (score <= 2)  return 'small';
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
  const bg   = isSelected ? '#FBBF24' : (isVerified ? '#1565C0' : '#9CA3AF');
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
      width:44px;height:44px;
      display:flex;align-items:center;justify-content:center;
    "><div style="
      width: ${px}px; height: ${px}px;
      background: ${bg};
      border-radius: 50%;
      border: ${bord}px solid white;
      box-shadow: ${drop}${rings};
      transition: transform 0.15s;
    "></div></div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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
      tabIndex={0}
      style={{
        height: '100vh',
        width: '100%',
        outline: 'none',  // Leaflet handles its own focus ring
      }}
      onFocus={() => { if (mapRef.current) mapRef.current.getContainer().focus(); }}
    />
  );
}
