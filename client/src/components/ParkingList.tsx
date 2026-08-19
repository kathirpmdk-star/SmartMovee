import type { ParkingSpot } from '../types';

export function ParkingList({ spots }: { spots: ParkingSpot[] }) {
  if (!spots.length) {
    return <p className="text-sm text-gray-400">No OpenStreetMap-tagged parking found within 1.2 km of the destination.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {spots.map((s) => (
        <div key={s.id} className="border border-gray-200 rounded-md p-3 bg-white">
          <p className="font-medium text-sm text-gray-900">🅿️ {s.name}</p>
          <p className="text-xs text-gray-500 mt-1">{s.distanceFromDestinationM} m from destination</p>
          {s.fee && <p className="text-xs text-gray-500">Fee: {s.fee}</p>}
          {s.openingHours && <p className="text-xs text-gray-500">Hours: {s.openingHours}</p>}
          <p className="text-[11px] text-gray-400 mt-1">{s.availabilityLabel} (source: OpenStreetMap)</p>
        </div>
      ))}
    </div>
  );
}
