# Nadrazka Finder

Interactive map of Czech train station pubs (nádražky/hospodas).

A nádražka is a pub physically inside or directly attached to a Czech train station.

## Tech Stack
- Next.js 15 + React 19
- Leaflet maps (vanilla JS)
- Tailwind CSS 4
- Apify (data collection)
- Vercel (deployment)

## Getting Started

```bash
npm install --legacy-peer-deps
npm run dev
```

## Data
Locations are stored in `public/data/nadrazky.json`. To regenerate from Apify:
```bash
node scripts/build-dataset.mjs
```

## License
MIT
