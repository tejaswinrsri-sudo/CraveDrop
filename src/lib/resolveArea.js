const AREA_CENTERS = [
  { name: 'Ramapuram', lat: 13.0388, lng: 80.1804 },
  { name: 'Mogappair', lat: 13.085, lng: 80.177 },
  { name: 'Anna Nagar', lat: 13.085, lng: 80.2101 },
  { name: 'T. Nagar', lat: 13.0418, lng: 80.2341 },
  { name: 'Velachery', lat: 12.9756, lng: 80.2207 },
  { name: 'Adyar', lat: 13.0012, lng: 80.2565 },
  { name: 'Besant Nagar', lat: 12.9988, lng: 80.2668 },
  { name: 'Mylapore', lat: 13.0339, lng: 80.2619 },
  { name: 'Porur', lat: 13.0381, lng: 80.1564 },
  { name: 'Kilpauk', lat: 13.0827, lng: 80.2437 },
  { name: 'Nungambakkam', lat: 13.0569, lng: 80.2425 },
];

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const radians = Math.PI / 180;
  const dLat = (lat2 - lat1) * radians;
  const dLng = (lng2 - lng1) * radians;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveArea({ lat, lng }) {
  const nearest = AREA_CENTERS.reduce((closest, center) => {
    const distanceKm = haversineDistanceKm(lat, lng, center.lat, center.lng);
    return distanceKm < closest.distanceKm ? { area: center.name, distanceKm } : closest;
  }, { area: null, distanceKm: Infinity });

  if (nearest.distanceKm > 12) {
    return {
      success: false,
      area: 'outside our delivery zone',
      distanceKm: Math.round(nearest.distanceKm * 10) / 10,
    };
  }

  return {
    success: true,
    area: nearest.area,
    distanceKm: Math.round(nearest.distanceKm * 10) / 10,
  };
}