import type { PrivateOption } from '../types';

const MODE_ICON: Record<string, string> = { car: '🚗', bike: '🏍️', cycle: '🚲', walk: '🚶' };
const MODE_LABEL: Record<string, string> = { car: 'Car', bike: 'Bike', cycle: 'Cycle', walk: 'Walking' };
const TRAFFIC_COLOR: Record<string, string> = {
  low: 'text-emerald-700 bg-emerald-50',
  moderate: 'text-amber-700 bg-amber-50',
  heavy: 'text-red-700 bg-red-50',
};

function formatMinutes(min: number) {
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m}m`;
}

interface Props {
  option: PrivateOption;
  isRecommended: boolean;
  isActive?: boolean;
}

export function PrivateModeCard({ option, isRecommended, isActive }: Props) {
  const { mode, route, traffic, trafficNote, emission, safety, etaMin, score } = option;
  return (
    <div
      className={`border rounded-lg p-3.5 bg-white transition-colors ${
        isActive ? 'border-blue-700 ring-1 ring-blue-700' : isRecommended ? 'border-blue-300' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">
          {MODE_ICON[mode]} {MODE_LABEL[mode]}
        </h3>
        <div className="flex items-center gap-2">
          {mode !== 'cycle' && mode !== 'walk' && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${TRAFFIC_COLOR[traffic.condition]}`}>
              {traffic.condition}
            </span>
          )}
          {isRecommended && (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">🏆 Best</span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between text-sm">
        <span className="text-gray-500">
          {route.distanceKm.toFixed(1)} km &middot; <span className="font-medium text-gray-900">{formatMinutes(etaMin)}</span>
        </span>
        <span className="font-semibold text-blue-700">{score.overall}/100</span>
      </div>

      {isActive && (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm border-t border-gray-100 pt-2.5">
            <dt className="text-gray-500">Est. CO₂</dt>
            <dd className="text-gray-900 text-right">{emission.co2Label}</dd>

            <dt className="text-gray-500">Eco score</dt>
            <dd className="text-gray-900 text-right">{emission.ecoScore}/100</dd>

            <dt className="text-gray-500">Safety</dt>
            <dd className="text-gray-900 text-right">{safety.score}/100</dd>
          </dl>

          <p className="mt-2 text-[11px] text-gray-400 leading-snug">{safety.label}</p>
          {trafficNote && <p className="mt-1 text-[11px] text-amber-600 leading-snug">{trafficNote}</p>}
          {!traffic.isLive && mode !== 'cycle' && mode !== 'walk' && (
            <p className="mt-1 text-[11px] text-gray-400 leading-snug">Traffic: {traffic.source}</p>
          )}
        </>
      )}
    </div>
  );
}
