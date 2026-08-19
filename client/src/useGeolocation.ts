import { useEffect, useRef, useState } from 'react';
import { reverseGeocode } from './api';

export interface GeoLocationState {
  lat: number;
  lon: number;
  label: string;
  status: 'locating' | 'ready' | 'denied' | 'error';
}

const CHENNAI_FALLBACK = { lat: 13.0827, lon: 80.2707, label: 'Chennai, Tamil Nadu (default)' };

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Live-tracks the device's position with watchPosition (not a one-shot fix), so the
// map marker actually moves as the user moves -- like turn-by-turn navigation.
// Reverse geocoding (for the human-readable label) is throttled to whenever the
// device has moved >120m since the last lookup, both to respect Nominatim's usage
// policy and because re-labeling on every GPS tick would be pointless churn.
export function useGeolocation() {
  const [state, setState] = useState<GeoLocationState>({ ...CHENNAI_FALLBACK, status: 'locating' });
  const lastLabeledAt = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ ...CHENNAI_FALLBACK, status: 'error' });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const needsLabel =
          !lastLabeledAt.current || distanceMeters(lat, lon, lastLabeledAt.current.lat, lastLabeledAt.current.lon) > 120;

        if (needsLabel) {
          lastLabeledAt.current = { lat, lon };
          try {
            const result = await reverseGeocode(lat, lon);
            setState({ lat, lon, label: result.displayName, status: 'ready' });
          } catch {
            setState((prev) => ({ lat, lon, label: prev.label || 'Current location', status: 'ready' }));
          }
        } else {
          setState((prev) => ({ ...prev, lat, lon, status: 'ready' }));
        }
      },
      () => setState({ ...CHENNAI_FALLBACK, status: 'denied' }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return state;
}
