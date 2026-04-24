'use client';

// Pure vanilla Leaflet — no react-leaflet components.
// Loaded via dynamic(..., { ssr: false }) so top-level Leaflet import is safe.
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';

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
  'závan',
  'zastavil čas',
  'zastavil se čas',
  'retro',
  'z dob minulých',
  'beze změn',
  'zachoval',
  'hospůdka',
  'lokálk',
  'vesnick',
  'venkovsk',
  'osazenstvo',
  'bufet',
  // Czech — draught beer vocabulary
  'točen',
  'čepovan',
  'výčepní',
  'výčepová',
  // Czech — price/portion signals
  'nízké ceny',
  'velké porce',
  'poctivá česká',
  'poctivé ceny',
  // Czech — pub fixtures
  'kulečník',
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

  if (name.includes('nádraž') || name.includes('nadrazi') || name.includes('nadraz')) score += 2;
  if (name.includes('hospod') || name.includes('hostinec') || name.includes('výčep') || name.includes('pivnic')) score += 1;

  if (cats.some(c => TOP_PUB_CATEGORIES.includes(c)))       score += 3;
  else if (cats.some(c => GOOD_PUB_CATEGORIES.includes(c))) score += 2;

  if (nadrazka.priceLevel === 1) score += 2;
  else if (nadrazka.priceLevel === 2) score += 1;
  else if (nadrazka.priceLevel >= 3) score -= 1;

  for (const r of reviews) {
    const text = (r.text ?? '').toLowerCase();
    if (!text) continue;
    let rs = 0;
    for (const kw of POSITIVE_WORDS) { if (text.includes(kw)) rs += 1; }
    for (const kw of NEGATIVE_WORDS) { if (text.includes(kw)) rs -= 1; }
    if (text.includes('nádražka') || text.includes('nádržka')) rs += 3;
    score += Math.max(-3, Math.min(3, rs));
  }

  if (reviewCount >= 500) score += 3;
  else if (reviewCount >= 200) score += 2;
  else if (reviewCount >= 50)  score += 1;

  if (score >= 5)  return 'large';
  if (score <= 2)  return 'small';
  return 'medium';
}

const SIZES = { large: 26, medium: 18, small: 14 };

function createMarkerIcon(isSelected, isVerified = true, size = 'medium', isVisited = false) {
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

  const visitedBadge = isVisited
    ? `<div style="position:absolute;bottom:4px;right:4px;width:13px;height:13px;background:#37A83A;border-radius:50%;border:1.5px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;color:white;line-height:1;font-weight:700">✓</div>`
    : '';

  return L.divIcon({
    html: `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;position:relative">
      <div style="width:${px}px;height:${px}px;background:${bg};border-radius:50%;border:${bord}px solid white;box-shadow:${drop}${rings};transition:transform 0.15s;"></div>
      ${visitedBadge}
    </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createClusterIcon(cluster, darkMode) {
  const count = cluster.getChildCount();
  const bg = darkMode ? '#1E3550' : '#1565C0';
  const size = count >= 50 ? 44 : count >= 10 ? 38 : 32;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;background:${bg};color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${count >= 100 ? 11 : 12}px;font-weight:700;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)">${count}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * @param {{
 *   mapData?: any[],
 *   onLocationSelect?: (location: any) => void,
 *   selectedId?: string | null,
 *   darkMode?: boolean,
 *   visitedIds?: Set<string>,
 *   selectedRoute?: { id: string, name: string, color: string, waypoints: [number,number][] } | null,
 * }} props
 */
export default function Map({
  mapData = [],
  onLocationSelect = () => {},
  selectedId = null,
  darkMode = false,
  visitedIds = new Set(),
  selectedRoute = null,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const markersRef = useRef([]);
  const clusterGroupRef = useRef(null);
  const routeLineRef = useRef(null);
  const onSelectRef = useRef(onLocationSelect);
  const selectedIdRef = useRef(selectedId);
  const visitedIdsRef = useRef(visitedIds);
  const darkModeRef = useRef(darkMode);

  useEffect(() => { onSelectRef.current = onLocationSelect; }, [onLocationSelect]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { visitedIdsRef.current = visitedIds; }, [visitedIds]);
  useEffect(() => { darkModeRef.current = darkMode; }, [darkMode]);

  // Initialize Leaflet map once on mount.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { zoomControl: false }).setView([49.8175, 15.4730], 7);

    const tile = L.tileLayer(darkMode ? TILE_DARK : TILE_LIGHT, {
      attribution: TILE_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 55,
      disableClusteringAtZoom: 14,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => createClusterIcon(cluster, darkModeRef.current),
    });
    clusterGroup.addTo(map);

    mapRef.current = map;
    tileRef.current = tile;
    clusterGroupRef.current = clusterGroup;

    return () => {
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
      clusterGroupRef.current = null;
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
    // Refresh cluster icons for dark mode change
    clusterGroupRef.current?.refreshClusters();
  }, [darkMode]);

  // Add markers whenever mapData changes.
  useEffect(() => {
    const map = mapRef.current;
    const cg = clusterGroupRef.current;
    if (!map || !cg || !mapData.length) return;

    cg.clearLayers();
    const currentSelectedId = selectedIdRef.current;

    const markers = mapData
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((nadrazka) => {
        const isSelected = nadrazka.id === currentSelectedId;
        const isVisited = visitedIdsRef.current.has(nadrazka.id);
        const size = getMarkerSize(nadrazka);
        const marker = L.marker([nadrazka.lat, nadrazka.lng], {
          icon: createMarkerIcon(isSelected, nadrazka.verified, size, isVisited),
        });
        marker.on('click', () => { onSelectRef.current(nadrazka); });
        marker._locationId = nadrazka.id;
        marker._verified = nadrazka.verified;
        marker._size = size;
        cg.addLayer(marker);
        return marker;
      });

    markersRef.current = markers;

    return () => {
      if (clusterGroupRef.current) clusterGroupRef.current.clearLayers();
      markersRef.current = [];
    };
  }, [mapData]);

  // Update marker appearances when selection changes
  useEffect(() => {
    markersRef.current.forEach((m) => {
      const isVisited = visitedIdsRef.current.has(m._locationId);
      m.setIcon(createMarkerIcon(
        m._locationId === selectedId,
        m._verified,
        m._size ?? 'medium',
        isVisited,
      ));
    });
    clusterGroupRef.current?.refreshClusters();
  }, [selectedId]);

  // Update visited badges on markers when visitedIds changes
  useEffect(() => {
    markersRef.current.forEach((m) => {
      const isVisited = visitedIds.has(m._locationId);
      m.setIcon(createMarkerIcon(
        m._locationId === selectedIdRef.current,
        m._verified,
        m._size ?? 'medium',
        isVisited,
      ));
    });
    clusterGroupRef.current?.refreshClusters();
  }, [visitedIds]);

  // Draw/remove route polyline when selectedRoute changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLineRef.current) { routeLineRef.current.remove(); routeLineRef.current = null; }
    if (!selectedRoute) return;
    routeLineRef.current = L.polyline(selectedRoute.waypoints, {
      color: selectedRoute.color ?? '#1565C0',
      weight: 4,
      opacity: 0.75,
      dashArray: '10 6',
    }).addTo(map);
  }, [selectedRoute]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{ height: '100vh', width: '100%', outline: 'none' }}
      onFocus={() => { if (mapRef.current) mapRef.current.getContainer().focus(); }}
    />
  );
}
