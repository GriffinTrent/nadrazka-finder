'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Nadrazka } from '../lib/types';

// ---------------------------------------------------------------------------
// SteamTrainLoader — inline SVG locomotive with CSS keyframe animations
// ---------------------------------------------------------------------------
function SteamTrainLoader() {
  return (
    <>
      <style>{`
        @keyframes wheelSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes driverSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rockLoco {
          0%   { transform: translateX(0px) rotate(0deg); }
          25%  { transform: translateX(1.5px) rotate(0.4deg); }
          75%  { transform: translateX(-1.5px) rotate(-0.4deg); }
          100% { transform: translateX(0px) rotate(0deg); }
        }
        @keyframes steamPuff1 {
          0%   { transform: translateY(0px) translateX(0px) scale(1);   opacity: 0.75; }
          100% { transform: translateY(-38px) translateX(-6px) scale(1.9); opacity: 0; }
        }
        @keyframes steamPuff2 {
          0%   { transform: translateY(0px) translateX(0px) scale(0.8); opacity: 0.6; }
          100% { transform: translateY(-50px) translateX(8px) scale(2.2); opacity: 0; }
        }
        @keyframes steamPuff3 {
          0%   { transform: translateY(0px) translateX(0px) scale(1.1); opacity: 0.5; }
          100% { transform: translateY(-42px) translateX(-10px) scale(2.5); opacity: 0; }
        }
        .loco-rock {
          animation: rockLoco 0.38s ease-in-out infinite;
          transform-origin: center bottom;
        }
        .wheel-main {
          animation: wheelSpin 0.55s linear infinite;
        }
        .wheel-small {
          animation: wheelSpin 0.55s linear infinite;
        }
        .steam-1 {
          animation: steamPuff1 1.1s ease-out infinite;
          animation-delay: 0s;
        }
        .steam-2 {
          animation: steamPuff2 1.1s ease-out infinite;
          animation-delay: 0.37s;
        }
        .steam-3 {
          animation: steamPuff3 1.1s ease-out infinite;
          animation-delay: 0.72s;
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
      }}>
        {/* Steam puffs sit above the SVG — positioned relative to wrapper */}
        <div style={{ position: 'relative', width: 220, height: 130 }}>
          {/* Steam cloud 1 */}
          <div className="steam-1" style={{
            position: 'absolute',
            top: 6,
            left: 44,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#9ca3af',
            filter: 'blur(4px)',
          }} />
          {/* Steam cloud 2 */}
          <div className="steam-2" style={{
            position: 'absolute',
            top: 10,
            left: 50,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#9ca3af',
            filter: 'blur(3px)',
          }} />
          {/* Steam cloud 3 */}
          <div className="steam-3" style={{
            position: 'absolute',
            top: 4,
            left: 40,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#6b7280',
            filter: 'blur(5px)',
          }} />

          {/* Locomotive SVG */}
          <svg
            width="220"
            height="110"
            viewBox="0 0 220 110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: 'absolute', bottom: 0, left: 0 }}
          >
            {/* ── Ground rail line ── */}
            <rect x="0" y="101" width="220" height="3" rx="1.5" fill="#374151" />

            {/* ── Rocking locomotive group ── */}
            <g className="loco-rock">

              {/* Tender (coal car) — rightmost */}
              <rect x="148" y="58" width="52" height="34" rx="4" fill="#1f2937" />
              <rect x="152" y="62" width="44" height="24" rx="2" fill="#374151" />
              {/* Tender coal lumps */}
              <ellipse cx="165" cy="68" rx="7" ry="4" fill="#111827" />
              <ellipse cx="178" cy="65" rx="6" ry="3.5" fill="#111827" />
              <ellipse cx="188" cy="69" rx="5" ry="3" fill="#111827" />
              {/* Tender wheels */}
              <g transform="translate(162, 95)" className="wheel-small">
                <circle cx="0" cy="0" r="8" fill="#1f2937" stroke="#6b7280" strokeWidth="2" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#6b7280" strokeWidth="1.2" />
                <line x1="-6" y1="0" x2="6" y2="0" stroke="#6b7280" strokeWidth="1.2" />
                <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" stroke="#6b7280" strokeWidth="1.2" />
                <line x1="4.2" y1="-4.2" x2="-4.2" y2="4.2" stroke="#6b7280" strokeWidth="1.2" />
                <circle cx="0" cy="0" r="2.5" fill="#4b5563" />
              </g>
              <g transform="translate(185, 95)" className="wheel-small">
                <circle cx="0" cy="0" r="8" fill="#1f2937" stroke="#6b7280" strokeWidth="2" />
                <line x1="0" y1="-6" x2="0" y2="6" stroke="#6b7280" strokeWidth="1.2" />
                <line x1="-6" y1="0" x2="6" y2="0" stroke="#6b7280" strokeWidth="1.2" />
                <line x1="-4.2" y1="-4.2" x2="4.2" y2="4.2" stroke="#6b7280" strokeWidth="1.2" />
                <line x1="4.2" y1="-4.2" x2="-4.2" y2="4.2" stroke="#6b7280" strokeWidth="1.2" />
                <circle cx="0" cy="0" r="2.5" fill="#4b5563" />
              </g>

              {/* Coupling between tender and boiler */}
              <rect x="143" y="82" width="8" height="4" rx="1" fill="#6b7280" />

              {/* ── Boiler body ── */}
              <rect x="52" y="52" width="96" height="40" rx="6" fill="#374151" />

              {/* Boiler barrel taper at front */}
              <path d="M52 55 Q38 55 32 70 Q38 85 52 92" fill="#374151" />

              {/* Boiler band rings */}
              <rect x="68" y="52" width="3" height="40" rx="1" fill="#4b5563" />
              <rect x="90" y="52" width="3" height="40" rx="1" fill="#4b5563" />
              <rect x="112" y="52" width="3" height="40" rx="1" fill="#4b5563" />

              {/* Steam dome (top of boiler) */}
              <ellipse cx="88" cy="52" rx="12" ry="6" fill="#1f2937" />
              <rect x="76" y="46" width="24" height="10" rx="5" fill="#1f2937" />
              {/* Safety valve nub */}
              <rect x="86" y="40" width="4" height="8" rx="2" fill="#4b5563" />

              {/* Smokestack */}
              <rect x="42" y="28" width="14" height="28" rx="3" fill="#1f2937" />
              {/* Stack flare at top */}
              <rect x="38" y="24" width="22" height="7" rx="3" fill="#111827" />

              {/* Cab / footplate */}
              <rect x="130" y="38" width="20" height="54" rx="4" fill="#1f2937" />
              {/* Cab roof overhang */}
              <rect x="126" y="34" width="28" height="6" rx="2" fill="#111827" />
              {/* Cab window */}
              <rect x="134" y="44" width="10" height="10" rx="2" fill="#374151" stroke="#6b7280" strokeWidth="1.5" />
              {/* Cab door panel */}
              <rect x="133" y="58" width="13" height="20" rx="2" fill="#374151" />

              {/* Running plate / footboard */}
              <rect x="28" y="88" width="124" height="5" rx="2" fill="#4b5563" />

              {/* Pilot / cow-catcher */}
              <path d="M28 90 L14 98 L28 98 Z" fill="#374151" />
              <line x1="18" y1="98" x2="28" y2="90" stroke="#6b7280" strokeWidth="1.2" />
              <line x1="23" y1="98" x2="28" y2="92" stroke="#6b7280" strokeWidth="1.2" />

              {/* Headlamp */}
              <rect x="28" y="70" width="10" height="8" rx="2" fill="#1f2937" />
              <ellipse cx="33" cy="74" rx="4" ry="3.5" fill="#fbbf24" opacity="0.7" />

              {/* ── Main drive wheels (large) ── */}
              {/* Front drive wheel */}
              <g transform="translate(68, 95)" className="wheel-main">
                <circle cx="0" cy="0" r="14" fill="#1f2937" stroke="#4b5563" strokeWidth="2.5" />
                <line x1="0" y1="-11" x2="0" y2="11" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="-11" y1="0" x2="11" y2="0" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="-7.8" y1="-7.8" x2="7.8" y2="7.8" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="7.8" y1="-7.8" x2="-7.8" y2="7.8" stroke="#6b7280" strokeWidth="1.8" />
                <circle cx="0" cy="0" r="3.5" fill="#374151" stroke="#6b7280" strokeWidth="1" />
                {/* Crank pin */}
                <circle cx="0" cy="-9" r="2" fill="#9ca3af" />
              </g>

              {/* Centre drive wheel */}
              <g transform="translate(98, 95)" className="wheel-main">
                <circle cx="0" cy="0" r="14" fill="#1f2937" stroke="#4b5563" strokeWidth="2.5" />
                <line x1="0" y1="-11" x2="0" y2="11" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="-11" y1="0" x2="11" y2="0" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="-7.8" y1="-7.8" x2="7.8" y2="7.8" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="7.8" y1="-7.8" x2="-7.8" y2="7.8" stroke="#6b7280" strokeWidth="1.8" />
                <circle cx="0" cy="0" r="3.5" fill="#374151" stroke="#6b7280" strokeWidth="1" />
                <circle cx="0" cy="-9" r="2" fill="#9ca3af" />
              </g>

              {/* Rear drive wheel */}
              <g transform="translate(128, 95)" className="wheel-main">
                <circle cx="0" cy="0" r="14" fill="#1f2937" stroke="#4b5563" strokeWidth="2.5" />
                <line x1="0" y1="-11" x2="0" y2="11" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="-11" y1="0" x2="11" y2="0" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="-7.8" y1="-7.8" x2="7.8" y2="7.8" stroke="#6b7280" strokeWidth="1.8" />
                <line x1="7.8" y1="-7.8" x2="-7.8" y2="7.8" stroke="#6b7280" strokeWidth="1.8" />
                <circle cx="0" cy="0" r="3.5" fill="#374151" stroke="#6b7280" strokeWidth="1" />
                <circle cx="0" cy="-9" r="2" fill="#9ca3af" />
              </g>

              {/* Leading (pony) wheel — smaller, at front */}
              <g transform="translate(44, 95)" className="wheel-small">
                <circle cx="0" cy="0" r="9" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />
                <line x1="0" y1="-7" x2="0" y2="7" stroke="#6b7280" strokeWidth="1.4" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="#6b7280" strokeWidth="1.4" />
                <line x1="-5" y1="-5" x2="5" y2="5" stroke="#6b7280" strokeWidth="1.4" />
                <line x1="5" y1="-5" x2="-5" y2="5" stroke="#6b7280" strokeWidth="1.4" />
                <circle cx="0" cy="0" r="2.2" fill="#374151" stroke="#6b7280" strokeWidth="1" />
              </g>

              {/* Connecting rod between drive wheels */}
              <rect x="68" y="85" width="62" height="4" rx="2" fill="#6b7280" />
              {/* Piston rod from front wheel to cylinder */}
              <rect x="32" y="86" width="38" height="3" rx="1.5" fill="#6b7280" />
              {/* Cylinder */}
              <rect x="22" y="80" width="18" height="10" rx="3" fill="#1f2937" />

            </g>{/* end .loco-rock */}
          </svg>
        </div>

        <p style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#6b7280',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          Loading n&#225;dražky&#8230;
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Full-screen wrapper that centres the loader
// ---------------------------------------------------------------------------
function FullScreenLoader() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
      background: '#f8fafc',
    }}>
      <SteamTrainLoader />
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

  const restoredRef = useRef(false);

  // Initialise from system preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mq.matches);
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

          {/* Header panel — top left */}
          <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 900, background: cardBg, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.12)', padding: '14px 18px', minWidth: 200 }}>
            {/* Czech flag stripe accent */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 10, borderRadius: 999, overflow: 'hidden', height: 4, width: 40 }}>
              <div style={{ flex: 1, background: '#D7141A' }} />
              <div style={{ flex: 1, background: '#FFFFFF', border: '0.5px solid #e2e8f0' }} />
              <div style={{ flex: 1, background: '#11457E' }} />
            </div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: cardText, lineHeight: 1.2, margin: 0 }}>
              N&#225;dražka Finder
            </h1>
            <p style={{ fontSize: 12, color: '#3b82f6', margin: '3px 0 0', fontWeight: 600 }}>
              {mapData.length} <span style={{ color: cardSub, fontWeight: 400 }}>locations</span>
            </p>
            <p style={{ fontSize: 11, color: cardMuted, margin: '2px 0 0' }}>
              Czech train station pubs
            </p>
          </div>

          {/* Dark mode toggle — top right */}
          <button
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 900,
              width: 40, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: cardBg,
              border: 'none',
              borderRadius: '50%',
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              cursor: 'pointer',
              color: dm ? '#f1f5f9' : '#475569',
              transition: 'background 0.2s',
            }}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Map legend — bottom right, above zoom controls */}
          <div style={{
            position: 'absolute', bottom: 90, right: 16, zIndex: 900,
            background: cardBg,
            borderRadius: 10,
            padding: '8px 12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: cardMuted }}>Map Key</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, background: '#1E40AF', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Verified pub</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, background: '#F59E0B', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Unverified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 14, height: 14, background: '#FBBF24', borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: cardText }}>Selected</span>
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
