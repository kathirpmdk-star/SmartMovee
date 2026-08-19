import { useEffect, useState } from 'react';
import type { BusOption, CrowdLevel, CrowdSummary } from '../types';
import { fetchCrowdSummary, reportCrowd } from '../api';

const CROWD_ICON: Record<CrowdLevel, string> = { low: '🟢', moderate: '🟡', high: '🔴' };

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function BusCard({ bus }: { bus: BusOption }) {
  const [crowd, setCrowd] = useState<CrowdSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCrowdSummary(bus.busNumber).then(setCrowd).catch(() => {});
  }, [bus.busNumber]);

  async function submit(level: CrowdLevel) {
    setSubmitting(true);
    try {
      const summary = await reportCrowd(bus.busNumber, level);
      setCrowd(summary);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">🚌 Bus {bus.busNumber}</h3>
        <span className="text-xs text-gray-400">Scheduled</span>
      </div>
      <p className="text-xs text-gray-500 mt-0.5">{bus.routeName}</p>

      <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm">
        <dt className="text-gray-500">From</dt>
        <dd className="text-gray-900 text-right">{bus.fromStop}</dd>
        <dt className="text-gray-500">To</dt>
        <dd className="text-gray-900 text-right">{bus.toStop}</dd>
        <dt className="text-gray-500">Departure</dt>
        <dd className="text-gray-900 text-right font-medium">{formatTime(bus.departure)}</dd>
        <dt className="text-gray-500">Journey</dt>
        <dd className="text-gray-900 text-right">~{bus.journeyMin} min</dd>
        <dt className="text-gray-500">Stops</dt>
        <dd className="text-gray-900 text-right">{bus.stopsCount}</dd>
        {bus.fare != null && (
          <>
            <dt className="text-gray-500">Fare</dt>
            <dd className="text-gray-900 text-right">₹{bus.fare}</dd>
          </>
        )}
      </dl>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-600">Community Crowd Report</p>
        {crowd?.level ? (
          <p className="text-sm mt-1">
            {CROWD_ICON[crowd.level]} <span className="capitalize">{crowd.level}</span> crowd
            <span className="text-gray-400"> · last report {crowd.lastReportMinutesAgo} min ago · {crowd.reportCount} reports</span>
          </p>
        ) : (
          <p className="text-sm text-gray-400 mt-1">No recent user reports.</p>
        )}
        <p className="text-[11px] text-gray-400 mt-0.5">Based on recent user reports, not official passenger counting.</p>

        <div className="mt-2 flex gap-1.5">
          {(['low', 'moderate', 'high'] as CrowdLevel[]).map((level) => (
            <button
              key={level}
              disabled={submitting}
              onClick={() => submit(level)}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:border-blue-700 disabled:opacity-50"
            >
              {CROWD_ICON[level]} Report {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
