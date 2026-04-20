'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Nadrazka, BeerMenuItem } from '../lib/types';

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

const PRICE_LABEL: Record<number, string> = { 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' };

// Fix 4: Human-readable tier labels
const TIER_LABELS: Record<number, string> = {
  1: 'Top pick',
  2: 'Good find',
  3: 'Worth a visit',
};

// Czech weekday names indexed to match Date.getDay() (0=Sun)
const CZ_DAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];

// Fix 5: Czech → English day abbreviations
const CZ_TO_EN: Record<string, string> = {
  'pondělí': 'Mon', 'úterý': 'Tue', 'středa': 'Wed',
  'čtvrtek': 'Thu', 'pátek': 'Fri', 'sobota': 'Sat', 'neděle': 'Sun',
};

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
  const [translatedReviews, setTranslatedReviews] = useState<Array<string | null> | null>(null);
  const [translating, setTranslating] = useState(false);
  // Two-stop snap system — default full so content is visible immediately
  const [snapState, setSnapState] = useState<'peek' | 'full'>('full');

  const translateReviews = useCallback(async () => {
    if (translatedReviews) { setTranslatedReviews(null); return; }
    if (!location?.reviews?.length) return;
    setTranslating(true);
    const results = await Promise.all(
      location.reviews.slice(0, 5).map(async r => {
        if (!r.text) return null;
        try {
          const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(r.text)}&langpair=cs|en`
          );
          const json = await res.json();
          return json.responseData?.translatedText ?? r.text;
        } catch { return null; } // Fix 6: null signals failure; don't silently show Czech as "English"
      })
    );
    setTranslatedReviews(results);
    setTranslating(false);
  }, [location, translatedReviews]);

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

  // Reset toggles when a new location opens
  useEffect(() => { setHoursOpen(false); setTranslatedReviews(null); setTranslating(false); }, [location?.id]);
  // Open to full whenever a new pub is selected
  useEffect(() => { if (location) setSnapState('full'); }, [location?.id]);

  const isVisible = location !== null;
  const images = location?.images?.filter(img => isSafeUrl(img.imageUrl)) ?? [];
  const todayHours = getTodayHours(location?.openingHours ?? null);

  return (
    <>
      {/* Backdrop — only shown in full state so map stays interactive in peek */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1001,
          background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
          opacity: (isVisible && snapState === 'full') ? 1 : 0,
          pointerEvents: (isVisible && snapState === 'full') ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1002,
          height: snapState === 'full' ? '70vh' : '120px',
          background: t.sheet,
          borderRadius: '20px 20px 0 0',
          boxShadow: darkMode ? '0 -4px 40px rgba(0,0,0,0.4)' : '0 -4px 40px rgba(15,23,42,0.15)',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1), height 0.3s cubic-bezier(0.32,0.72,0,1)',
          pointerEvents: isVisible ? 'auto' : 'none',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Fix 1: Clickable drag handle toggles between peek and full */}
        <div
          onClick={() => setSnapState(s => s === 'peek' ? 'full' : 'peek')}
          style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0, cursor: 'pointer' }}
          aria-label={snapState === 'peek' ? 'Expand pub details' : 'Collapse pub details'}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSnapState(s => s === 'peek' ? 'full' : 'peek'); }}
        >
          <div style={{ width: 36, height: 4, background: t.handle, borderRadius: 99 }} />
        </div>

        {/* Fix 1: Peek summary row — visible only in peek state */}
        {snapState === 'peek' && location && (
          <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{location.name}</div>
              <div style={{ fontSize: 12, color: t.text2, marginTop: 2 }}>
                {location.rating != null && `★ ${location.rating.toFixed(1)}  ·  `}{location.address}
              </div>
            </div>
            <span style={{ fontSize: 12, color: t.text3 }}>↑ expand</span>
          </div>
        )}

        {location && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 28px', visibility: snapState === 'full' ? 'visible' : 'hidden' }}>

            {/* Photo gallery */}
            {images.length > 0 && (
              <div style={{
                display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 20px 14px',
                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
              }}>
                {images.map((img, i) => (
                  // Fix 3: Plain img — no accidental Google Maps navigation
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={img.imageUrl}
                    alt={`Photo of ${location.name}`}
                    style={{
                      flexShrink: 0,
                      width: i === 0 ? 200 : 130,
                      height: 110,
                      objectFit: 'cover',
                      borderRadius: 12,
                      display: 'block',
                    }}
                  />
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
                      {TIER_LABELS[location.tier] ?? `Tier ${location.tier}`}
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

                {/* Fix 2: 44px touch target (WCAG minimum) */}
                <button
                  onClick={onClose}
                  aria-label={`Close ${location?.name ?? 'panel'}`}
                  style={{
                    flexShrink: 0, width: 44, height: 44,
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
                            {/* Fix 5: Show English abbreviation; isToday check still uses CZ_DAYS */}
                            <span style={{ textTransform: 'capitalize', minWidth: 80 }}>{CZ_TO_EN[h.day.toLowerCase()] ?? h.day}</span>
                            <span>{h.hours}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Beer menu */}
              {location.beerMenu && location.beerMenu.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    🍺 Tap Beers
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: t.bg2, borderRadius: 12, overflow: 'hidden' }}>
                    {location.beerMenu.map((beer: BeerMenuItem, i: number) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '9px 14px',
                        borderBottom: i < location.beerMenu!.length - 1 ? `1px solid ${t.border}` : 'none',
                        background: beer.isPrimary ? (darkMode ? 'rgba(250,204,21,0.07)' : 'rgba(250,204,21,0.08)') : 'transparent',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {beer.isPrimary && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.05em' }}>PRIMARY</span>
                          )}
                          <span style={{ fontSize: 13, color: t.text, fontWeight: beer.isPrimary ? 600 : 400 }}>
                            {beer.name}
                          </span>
                        </div>
                        {beer.price != null ? (
                          <span style={{
                            fontSize: 13, fontWeight: 600,
                            color: t.priceText, background: t.priceBg,
                            padding: '2px 9px', borderRadius: 999,
                          }}>
                            {beer.price} Kč
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: t.text3 }}>on tap</span>
                        )}
                      </div>
                    ))}
                  </div>
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

              {/* Google Reviews header + translate button */}
              <div style={{ height: 1, background: t.border, marginBottom: 16 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Google Reviews
                </div>
                {location.reviews?.some(r => r.text) && (
                  <button
                    onClick={translateReviews}
                    disabled={translating}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                      border: `1px solid ${t.border}`, cursor: translating ? 'default' : 'pointer',
                      background: translatedReviews ? t.btnBg : (darkMode ? '#1e293b' : '#f1f5f9'),
                      color: translatedReviews ? t.btnText : t.text2,
                      opacity: translating ? 0.6 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    {translating ? 'Translating…' : translatedReviews ? 'Show original' : '🌐 Translate to English'}
                  </button>
                )}
              </div>
              {location.reviews && location.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {location.reviews.slice(0, 5).map((review, i) => {
                    // Fix 6: fall back to original text if translation returned null
                    const displayText = translatedReviews
                      ? (translatedReviews[i] ?? review.text)
                      : review.text;
                    const translationFailed = translatedReviews && translatedReviews[i] === null;
                    return (
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
                        {displayText && (
                          <p style={{ margin: 0, color: t.text2, fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                            &ldquo;{displayText.length > 200
                              ? (
                                <>
                                  {displayText.slice(0, 200)}
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
                              : displayText
                            }&rdquo;
                            {translationFailed && (
                              <span style={{ fontSize: 10, color: t.text3, marginLeft: 4 }}>[translation unavailable]</span>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
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
