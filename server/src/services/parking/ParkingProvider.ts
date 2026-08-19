export interface ParkingSpot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  distanceFromDestinationM: number;
  fee: string | null; // only set if the source actually provides it
  openingHours: string | null;
  source: string;
  // We deliberately never claim a live space count unless a real source provides one.
  availabilityLabel: 'Parking location';
}

export interface ParkingProvider {
  name: string;
  findNearby(lat: number, lon: number, radiusM: number): Promise<ParkingSpot[]>;
}
