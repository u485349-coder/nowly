const EARTH_RADIUS_KM = 6371;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceInKm = (
  origin?: { lat: number | null; lng: number | null },
  destination?: { lat: number | null; lng: number | null }
) => {
  if (
    origin?.lat == null ||
    origin?.lng == null ||
    destination?.lat == null ||
    destination?.lng == null
  ) {
    return null;
  }

  const latDistance = toRadians(destination.lat - origin.lat);
  const lngDistance = toRadians(destination.lng - origin.lng);
  const a =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(lngDistance / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
