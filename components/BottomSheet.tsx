'use client';

import { useEffect, useRef, useState } from 'react';
import type { Nadrazka } from '../lib/types';

function renderStars(stars: number | null): string {
  if (stars === null) return '';
  const filled = Math.round(stars);
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch { return false; }
}

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Station keyword in name — high confidence',
  2: 'Station address + proximity — medium confidence',
  3: 'Proximity only — boss-agent validated',
};

const PRICE_LABEL: Record<number, string> = { 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' };

// Czech weekday names indexed to match Date.getDay() (0=Sun)
const CZ_DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

function getTodayHours(openingHours: Array<{ day: string; hours: string }> | null): string | null {
  if (!openingHours) return null;
  const today = CZ_DAYS[new Date().getDay()];
  const entry = openingHours.find(h => h.day.toLowerCase() === today);
  return entry?.hours ?? null;
}

interface BottomSheetProps {
  location: Nadrazka | null;
  onClose: () => void;
  darkMode?: boolean;
}

export default function BottomSheet({ location, onClose, darkMode = false }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [hoursOpen, setHoursOpen] = useState(false);

  const t = darkMode ? {
    sheet: '#1e293b', bg2: '#0f172a', text: '#f1f5f9', text2: '#94a3b8', text3: '#64748b',
    border: '#334155', handle: '#475569', closeBg: '#334155', closeText: '#94a3b8',
    linkColor: '#60a5fa', badgeBlueBg: '#1e3a5f', badgeBlueText: '#60a5fa',
    badgeAmberBg: '#3d2c00', badgeAmberText: '#fbbf24', tierBg: '#0f172a', tierText: '#94a3b8',
    btnBg: '#1e3a5f', btnText: '#93c5fd', hoursBg: '#0f172a', todayText: '#f1f5f9',
    priceBg: '#14532d', priceText: '#86efac',
  } : {
    sheet: '#ffffff', bg2: '#f8fafc', text: '#0f172a', text2: '#475569', text3: '#94a3b8',
    border: '#f1f5f9', handle: '#e2e8f0', closeBg: '#f1f5f9', closeText: '#64748b',
    linkColor: '#2563eb', badgeBlueBg: '#eff6ff', badgeBlueText: '#1d4ed8',
    badgeAmberBg: '#fffbeb', badgeAmberText: '#d97706', tierBg: '#f8fafc', tierText: '#64748b',
    btnBg: '#1d4ed8', btnText: '#ffffff', hoursBg: '#f8fafc', todayText: '#0f172a',
    priceBg: '#dcfce7', priceText: '#15803d',
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Reset hours toggle when a new location opens
  useEffect(() => { setHoursOpen(false); }, [location?.id]);

  const isVisible = location !== null;
  const images = location?.images?.filter(img => isSafeUrl(img.imageUrl)) ?? [];
  const todayHours = getTodayHours(location?.openingHours ?? null);

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
          opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1002,
          height: '70vh',
          background: t.sheet,
          borderRadius: '20px 20px 0 0',
          boxShadow: darkMode ? '0 -4px 40px rgba(0,0,0,0.4)' : '0 -4px 40px rgba(15,23,42,0.15)',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
          pointerEvents: isVisible ? 'auto' : 'none',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: t.handle, borderRadius: 99 }} />
        </div>

        {location && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 28px' }}>

            {/* Photo gallery */}
            {images.length > 0 && (
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 20px 14px',
                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
              }}>
                {images.map((img, i) => (
                  <a key={i} href={location.googleMapsUrl ?? '#'} target="_blank" rel="noopener noreferrer"
                    style={{ flexShrink: 0, display: 'block' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.imageUrl}
                      alt={`${location.name} photo ${i + 1}`}
                      style={{
                        width: i === 0 ? 200 : 130,
                        height: 110,
                        objectFit: 'cover',
                        borderRadius: 12,
                        display: 'block',
                      }}
                    />
                  </a>
                ))}
              </div>
            )}

            <div style={{ padding: '0 20px' }}>
              {/* Header: name + close */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: t.text, lineHeight: 1.2, margin: 0 }}>
                    {location.name}
                  </h2>

                  {/* Badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <span style={{
                      background: darkMode ? '#1e293b' : '#f1f5f9', color: t.text3,
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                      border: `1px solid ${t.border}`,
                    }}>
                      Tier {location.tier}
                    </span>
                    {location.verified ? (
                      <span style={{ background: t.badgeBlueBg, color: t.badgeBlueText, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                        Verified
                      </span>
                    ) : (
                      <span style={{ background: t.badgeAmberBg, color: t.badgeAmberText, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                        Unverified
                      </span>
                    )}
                    {location.rating != null && (
                      <span style={{ fontSize: 13, color: t.text2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ color: '#f59e0b' }}>&#9733;</span>
                        <strong style={{ color: t.text }}>{location.rating.toFixed(1)}</strong>
                        <span style={{ color: t.text3 }}>({location.reviewCount})</span>
                      </span>
                    )}
                    {location.priceLevel != null && PRICE_LABEL[location.priceLevel] && (
                      <span style={{ background: t.priceBg, color: t.priceText, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>
                        {PRICE_LABEL[location.priceLevel]}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    flexShrink: 0, width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: t.closeBg, border: 'none', borderRadius: '50%',
                    fontSize: 18, color: t.closeText, cursor: 'pointer', lineHeight: 1,
                  }}
                >&#215;</button>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: t.border, marginBottom: 14 }} />

              {/* Info rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14, fontSize: 13, color: t.text2 }}>
                {location.address && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ marginTop: 1 }}>&#128205;</span>
                    <span>{location.address}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>&#128222;</span>
                  {location.phone ? (
                    <a href={`tel:${location.phone}`} style={{ color: t.linkColor, textDecoration: 'none', fontWeight: 500 }}>
                      {location.phone}
                    </a>
                  ) : (
                    <span style={{ color: t.text3 }}>—</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>&#127760;</span>
                  {location.website && isSafeUrl(location.website) ? (
                    <a href={location.website} target="_blank" rel="noopener noreferrer"
                      style={{ color: t.linkColor, textDecoration: 'none', fontWeight: 500 }}>
                      Website &#8599;
                    </a>
                  ) : (
                    <span style={{ color: t.text3 }}>—</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>&#128649;</span>
                  {location.stationName ? (
                    <span>
                      {location.stationName}
                      {location.distanceToStationM != null && (
                        <span style={{ color: t.text3, marginLeft: 6 }}>({location.distanceToStationM} m)</span>
                      )}
                    </span>
                  ) : (
                    <span style={{ color: t.text3 }}>—</span>
                  )}
                </div>
              </div>

              {/* Opening hours */}
              {location.openingHours && location.openingHours.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <button
                    onClick={() => setHoursOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%', background: t.hoursBg, border: 'none', cursor: 'pointer',
                      borderRadius: 10, padding: '8px 12px', textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13 }}>&#128336;</span>
                      <span style={{ fontSize: 13, color: t.text2 }}>
                        {todayHours ? (
                          <>
                            <span style={{ color: t.todayText, fontWeight: 600 }}>Today: </span>
                            <span>{todayHours}</span>
                          </>
                        ) : 'Opening hours'}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: t.text3, transform: hoursOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      &#9660;
                    </span>
                  </button>

                  {hoursOpen && (
                    <div style={{
                      background: t.hoursBg, borderRadius: '0 0 10px 10px',
                      padding: '4px 12px 10px', marginTop: -2,
                    }}>
                      {location.openingHours.map((h, i) => {
                        const isToday = h.day.toLowerCase() === CZ_DAYS[new Date().getDay()];
                        return (
                          <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '3px 0', fontSize: 12,
                            color: isToday ? t.todayText : t.text2,
                            fontWeight: isToday ? 600 : 400,
                          }}>
                            <span style={{ textTransform: 'capitalize', minWidth: 80 }}>{h.day}</span>
                            <span>{h.hours}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Google Maps button */}
              {location.googleMapsUrl && isSafeUrl(location.googleMapsUrl) && (
                <a
                  href={location.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    width: '100%', padding: '10px 0',
                    background: t.btnBg, color: t.btnText,
                    borderRadius: 12, fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', marginBottom: 16, boxSizing: 'border-box',
                  }}
                >
                  &#128506; Open in Google Maps
                </a>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: t.border, marginBottom: 14 }} />

              {/* Tier description */}
              <div style={{ background: t.tierBg, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Confidence
                </div>
                <p style={{ margin: 0, fontSize: 13, color: t.tierText, lineHeight: 1.5 }}>
                  {TIER_LABELS[location.tier]}
                </p>
              </div>

              {/* Google Reviews */}
              <div style={{ height: 1, background: t.border, margin: '16px 0' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Google Reviews
              </div>
              {location.reviews && location.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {location.reviews.slice(0, 5).map((review, i) => (
                    <div key={i} style={{ fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ color: '#f59e0b', fontSize: 13, letterSpacing: 1 }}>
                          {renderStars(review.stars)}
                        </span>
                        {review.author && (
                          <span style={{ fontWeight: 600, color: t.text2, fontSize: 12 }}>{review.author}</span>
                        )}
                        {review.publishAt && (
                          <span style={{ color: t.text3, fontSize: 11 }}>· {review.publishAt}</span>
                        )}
                      </div>
                      {review.text && (
                        <p style={{ margin: 0, color: t.text2, fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                          &ldquo;{review.text.length > 200
                            ? (
                              <>
                                {review.text.slice(0, 200)}
                                {'... '}
                                {location.googleMapsUrl && (
                                  <a
                                    href={location.googleMapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: t.linkColor, fontStyle: 'normal', fontWeight: 500, textDecoration: 'none' }}
                                  >
                                    read more
                                  </a>
                                )}
                              </>
                            )
                            : review.text
                          }&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 12, color: t.text3, fontStyle: 'italic' }}>
                  No reviews available.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
