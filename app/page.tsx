'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Nadrazka } from '../lib/types';
import { PubSearch, PubSearchButton } from '../components/PubSearch';

// ---------------------------------------------------------------------------
// SteamTrainLoader — SVG steam locomotive with CSS keyframe animations
// ---------------------------------------------------------------------------
function SteamTrainLoader() {
  return (
    <>
      <style>{`
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes rockLoco {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          30%  { transform: translateY(-0.8px) rotate(0.22deg); }
          70%  { transform: translateY(0.45px) rotate(-0.22deg); }
        }
        @keyframes steamRise {
          0%   { opacity: 0.75; transform: translateY(0) translateX(0) scale(1); }
          100% { opacity: 0;    transform: translateY(-50px) translateX(-5px) scale(2.6); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        /* loco-body: transform-origin in SVG viewport coords (108,112) = wheel axle centre.
           loco-wd/ws: fill-box makes each wheel spin around its own centre, not the SVG viewport centre. */
        .loco-body { animation: rockLoco 0.44s ease-in-out infinite; transform-origin: 108px 112px; }
        .loco-wd   { animation: wheelSpin 0.50s linear infinite; transform-origin: 50% 50%; transform-box: fill-box; }
        .loco-ws   { animation: wheelSpin 0.65s linear infinite; transform-origin: 50% 50%; transform-box: fill-box; }
        .loco-sp1  { animation: steamRise 1.3s ease-out infinite 0s; }
        .loco-sp2  { animation: steamRise 1.3s ease-out infinite 0.43s; }
        .loco-sp3  { animation: steamRise 1.3s ease-out infinite 0.86s; }
        @media (prefers-reduced-motion: reduce) {
          .loco-body, .loco-wd, .loco-ws,
          .loco-sp1, .loco-sp2, .loco-sp3 {
            animation: none !important;
          }
        }
      `}</style>

      {/* Wrapper — 10 px head-room above the SVG for steam puffs */}
      <div style={{ position: 'relative', width: 240, height: 140 }}>

        {/* Steam puffs — chimney opening at SVG (40, 20); SVG sits at bottom:0 of 140px wrapper
            so wrapper y = (140-130) + 20 = 30. Centre each puff on wrapper (40, 30):
              sp1 20×20 → top=20, left=30   sp2 16×16 → top=22, left=35   sp3 24×24 → top=18, left=28 */}
        <div className="loco-sp1" style={{ position:'absolute', top:20, left:30, width:20, height:20, borderRadius:'50%', background:'rgba(255,255,255,0.65)', filter:'blur(6px)' }} />
        <div className="loco-sp2" style={{ position:'absolute', top:22, left:35, width:16, height:16, borderRadius:'50%', background:'rgba(225,232,240,0.58)', filter:'blur(5px)' }} />
        <div className="loco-sp3" style={{ position:'absolute', top:18, left:28, width:24, height:24, borderRadius:'50%', background:'rgba(208,218,228,0.48)', filter:'blur(8px)' }} />

        <svg viewBox="0 0 240 130" width="240" height="130"
          style={{ position:'absolute', bottom:0, left:0 }} fill="none" xmlns="http://www.w3.org/2000/svg">

          {/* ── Track ── */}
          {[5,23,41,59,77,95,113,131,149,167,185,203,221].map(x => (
            <rect key={x} x={x - 5} y="115" width="10" height="5" rx="1" fill="#7c6647" opacity="0.48" />
          ))}
          <rect x="0" y="111" width="240" height="3" rx="1.5" fill="#5a6672" />
          <rect x="0" y="117" width="240" height="2" rx="1"   fill="#48535e" opacity="0.4" />

          {/* ── Everything rocks as one unit ── */}
          <g className="loco-body">

            {/* ━━━ TENDER ━━━ */}
            <rect x="162" y="66" width="60" height="40" rx="4"  fill="#0D4A8A" />
            <rect x="166" y="70" width="52" height="22" rx="2"  fill="#1565C0" />
            <ellipse cx="179" cy="77" rx="7.5" ry="3.5" fill="#0f1a28" />
            <ellipse cx="194" cy="75" rx="7"   ry="3"   fill="#0f1a28" />
            <ellipse cx="208" cy="78" rx="5.5" ry="2.8" fill="#0f1a28" />
            <circle cx="213" cy="70" r="4" fill="#14202e" stroke="#253548" strokeWidth="1.2" />
            <rect x="167" y="103" width="13" height="5" rx="1.5" fill="#0D4A8A" />
            <rect x="198" y="103" width="13" height="5" rx="1.5" fill="#0D4A8A" />
            <g transform="translate(174,112)" className="loco-ws">
              <circle r="9" fill="#14202e" stroke="#344256" strokeWidth="2"/>
              <line x1="0" y1="-7" x2="0" y2="7"   stroke="#B8D4EE" strokeWidth="1.2"/>
              <line x1="-7" y1="0" x2="7" y2="0"   stroke="#B8D4EE" strokeWidth="1.2"/>
              <line x1="-5" y1="-5" x2="5" y2="5"  stroke="#B8D4EE" strokeWidth="1.2"/>
              <line x1="5" y1="-5"  x2="-5" y2="5" stroke="#B8D4EE" strokeWidth="1.2"/>
              <circle r="2.2" fill="#1565C0"/>
            </g>
            <g transform="translate(204,112)" className="loco-ws">
              <circle r="9" fill="#14202e" stroke="#344256" strokeWidth="2"/>
              <line x1="0" y1="-7" x2="0" y2="7"   stroke="#B8D4EE" strokeWidth="1.2"/>
              <line x1="-7" y1="0" x2="7" y2="0"   stroke="#B8D4EE" strokeWidth="1.2"/>
              <line x1="-5" y1="-5" x2="5" y2="5"  stroke="#B8D4EE" strokeWidth="1.2"/>
              <line x1="5" y1="-5"  x2="-5" y2="5" stroke="#B8D4EE" strokeWidth="1.2"/>
              <circle r="2.2" fill="#1565C0"/>
            </g>
            <rect x="156" y="91" width="9" height="4" rx="2" fill="#4a5e72" />

            {/* ━━━ CAB ━━━ */}
            <rect x="136" y="46" width="28" height="60" rx="3"  fill="#0D4A8A" />
            <rect x="132" y="40" width="36" height="9"  rx="4"  fill="#0f172a" />
            <rect x="149" y="53" width="11" height="13" rx="2.5" fill="#16304a" stroke="#3a5570" strokeWidth="1.5"/>
            <line x1="154" y1="53" x2="154" y2="66" stroke="#3a5570" strokeWidth="1"/>
            <rect x="140" y="54" width="8"  height="10" rx="2"   fill="#14283e" stroke="#2d4260" strokeWidth="1.2"/>
            <rect x="140" y="74" width="14" height="22" rx="2"   fill="#1e3248" />
            <ellipse cx="147" cy="83" rx="5" ry="5.5" fill="#0f172a" />
            <ellipse cx="147" cy="87" rx="3.5" ry="2.5" fill="#ea580c" opacity="0.18" />

            {/* ━━━ BOILER BARREL ━━━ */}
            <rect x="50" y="59" width="90" height="37" fill="#1565C0" />
            <rect x="50" y="59" width="90" height="7"  fill="#2196F3" />
            <rect x="50" y="89" width="90" height="7"  fill="#0A3060" />
            <rect x="48" y="59" width="4"  height="37" fill="#0D4A8A" />
            {[68,88,108,128].map(x => (
              <rect key={x} x={x} y="59" width="2.5" height="37" fill="#2e4862" />
            ))}

            {/* ━━━ SAND DOME (forward) ━━━ */}
            <rect x="72" y="58" width="12" height="4" rx="0" fill="#0D4A8A" />
            <rect x="73" y="50" width="10" height="10" rx="5" fill="#0D4A8A" />
            <ellipse cx="78" cy="50" rx="6" ry="2.5" fill="#0f1e30" />

            {/* ━━━ STEAM DOME ━━━ */}
            <rect x="88" y="58" width="24" height="4"  rx="0" fill="#0D4A8A" />
            <rect x="90" y="44" width="20" height="16" rx="7" fill="#0D4A8A" />
            <ellipse cx="100" cy="44" rx="11" ry="4"  fill="#0f1e30" />
            <rect x="98" y="36" width="4"  height="10" rx="2" fill="#0D4A8A" />
            <rect x="94" y="34" width="12" height="4"  rx="2" fill="#344256" />

            {/* ━━━ CHIMNEY — sits on the smoke box, centred at x=40 ━━━ */}
            <rect x="31" y="58" width="18" height="4"  fill="#0D4A8A" />
            <rect x="33" y="26" width="14" height="34" rx="2"   fill="#0f1e30" />
            <rect x="27" y="20" width="26" height="9"  rx="4.5" fill="#0d1a28" />
            <ellipse cx="40" cy="20" rx="10" ry="3.5"  fill="#08111c" />

            {/* ━━━ SMOKE BOX ━━━ */}
            {/* Drum section (front of boiler) */}
            <rect x="28" y="61" width="22" height="35" fill="#0D4A8A" />
            {/* Front face — narrower to suggest depth */}
            <rect x="14" y="63" width="16" height="31" rx="1" fill="#14202e" />
            {/* Circular door motif */}
            <ellipse cx="25" cy="78" rx="8.5" ry="14" fill="#111c2a" stroke="#2a3c52" strokeWidth="1.5" />
            <ellipse cx="25" cy="78" rx="5.5" ry="9"   fill="#0c1520" />
            <circle cx="25" cy="64.5" r="1.8" fill="#2e4260" />
            <circle cx="25" cy="91.5" r="1.8" fill="#2e4260" />
            {/* Smoke box bottom saddle */}
            <rect x="14" y="94" width="36" height="4" rx="1" fill="#0D4A8A" />

            {/* ━━━ HEADLAMP ━━━ */}
            <rect x="7"  y="69" width="14" height="10" rx="2.5" fill="#14202e" />
            <ellipse cx="13" cy="74" rx="5.5" ry="4.5" fill="#fbbf24" opacity="0.52" />
            <ellipse cx="11" cy="73" rx="3"   ry="2.5" fill="#fde68a" opacity="0.28" />

            {/* ━━━ OUTSIDE CYLINDER ━━━ */}
            <rect x="14" y="89" width="22" height="12" rx="3" fill="#14202e" />
            <rect x="16" y="87" width="18" height="5"  rx="2" fill="#0D4A8A" />
            <rect x="14" y="90" width="4"  height="4"  rx="1" fill="#0c1520" />

            {/* ━━━ DRIVE WHEELS — drawn before running plate so plate overlaps wheel tops ━━━ */}
            {/* Pony (leading) wheel */}
            <g transform="translate(44,112)" className="loco-ws">
              <circle r="10" fill="#14202e" stroke="#253548" strokeWidth="2.2"/>
              <line x1="0"    y1="-7.5" x2="0"    y2="7.5"  stroke="#B8D4EE" strokeWidth="1.4"/>
              <line x1="-7.5" y1="0"    x2="7.5"  y2="0"    stroke="#B8D4EE" strokeWidth="1.4"/>
              <line x1="-5.3" y1="-5.3" x2="5.3"  y2="5.3"  stroke="#B8D4EE" strokeWidth="1.4"/>
              <line x1="5.3"  y1="-5.3" x2="-5.3" y2="5.3"  stroke="#B8D4EE" strokeWidth="1.4"/>
              <circle r="2.5" fill="#1f3248" stroke="#344256" strokeWidth="1"/>
            </g>
            {/* Drive wheel 1 */}
            <g transform="translate(78,112)" className="loco-wd">
              <circle r="14" fill="#14202e" stroke="#253e58" strokeWidth="2.5"/>
              <line x1="0"    y1="-11"  x2="0"    y2="11"  stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="-11"  y1="0"    x2="11"   y2="0"   stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="-7.8" y1="-7.8" x2="7.8"  y2="7.8" stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="7.8"  y1="-7.8" x2="-7.8" y2="7.8" stroke="#B8D4EE" strokeWidth="1.8"/>
              <circle r="3.5" fill="#1f3248" stroke="#344256" strokeWidth="1.2"/>
              <circle cx="0" cy="-10" r="2.5" fill="#B8D4EE"/>
            </g>
            {/* Drive wheel 2 */}
            <g transform="translate(110,112)" className="loco-wd">
              <circle r="14" fill="#14202e" stroke="#253e58" strokeWidth="2.5"/>
              <line x1="0"    y1="-11"  x2="0"    y2="11"  stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="-11"  y1="0"    x2="11"   y2="0"   stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="-7.8" y1="-7.8" x2="7.8"  y2="7.8" stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="7.8"  y1="-7.8" x2="-7.8" y2="7.8" stroke="#B8D4EE" strokeWidth="1.8"/>
              <circle r="3.5" fill="#1f3248" stroke="#344256" strokeWidth="1.2"/>
              <circle cx="0" cy="-10" r="2.5" fill="#B8D4EE"/>
            </g>
            {/* Drive wheel 3 */}
            <g transform="translate(140,112)" className="loco-wd">
              <circle r="14" fill="#14202e" stroke="#253e58" strokeWidth="2.5"/>
              <line x1="0"    y1="-11"  x2="0"    y2="11"  stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="-11"  y1="0"    x2="11"   y2="0"   stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="-7.8" y1="-7.8" x2="7.8"  y2="7.8" stroke="#B8D4EE" strokeWidth="1.8"/>
              <line x1="7.8"  y1="-7.8" x2="-7.8" y2="7.8" stroke="#B8D4EE" strokeWidth="1.8"/>
              <circle r="3.5" fill="#1f3248" stroke="#344256" strokeWidth="1.2"/>
              <circle cx="0" cy="-10" r="2.5" fill="#B8D4EE"/>
            </g>

            {/* Connecting rods — below running plate level */}
            <rect x="78"  y="103" width="64" height="4" rx="2"   fill="#5A7A9A" />
            <rect x="34"  y="104" width="46" height="3" rx="1.5" fill="#5A7A9A" />

            {/* ━━━ RUNNING PLATE — drawn on top of wheel tops ━━━ */}
            <rect x="14" y="97" width="136" height="5" rx="2" fill="#0D4A8A" />
            {/* Splasher arches over each drive wheel */}
            <path d="M64  97 Q78  82 92  97" fill="none" stroke="#2e4862" strokeWidth="2.2"/>
            <path d="M96  97 Q110 82 124 97" fill="none" stroke="#2e4862" strokeWidth="2.2"/>
            <path d="M126 97 Q140 82 154 97" fill="none" stroke="#2e4862" strokeWidth="2.2"/>

            {/* ━━━ PILOT / COW-CATCHER ━━━ */}
            <path d="M14 99 L1 112 L14 112 Z" fill="#1f3248" />
            <line x1="4"  y1="112" x2="14" y2="100" stroke="#344256" strokeWidth="1.5"/>
            <line x1="10" y1="112" x2="14" y2="104" stroke="#344256" strokeWidth="1.5"/>
            <rect x="6" y="97" width="9" height="4" rx="1.5" fill="#0D4A8A" />

          </g>{/* end .loco-body */}
        </svg>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Full-screen wrapper — soft Czech countryside backdrop
// ---------------------------------------------------------------------------
function FullScreenLoader() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100%',
      background: 'linear-gradient(180deg, #C8DDF0 0%, #D8E8EC 48%, #E4DED2 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Distant rolling hills */}
      <svg
        style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'38%', opacity:0.26 }}
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path d="M0 155 Q80 128 170 148 Q260 112 360 136 Q440 108 530 130 Q620 102 710 126 Q800 104 900 122 Q950 112 1000 118 L1000 200 L0 200 Z" fill="#7A9E8A" />
        <path d="M0 178 Q130 160 270 174 Q400 150 530 168 Q660 148 780 165 Q890 152 1000 162 L1000 200 L0 200 Z" fill="#9AB8A8" opacity="0.75" />
      </svg>

      <SteamTrainLoader />

      <p style={{
        marginTop: 22,
        fontSize: 12,
        fontWeight: 600,
        color: '#1565C0',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        Loading n&#225;dražky&hellip;
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dynamic imports
// ---------------------------------------------------------------------------
const BottomSheet = dynamic(() => import('../components/BottomSheet'), { ssr: false });

const Map = dynamic(
  () => import('../components/Map'),
  {
    ssr: false,
    loading: () => <FullScreenLoader />,
  }
);

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// HomeContent
// ---------------------------------------------------------------------------
function HomeContent() {
  const searchParams = useSearchParams();

  const [mapData, setMapData] = useState<Nadrazka[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Nadrazka | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const restoredRef = useRef(false);

  // Initialise from stored preference, fall back to system preference
  useEffect(() => {
    const stored = localStorage.getItem('nadrazka-dark-mode');
    if (stored !== null) {
      setDarkMode(stored === 'true');
    } else {
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // First-visit onboarding hint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('nadrazka-hint-shown')) return;
    const t = setTimeout(() => {
      setShowHint(true);
      setTimeout(() => {
        setShowHint(false);
        localStorage.setItem('nadrazka-hint-shown', '1');
      }, 4000);
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const handleLocationSelect = useCallback((loc: Nadrazka) => {
    setSelectedLocation(loc);
    if (loc.placeId) {
      window.history.replaceState(null, '', `?pub=${loc.placeId}`);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSelectedLocation(null);
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const fetchMapData = useCallback(async () => {
    try {
      const response = await fetch('/data/nadrazky.json');
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`);
      }
      const data = await response.json();
      setMapData(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load map data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMapData(); }, [fetchMapData]);

  // Restore selected location from URL query param on first load
  useEffect(() => {
    if (restoredRef.current || loading || mapData.length === 0) return;
    const pubId = searchParams?.get('pub');
    if (pubId) {
      const match = mapData.find((loc) => loc.placeId === pubId);
      if (match) setSelectedLocation(match);
    }
    restoredRef.current = true;
  }, [mapData, loading, searchParams]);

  const dm = darkMode;
  const cardBg = dm ? '#1e293b' : '#ffffff';
  const cardText = dm ? '#f1f5f9' : '#1e293b';
  const cardMuted = dm ? '#64748b' : '#94a3b8';
  const cardSub = dm ? '#94a3b8' : '#64748b';

  return (
    <main className="relative h-screen overflow-hidden">
      {error ? (
        <div className="flex flex-col justify-center items-center h-screen bg-slate-50">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Failed to load map</h2>
            <p className="text-sm text-slate-500 mb-6">{error}</p>
            <button
              onClick={() => { setError(null); setLoading(true); fetchMapData(); }}
              className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      ) : loading ? (
        <FullScreenLoader />
      ) : (
        <>
          <Map
            mapData={mapData}
            onLocationSelect={handleLocationSelect}
            selectedId={selectedLocation?.id ?? null}
            darkMode={darkMode}
          />

          <BottomSheet location={selectedLocation} onClose={handleClose} darkMode={darkMode} />

          {/* Search panel */}
          {showSearch && (
            <PubSearch
              pubs={mapData}
              onSelect={(pub) => { setSelectedLocation(pub); setShowSearch(false); }}
              onClose={() => setShowSearch(false)}
              darkMode={darkMode}
            />
          )}

          {/* Search trigger button — bottom left, above zoom controls */}
          <PubSearchButton onClick={() => setShowSearch(true)} darkMode={darkMode} />

          {/* Header panel — top left */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 900, background: dm ? '#0D1F33' : '#1565C0', borderRadius: 12, boxShadow: dm ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 16px rgba(21,101,192,0.35)', padding: '12px 18px', minWidth: 190 }}>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: '#ffffff', lineHeight: 1.2, margin: 0 }}>
              🚉 N&#225;dražka Finder
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: '5px 0 0', fontWeight: 600 }}>
              {mapData.length} <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>locations</span>
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>
              Czech train station pubs
            </p>
          </div>

          {/* Dark mode toggle — top right */}
          <button
            onClick={() => setDarkMode(d => {
              const next = !d;
              localStorage.setItem('nadrazka-dark-mode', String(next));
              return next;
            })}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 900,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cardBg,
              border: 'none',
              borderRadius: '50%',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              color: dm ? '#f1f5f9' : '#1565C0',
              transition: 'background 0.2s',
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* First-visit onboarding hint */}
          {showHint && (
            <div style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'rgba(15,23,42,0.85)', color: '#f1f5f9',
              padding: '10px 20px', borderRadius: 999, fontSize: 13, fontWeight: 500,
              pointerEvents: 'none', whiteSpace: 'nowrap',
              animation: 'fadeInUp 0.3s ease',
            }}>
              Tap any marker to explore a pub
            </div>
          )}

          {/* Map legend — bottom right, above zoom controls */}
          <div style={{
            position: 'absolute', bottom: 90, right: 16, zIndex: 900,
            background: cardBg,
            borderRadius: 10,
            padding: '8px 12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {/* Color = verification status */}
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: dm ? '#94a3b8' : '#64748b' }}>Status</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, background: '#1565C0', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Verified pub</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, background: '#9CA3AF', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Unverified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, background: '#FBBF24', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Selected</span>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: dm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', margin: '2px 0' }} />

            {/* Size = quality tier */}
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: dm ? '#94a3b8' : '#64748b' }}>Quality</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 22, height: 22, background: '#1565C0', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Legendary</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 15, height: 15, background: '#1565C0', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0, marginLeft: 3.5 }} />
              <span style={{ fontSize: 11, color: cardText }}>Good</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 10, height: 10, background: '#1565C0', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0, marginLeft: 6 }} />
              <span style={{ fontSize: 11, color: cardText }}>Serviceable</span>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page root
// ---------------------------------------------------------------------------
export default function Home() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <HomeContent />
    </Suspense>
  );
}
