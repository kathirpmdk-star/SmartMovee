import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import type { PlanResponse, TravelMode, TrafficCondition } from '../types';

const emojiIcon = (emoji: string, size = 26) =>
  L.divIcon({
    html: `<div style="font-size:${size}px; line-height:1; transform: translate(-50%, -100%);">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [0, 0],
  });

const INCIDENT_COLOR: Record<string, string> = { severe: '#dc2626', moderate: '#f59e0b', minor: '#eab308' };

// A warning-sign badge (not a plain colored dot) so it reads as a hazard, not just
// another location pin, and is visually distinct from route/vehicle markers.
const warningIcon = (severity: string) =>
  L.divIcon({
    html: `<div style="
      transform: translate(-50%, -100%);
      background: ${INCIDENT_COLOR[severity] ?? INCIDENT_COLOR.moderate};
      width: 26px; height: 26px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      font-size: 14px;
    ">⚠️</div>`,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [0, 0],
  });

// Nudge an incident marker a small fixed distance away if it's essentially co-located
// with the origin point, so the warning badge never renders directly on top of the
// vehicle icon.
function dedupeFromOrigin(lat: number, lon: number, originLat: number, originLon: number): [number, number] {
  const closeEnough = Math.abs(lat - originLat) < 0.0003 && Math.abs(lon - originLon) < 0.0003;
  return closeEnough ? [lat + 0.0006, lon + 0.0006] : [lat, lon];
}

// Vehicle-style marker for the origin, matching the currently selected mode --
// like a live-navigation puck showing what you're travelling by. Rendered inside a
// solid circle (not a bare emoji) so it stays a fixed, clearly visible pixel size
// regardless of how far zoomed in the map is -- otherwise it reads as "tiny" once
// zoomed into street level after Start Trip.
const VEHICLE_ICON: Record<TravelMode | 'bus', string> = {
  car: '🚗',
  bike: '🏍️',
  cycle: '🚲',
  walk: '🚶',
  bus: '🚌',
};

const vehicleIcon = (emoji: string, large = false) => {
  const size = large ? 52 : 38;
  const fontSize = large ? 28 : 20;
  return L.divIcon({
    html: `<div style="
      transform: translate(-50%, -100%);
      background: #1d4ed8;
      width: ${size}px; height: ${size}px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.45);
      font-size: ${fontSize}px;
    ">${emoji}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [0, 0],
  });
};

// Inactive-route colors, kept muted per mode so overlapping alternatives stay legible.
const INACTIVE_ROUTE_COLOR: Record<TravelMode, string> = {
  car: '#94a3b8',
  bike: '#94a3b8',
  cycle: '#94a3b8',
  walk: '#94a3b8',
};

// Active route is colored by real traffic condition -- like Google Maps' congestion
// overlay -- rather than a fixed per-mode color, since traffic is the more useful signal.
const TRAFFIC_ROUTE_COLOR: Record<TrafficCondition, string> = {
  low: '#16a34a',
  moderate: '#f59e0b',
  heavy: '#dc2626',
};

const INITIAL_ZOOM = 17;
const START_TRIP_ZOOM = 18;

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [60, 60], maxZoom: 17 });
  }, [points, map]);
  return null;
}

function RecenterOnly({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Once a trip starts, keep following the live GPS position: the first fix gets a
// full flyTo (zoom + animate in), every subsequent GPS update just pans smoothly so
// the map tracks movement instead of sitting still while the vehicle icon moves.
function LiveTrack({ center, trigger }: { center: [number, number]; trigger: boolean }) {
  const map = useMap();
  const wasTracking = useRef(false);

  useEffect(() => {
    if (!trigger) {
      wasTracking.current = false;
      return;
    }
    if (!wasTracking.current) {
      map.flyTo(center, START_TRIP_ZOOM, { duration: 1.2 });
    } else {
      map.panTo(center, { animate: true, duration: 0.6 });
    }
    wasTracking.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1], trigger]);
  return null;
}

interface Props {
  origin: { lat: number; lon: number; label: string };
  plan: PlanResponse | null;
  activeMode: TravelMode;
  originIcon?: TravelMode | 'bus';
  focusOrigin?: boolean;
}

export function MapView({ origin, plan, activeMode, originIcon, focusOrigin }: Props) {
  if (!plan) {
    return (
      <MapContainer center={[origin.lat, origin.lon]} zoom={INITIAL_ZOOM} className="w-full h-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnly center={[origin.lat, origin.lon]} zoom={INITIAL_ZOOM} />
        <Marker position={[origin.lat, origin.lon]} icon={vehicleIcon(VEHICLE_ICON[originIcon ?? 'car'])}>
          <Popup>{origin.label}</Popup>
        </Marker>
      </MapContainer>
    );
  }

  const activeOption = plan.private.find((p) => p.mode === activeMode);
  const activeRoute = activeOption?.route;
  const activeTrafficColor = activeOption ? TRAFFIC_ROUTE_COLOR[activeOption.traffic.condition] : TRAFFIC_ROUTE_COLOR.low;
  const boundsPoints: [number, number][] = activeRoute?.geometry.length
    ? activeRoute.geometry
    : [[plan.origin.lat, plan.origin.lon], [plan.destination.lat, plan.destination.lon]];

  // Once the trip starts, the vehicle marker follows the live GPS feed (origin prop)
  // instead of sitting frozen at the originally-geocoded start point.
  const vehiclePosition: [number, number] = focusOrigin ? [origin.lat, origin.lon] : [plan.origin.lat, plan.origin.lon];

  return (
    <MapContainer center={[plan.origin.lat, plan.origin.lon]} zoom={15} className="w-full h-full" zoomControl={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {!focusOrigin && <FitBounds points={boundsPoints} />}
      <LiveTrack center={vehiclePosition} trigger={!!focusOrigin} />

      {plan.private.map((p) => (
        <Polyline
          key={p.mode}
          positions={p.route.geometry}
          pathOptions={{
            color: p.mode === activeMode ? activeTrafficColor : INACTIVE_ROUTE_COLOR[p.mode],
            weight: p.mode === activeMode ? 9 : 4,
            opacity: p.mode === activeMode ? 0.95 : 0.35,
          }}
        />
      ))}

      <Marker position={vehiclePosition} icon={vehicleIcon(VEHICLE_ICON[originIcon ?? activeMode], !!focusOrigin)}>
        <Popup>{focusOrigin ? 'You are here (live GPS)' : `Start: ${plan.origin.query}`}</Popup>
      </Marker>
      <Marker position={[plan.destination.lat, plan.destination.lon]} icon={emojiIcon('🔴')}>
        <Popup>Destination: {plan.destination.query}</Popup>
      </Marker>

      {plan.parking.map((spot) => (
        <Marker key={spot.id} position={[spot.lat, spot.lon]} icon={emojiIcon('🅿️', 20)}>
          <Popup>
            {spot.name}
            <br />
            {spot.distanceFromDestinationM} m from destination
            <br />
            <span className="text-xs text-gray-500">{spot.availabilityLabel}</span>
          </Popup>
        </Marker>
      ))}

      {plan.incidents.map((inc) => (
        <Marker
          key={inc.id}
          position={dedupeFromOrigin(inc.lat, inc.lon, plan.origin.lat, plan.origin.lon)}
          icon={warningIcon(inc.severity)}
        >
          <Popup>
            ⚠️ Community-reported incident ({inc.severity})
            <br />
            {inc.note}
            <br />
            <span className="text-xs text-gray-500">{new Date(inc.reportedAt).toLocaleString()}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
