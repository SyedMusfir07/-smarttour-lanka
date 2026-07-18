// Geospatial utilities with Haversine formula (PostGIS fallback)
// Used when PostGIS extension is not available

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoResult {
  lat: number;
  lng: number;
  distance: number; // in meters
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Filter an array of coordinates by distance from a center point
 */
export function filterByDistance(
  points: Coordinates[],
  center: Coordinates,
  maxDistanceMeters: number
): GeoResult[] {
  return points
    .map((p) => ({
      ...p,
      distance: haversineDistance(center, p),
    }))
    .filter((p) => p.distance <= maxDistanceMeters)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Generate a PostGIS-compatible ST_DWithin SQL query template
 * Falls back to using Haversine in JS if PostGIS is not available
 */
export function buildGeoQuery(
  tableName: string,
  latColumn: string,
  lngColumn: string,
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  usePostGIS: boolean = false
): string {
  if (usePostGIS) {
    return `
      SELECT *,
        ST_Distance(
          ST_SetSRID(ST_MakePoint(${lngColumn}, ${latColumn}), 4326)::geography,
          ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography
        ) AS distance
      FROM ${tableName}
      WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(${lngColumn}, ${latColumn}), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${centerLng}, ${centerLat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY distance ASC;
    `;
  }

  // Fallback: The application layer will handle filtering via Haversine
  return '';
}
