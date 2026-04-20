'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  KeyboardEvent,
} from 'react';
import type { Nadrazka } from '../lib/types';

// ─── Theme tokens (same pattern as BottomSheet) ─────────────────────────────

function useTheme(darkMode: boolean) {
  return darkMode
    ? {
        panel: '#1e293b',
        bg2: '#0f172a',
        text: '#f1f5f9',
        text2: '#94a3b8',
        text3: '#64748b',
        border: '#334155',
        inputBg: '#0f172a',
        inputBorder: '#334155',
        inputFocus: '#3b82f6',
        itemHoverBg: '#0f172a',
        itemActiveBg: '#1e3a5f',
        closeBg: '#334155',
        closeText: '#94a3b8',
        toggleTrackOff: '#334155',
        toggleTrackOn: '#1d4ed8',
        toggleThumb: '#f1f5f9',
        starColor: '#f59e0b',
        badgeBlueBg: '#1e3a5f',
        badgeBlueText: '#60a5fa',
        badgeAmberBg: '#3d2c00',
        badgeAmberText: '#fbbf24',
        scrollbar: '#334155',
        btnBg: '#1e3a5f',
        btnText: '#93c5fd',
        shadow: '2px 0 32px rgba(0,0,0,0.5)',
      }
    : {
        panel: '#ffffff',
        bg2: '#f8fafc',
        text: '#0f172a',
        text2: '#475569',
        text3: '#94a3b8',
        border: '#e2e8f0',
        inputBg: '#f8fafc',
        inputBorder: '#e2e8f0',
        inputFocus: '#3b82f6',
        itemHoverBg: '#f8fafc',
        itemActiveBg: '#eff6ff',
        closeBg: '#f1f5f9',
        closeText: '#64748b',
        toggleTrackOff: '#e2e8f0',
        toggleTrackOn: '#2563eb',
        toggleThumb: '#ffffff',
        starColor: '#f59e0b',
        badgeBlueBg: '#eff6ff',
        badgeBlueText: '#1d4ed8',
        badgeAmberBg: '#fffbeb',
        badgeAmberText: '#d97706',
        scrollbar: '#e2e8f0',
        btnBg: '#1d4ed8',
        btnText: '#ffffff',
        shadow: '2px 0 32px rgba(15,23,42,0.12)',
      };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<number, string> = {
  1: 'Top pick',
  2: 'Good find',
  3: 'Worth a visit',
};

function getPrimaryBeer(pub: Nadrazka): string | null {
  if (!pub.beerMenu || pub.beerMenu.length === 0) return null;
  const primary = pub.beerMenu.find((b) => b.isPrimary);
  return primary ? primary.name : pub.beerMenu[0].name;
}

function matchesPub(pub: Nadrazka, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return (
    pub.name.toLowerCase().includes(q) ||
    (pub.city?.toLowerCase().includes(q) ?? false) ||
    (pub.stationName?.toLowerCase().includes(q) ?? false)
  );
}

function sortPubs(pubs: Nadrazka[]): Nadrazka[] {
  return [...pubs].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return b.reviewCount - a.reviewCount;
  });
}

// ─── useDebounce ─────────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── PubSearch ────────────────────────────────────────────────────────────────

interface PubSearchProps {
  pubs: Nadrazka[];
  onSelect: (pub: Nadrazka) => void;
  onClose: () => void;
  darkMode?: boolean;
}

