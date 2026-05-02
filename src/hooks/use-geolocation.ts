import { useCallback, useState } from "react";

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeoResult extends GeoCoords {
  city?: string;
  region?: string;
  country?: string;
  label?: string;
}

interface State {
  loading: boolean;
  error: string | null;
  data: GeoResult | null;
}

// Reverse geocode using OpenStreetMap Nominatim (free, no key required).
async function reverseGeocode(lat: number, lng: number): Promise<Partial<GeoResult>> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1&email=hello@ai-navigator.local`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { city: "Current Location" };
    const json = await res.json();
    const a = json.address ?? {};
    const city =
      a.city || a.town || a.village || a.municipality || a.county || a.state_district || a.state || "Current Location";
    return {
      city,
      region: a.state,
      country: a.country,
      label: json.display_name,
    };
  } catch {
    return { city: "Current Location" };
  }
}

export function useGeolocation() {
  const [state, setState] = useState<State>({ loading: false, error: null, data: null });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ loading: false, error: "Geolocation not supported in this browser.", data: null });
      return;
    }
    setState({ loading: true, error: null, data: null });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const meta = await reverseGeocode(latitude, longitude);
        setState({
          loading: false,
          error: null,
          data: { lat: latitude, lng: longitude, accuracy, ...meta },
        });
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable it in your browser to find nearby hospitals."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Location unavailable. Try again."
              : err.code === err.TIMEOUT
                ? "Location request timed out."
                : "Could not determine your location.";
        setState({ loading: false, error: msg, data: null });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { ...state, request };
}

// Haversine distance in kilometers
export function distanceKm(a: GeoCoords, b: GeoCoords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
