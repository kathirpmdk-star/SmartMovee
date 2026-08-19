import { Router } from 'express';
import { geocode } from '../services/geocode.js';
import { OsrmProvider } from '../services/routing/OsrmProvider.js';
import type { TravelMode } from '../services/routing/RoutingProvider.js';
import { TomTomProvider } from '../services/traffic/TomTomProvider.js';
import { HeuristicFallbackProvider } from '../services/traffic/HeuristicFallbackProvider.js';
import { EmissionService } from '../services/emissions/EmissionService.js';
import { OverpassProvider } from '../services/parking/OverpassProvider.js';
import { IncidentService } from '../services/safety/IncidentService.js';
import { PublicTransportService } from '../services/publicTransport/PublicTransportService.js';
import { RouteScoringService } from '../services/scoring/RouteScoringService.js';
import { GroqProvider } from '../services/ai/GroqProvider.js';
import { RuleBasedProvider } from '../services/ai/RuleBasedProvider.js';
import type { RecommendationCandidate, Priority } from '../services/ai/AIProvider.js';
import { env } from '../env.js';

export const planRouter = Router();

const routingProvider = new OsrmProvider();
const trafficProvider = env.TOMTOM_API_KEY ? new TomTomProvider() : new HeuristicFallbackProvider();
const heuristicTraffic = new HeuristicFallbackProvider();
const parkingProvider = new OverpassProvider();
const aiProvider = env.GROQ_API_KEY ? new GroqProvider() : new RuleBasedProvider();

const PRIVATE_MODES: TravelMode[] = ['car', 'bike', 'cycle', 'walk'];

planRouter.post('/plan', async (req, res) => {
  try {
    const { from, to, priority = 'balanced', fromLat, fromLon, toLat, toLon } = req.body as {
      from: string;
      to: string;
      priority?: Priority;
      fromLat?: number;
      fromLon?: number;
      toLat?: number;
      toLon?: number;
    };
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

    const [origin, destination] = await Promise.all([
      Number.isFinite(fromLat) && Number.isFinite(fromLon)
        ? Promise.resolve({ lat: fromLat as number, lon: fromLon as number, displayName: from })
        : geocode(from),
      Number.isFinite(toLat) && Number.isFinite(toLon)
        ? Promise.resolve({ lat: toLat as number, lon: toLon as number, displayName: to })
        : geocode(to),
    ]);

    const privateResults = await Promise.all(
      PRIVATE_MODES.map(async (mode) => {
        const route = await routingProvider.getRoute(
          { lat: origin.lat, lon: origin.lon },
          { lat: destination.lat, lon: destination.lon },
          mode
        );

        let traffic;
        let trafficNote: string | null = null;
        if (mode === 'car' || mode === 'bike') {
          try {
            traffic = await trafficProvider.getTraffic(route.geometry, route.durationMin);
          } catch {
            traffic = await heuristicTraffic.getTraffic(route.geometry, route.durationMin);
            trafficNote = 'Live traffic unavailable, showing time-of-day estimate.';
          }
        } else {
          traffic = { condition: 'low' as const, delayMin: 0, isLive: false, source: 'n/a (non-motorized)' };
        }

        const emission = EmissionService.estimate(mode, route.distanceKm);
        const safety = IncidentService.scoreForRoute(route.geometry);
        const etaMin = route.durationMin + traffic.delayMin;

        return { mode, route, traffic, trafficNote, emission, safety, etaMin };
      })
    );

    const fastestDuration = Math.min(...privateResults.map((r) => r.etaMin));
    const scored = privateResults.map((r) => ({
      ...r,
      score: RouteScoringService.score({
        durationMin: r.etaMin,
        fastestDurationMin: fastestDuration,
        trafficCondition: r.traffic.condition,
        ecoScore: r.emission.ecoScore,
        safetyScore: r.safety.score,
      }),
    }));

    const publicBuses = PublicTransportService.findBuses(origin.lat, origin.lon, destination.lat, destination.lon);
    const parking = await parkingProvider.findNearby(destination.lat, destination.lon, 1200).catch(() => []);
    const nearbyIncidents = IncidentService.recent(24);

    const straightLineKm = haversine(origin.lat, origin.lon, destination.lat, destination.lon);
    const isShortTrip = straightLineKm < 3;

    const candidates: RecommendationCandidate[] = scored.map((r) => ({
      label: MODE_LABEL[r.mode],
      category: 'private' as const,
      durationMin: r.etaMin,
      distanceKm: r.route.distanceKm,
      trafficCondition: r.traffic.condition,
      co2Grams: r.emission.co2Grams,
      co2Label: r.emission.co2Label,
      safetyScore: r.safety.score,
      fareRupees: 0,
      overallScore: r.score.overall,
    }));
    for (const bus of publicBuses.slice(0, 3)) {
      const busEmission = EmissionService.estimate('bus', straightLineKm);
      candidates.push({
        label: `Bus ${bus.busNumber}`,
        category: 'public',
        durationMin: bus.journeyMin,
        distanceKm: straightLineKm,
        co2Grams: busEmission.co2Grams,
        co2Label: busEmission.co2Label,
        safetyScore: 65,
        fareRupees: bus.fare ?? 0,
        overallScore: 60,
      });
    }

    const recommendation = candidates.length ? await aiProvider.recommend({ from, to, priority, candidates }) : null;

    res.json({
      origin: { ...origin, query: from },
      destination: { ...destination, query: to },
      isShortTrip,
      straightLineKm,
      private: scored,
      public: {
        buses: publicBuses,
        dataSource: PublicTransportService.dataSourceLabel(),
        isDemoData: PublicTransportService.isDemoData(),
      },
      parking,
      incidents: nearbyIncidents,
      recommendation,
      aiProviderUsed: aiProvider.name,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message ?? 'Internal error' });
  }
});

const MODE_LABEL: Record<TravelMode, string> = { car: 'Car', bike: 'Bike', cycle: 'Cycle', walk: 'Walking' };

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