function PubSearch({ pubs, onSelect, onClose, darkMode = false }: PubSearchProps) {
  const t = useTheme(darkMode);

  const [query, setQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [inputFocused, setInputFocused] = useState(false);

  const debouncedQuery = useDebounce(query, 200);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Focus input when panel mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape to close; arrow keys handled by the input's onKeyDown
  useEffect(() => {
    const handleKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const filtered = sortPubs(
    pubs.filter(
      (pub) =>
        matchesPub(pub, debouncedQuery) &&
        (!verifiedOnly || pub.verified)
    )
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
    itemRefs.current = [];
  }, [debouncedQuery, verifiedOnly]);

  const handleSelect = useCallback(
    (pub: Nadrazka) => {
      onSelect(pub);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.min(i + 1, filtered.length - 1);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => {
        const next = Math.max(i - 1, 0);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[activeIndex]);
    }
  };

  // Focus trap: keep tab focus inside the panel
  const handlePanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, input, [tabindex]:not([tabindex="-1"]), a[href], li[tabindex]'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <>
      {/* Semi-transparent backdrop — clicking closes panel */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1099,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(1px)',
        }}
      />

      {/* Side panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Search pubs"
        aria-modal="true"
        onKeyDown={handlePanelKeyDown}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 'min(380px, 100vw)',
          height: '100vh',
          zIndex: 1100,
          background: t.panel,
          boxShadow: t.shadow,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 16px 12px',
            flexShrink: 0,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: t.text,
              letterSpacing: '-0.01em',
            }}
          >
            Search pubs
          </span>
          <button
            onClick={onClose}
            aria-label="Close search panel"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: t.closeBg,
              border: 'none',
              borderRadius: '50%',
              fontSize: 18,
              color: t.closeText,
              cursor: 'pointer',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            &#215;
          </button>
        </div>

        {/* ── Search input ── */}
        <div
          style={{
            padding: '12px 16px 0',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 12,
                fontSize: 15,
                color: t.text3,
                pointerEvents: 'none',
                lineHeight: 1,
              }}
            >
              &#128269;
            </span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Name, city, or station…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              autoComplete="off"
              aria-label="Search by pub name, city, or station"
              aria-autocomplete="list"
              aria-controls="pub-search-results"
              aria-activedescendant={
                activeIndex >= 0 ? `pub-result-${activeIndex}` : undefined
              }
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px 10px 38px',
                background: t.inputBg,
                border: `1.5px solid ${inputFocused ? t.inputFocus : t.inputBorder}`,
                borderRadius: 10,
                fontSize: 14,
                color: t.text,
                outline: 'none',
                transition: 'border-color 0.15s ease',
              }}
            />
          </div>
        </div>

        {/* ── Verified-only toggle ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px 10px',
            flexShrink: 0,
          }}
        >
          <label
            htmlFor="verified-toggle"
            style={{
              fontSize: 13,
              color: t.text2,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            Verified only
          </label>
          <button
            id="verified-toggle"
            role="switch"
            aria-checked={verifiedOnly}
            onClick={() => setVerifiedOnly((v) => !v)}
            style={{
              position: 'relative',
              width: 40,
              height: 22,
              background: verifiedOnly ? t.toggleTrackOn : t.toggleTrackOff,
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.2s ease',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: verifiedOnly ? 21 : 3,
                width: 16,
                height: 16,
                background: t.toggleThumb,
                borderRadius: '50%',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>

        {/* ── Results count ── */}
        <div
          style={{
            padding: '0 16px 8px',
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            color: t.text3,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {filtered.length === 0
            ? 'No results'
            : `${filtered.length} pub${filtered.length !== 1 ? 's' : ''}`}
        </div>

        <div style={{ height: 1, background: t.border, flexShrink: 0 }} />

        {/* ── Results list ── */}
        <ul
          id="pub-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Pub results"
          style={{
            flex: 1,
            overflowY: 'auto',
            margin: 0,
            padding: '6px 0 24px',
            listStyle: 'none',
            scrollbarWidth: 'thin',
            scrollbarColor: `${t.scrollbar} transparent`,
          }}
        >
          {filtered.length === 0 && (
            <li
              style={{
                padding: '32px 20px',
                textAlign: 'center',
                fontSize: 14,
                color: t.text3,
                fontStyle: 'italic',
              }}
            >
              {debouncedQuery
                ? `No pubs matching "${debouncedQuery}"`
                : 'No verified pubs found'}
            </li>
          )}

          {filtered.map((pub, idx) => {
            const isActive = idx === activeIndex;
            const beer = getPrimaryBeer(pub);
            const tierLabel = TIER_LABELS[pub.tier] ?? `Tier ${pub.tier}`;

            return (
              <li
                key={pub.id}
                id={`pub-result-${idx}`}
                ref={(el) => { itemRefs.current[idx] = el; }}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => handleSelect(pub)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(pub);
                  }
                }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isActive ? t.itemActiveBg : 'transparent',
                  borderBottom: `1px solid ${t.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  transition: 'background 0.1s ease',
                  outline: 'none',
                }}
              >
                {/* Row 1: name + tier badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: t.text,
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {pub.name}
                  </span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 700,
                      color: pub.tier === 1 ? t.badgeBlueText : t.text3,
                      background: pub.tier === 1 ? t.badgeBlueBg : t.closeBg,
                      padding: '2px 8px',
                      borderRadius: 999,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {tierLabel}
                  </span>
                </div>

                {/* Row 2: city / station */}
                <div
                  style={{
                    fontSize: 12,
                    color: t.text2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {pub.city && (
                    <span>{pub.city}</span>
                  )}
                  {pub.city && pub.stationName && (
                    <span style={{ color: t.text3 }}>·</span>
                  )}
                  {pub.stationName && (
                    <span style={{ color: t.text3 }}>
                      &#128649; {pub.stationName}
                      {pub.distanceToStationM != null && (
                        <span> ({pub.distanceToStationM} m)</span>
                      )}
                    </span>
                  )}
                </div>

                {/* Row 3: rating + beer brand + verified badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  {pub.rating != null && (
                    <span
                      style={{
                        fontSize: 12,
                        color: t.text2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span style={{ color: t.starColor }}>&#9733;</span>
                      <strong style={{ color: t.text }}>{pub.rating.toFixed(1)}</strong>
                      <span style={{ color: t.text3 }}>({pub.reviewCount})</span>
                    </span>
                  )}

                  {beer && (
                    <span
                      style={{
                        fontSize: 11,
                        color: t.text3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                    >
                      <span aria-hidden="true">&#127866;</span>
                      {beer}
                    </span>
                  )}

                  {pub.verified && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: t.badgeBlueText,
                        background: t.badgeBlueBg,
                        padding: '1px 7px',
                        borderRadius: 999,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Verified
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

// ─── PubSearchButton ──────────────────────────────────────────────────────────

interface PubSearchButtonProps {
  onClick: () => void;
  darkMode?: boolean;
}

function PubSearchButton({ onClick, darkMode = false }: PubSearchButtonProps) {
  const t = useTheme(darkMode);

  return (
    <button
      onClick={onClick}
      aria-label="Open pub search"
      style={{
        position: 'fixed',
        bottom: 96,
        left: 16,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        background: t.panel,
        color: t.text,
        border: `1.5px solid ${t.border}`,
        borderRadius: 999,
        boxShadow: darkMode
          ? '0 4px 16px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(15,23,42,0.12)',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = darkMode
          ? '0 6px 24px rgba(0,0,0,0.55)'
          : '0 6px 24px rgba(15,23,42,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.boxShadow = darkMode
          ? '0 4px 16px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(15,23,42,0.12)';
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      Search pubs
    </button>
  );
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { PubSearch, PubSearchButton };
