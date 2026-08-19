import { useState } from 'react';
import type { Severity } from '../types';
import { reportIncident } from '../api';

interface Props {
  originLat: number;
  originLon: number;
  onReported: () => void;
}

export function SosButton({ originLat, originLon, onReported }: Props) {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      await reportIncident(originLat, originLon, severity, note || undefined);
      setDone(true);
      onReported();
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setNote('');
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[1000] bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg"
        title="Report an accident or hazard near your route"
      >
        🆘 Report Incident
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-[1001] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-gray-900">Report an accident / hazard</h3>
            <p className="text-xs text-gray-500 mt-1">
              This is a community report, not an official record. Reports are shown on the map and factored into route safety
              signals for other users.
            </p>

            <div className="mt-3 flex gap-2">
              {(['minor', 'moderate', 'severe'] as Severity[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`flex-1 text-xs py-1.5 rounded border capitalize ${
                    severity === s ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              className="mt-3 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Optional note (e.g. location detail)"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-md text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 text-sm px-3 py-2 bg-red-600 text-white rounded-md disabled:opacity-60"
              >
                {done ? 'Reported ✓' : submitting ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
