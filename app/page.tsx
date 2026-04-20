'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Nadrazka } from '../lib/types';

const BottomSheet = dynamic(() => import('../components/BottomSheet'), { ssr: false });

const Map = dynamic(
  () => import('../components/Map'),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading map…</p>
        </div>
      </div>
    )
  }
);

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
        <div className="flex justify-center items-center h-screen bg-slate-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">Loading map…</p>
          </div>
        </div>
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading map…</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
