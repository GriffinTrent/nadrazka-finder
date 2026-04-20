export interface Review {
  author: string | null;
  stars: number | null;
  publishAt: string | null;
  text: string | null;
}

export interface Nadrazka {
  id: string;
  placeId: string | null;
  name: string;
  lat: number;
  lng: number;
  address: string;
  city: string | null;
  stationName: string | null;
  distanceToStationM: number | null;
  tier: 1 | 2 | 3;
  verified: boolean;
  googleMapsUrl: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number;
  priceLevel: number | null;
  openingHours: Array<{ day: string; hours: string }> | null;
  images: Array<{ imageUrl: string }> | null;
  categories: string[];
  permanentlyClosed: boolean;
  source: string;
  scrapedAt: string;
  reviews: Review[];
}
