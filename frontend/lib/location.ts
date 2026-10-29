export function parseCoordinates(value: string): { latitude: number; longitude: number } | null {
  const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error("Use latitude from -90 to 90 and longitude from -180 to 180.");
  }
  return { latitude, longitude };
}

export async function getDeviceLocation(geolocation: Pick<Geolocation, "getCurrentPosition">): Promise<GeolocationPosition> {
  const request = (enableHighAccuracy: boolean) => new Promise<GeolocationPosition>((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy,
      timeout: enableHighAccuracy ? 10000 : 20000,
      maximumAge: enableHighAccuracy ? 0 : 60000,
    });
  });
  try {
    return await request(true);
  } catch (error) {
    if ((error as GeolocationPositionError).code === 1) throw error;
    return request(false);
  }
}

export function locationErrorMessage(error: { code?: number }): string {
  if (error.code === 1) return "Location access is blocked. Allow location for this site and enable device Location Services, then try again. Or enter an address or coordinates.";
  if (error.code === 3) return "Your device did not return a location. Enter the incident address with city and country, then choose Find address. You can also paste latitude, longitude.";
  return "Your device could not provide a location. Check Location Services. If you’re using an in-app browser, try your regular browser, or enter an address or coordinates.";
}
