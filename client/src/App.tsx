import { useEffect, useState } from 'react';
import { PrivateModeCard } from './components/PrivateModeCard';
import { BusCard } from './components/BusCard';
import { ParkingList } from './components/ParkingList';
import { MapView } from './components/MapView';
import { RecommendationPanel } from './components/RecommendationPanel';
import { SosButton } from './components/SosButton';
import { PlaceAutocomplete } from './components/PlaceAutocomplete';
import { fetchPlan, type PlaceSuggestion } from './api';
import { useGeolocation } from './useGeolocation';
import type { PlanResponse, TravelMode } from './types';

type PanelView = 'private' | 'public';

function App() {
  const geo = useGeolocation();
  const [from, setFrom] = useState('');
  const [usingGpsFrom, setUsingGpsFrom] = useState(true);
  const [to, setTo] = useState('');
  const [toCoords, setToCoords] = useState<{ lat: number; lon: number } | undefined>(undefined);
  const [openField, setOpenField] = useState<'from' | 'to' | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TravelMode | 'bus'>('car');
  const [panelView, setPanelView] = useState<PanelView>('private');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [tripStarted, setTripStarted] = useState(false);

  useEffect(() => {
    if (geo.status !== 'locating' && usingGpsFrom) setFrom(geo.label);
  }, [geo, usingGpsFrom]);

  function handleFromChange(value: string) {
    setUsingGpsFrom(false);
    setFrom(value);
  }

  function handleToChange(value: string) {
    setTo(value);
    setToCoords(undefined);
  }

  function handleToSelect(place: PlaceSuggestion) {
    setToCoords({ lat: place.lat, lon: place.lon });
  }

  async function handleSearch() {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    setError(null);
    setTripStarted(false);
    try {
      const result = await fetchPlan(
        from.trim(),
        to.trim(),
        'balanced',
        usingGpsFrom ? { lat: geo.lat, lon: geo.lon } : undefined,
        toCoords
      );
      setPlan(result);
      const best = [...result.private].sort((a, b) => b.score.overall - a.score.overall)[0];
      if (best) setActiveTab(best.mode);
      setPanelView('private');
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const bestMode = plan ? [...plan.private].sort((a, b) => b.score.overall - a.score.overall)[0]?.mode : null;
  const activePrivateOption = plan && activeTab !== 'bus' ? plan.private.find((p) => p.mode === activeTab) : null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gray-100">
      <div className="absolute inset-0 z-0">
        <MapView
          origin={{ lat: geo.lat, lon: geo.lon, label: geo.label }}
          plan={plan}
          activeMode={activeTab === 'bus' ? bestMode ?? 'car' : activeTab}
          originIcon={activeTab}
          focusOrigin={tripStarted}
        />
      </div>

      {plan && activePrivateOption && (
        <div className="absolute top-4 right-4 z-20 bg-white border border-gray-200 rounded-lg shadow px-3 py-2 flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background:
                activePrivateOption.traffic.condition === 'low'
                  ? '#16a34a'
                  : activePrivateOption.traffic.condition === 'moderate'
                    ? '#f59e0b'
                    : '#dc2626',
            }}
          />
          <span className="text-xs font-medium text-gray-700 capitalize">Traffic: {activePrivateOption.traffic.condition}</span>
        </div>
      )}

      <div
        className={`absolute top-0 left-0 z-10 h-full bg-white shadow-xl flex flex-col transition-all ${
          panelCollapsed ? 'w-0' : 'w-full sm:w-[380px]'
        }`}
      >
        {!panelCollapsed && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-gray-200 shrink-0">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">SMARTMOVE</h1>
              <p className="text-xs text-gray-500">Chennai</p>
            </div>

            <div className="px-5 py-3 border-b border-gray-200 shrink-0 space-y-2">
              <PlaceAutocomplete
                value={from}
                onChange={handleFromChange}
                dotColor="#059669"
                placeholder={geo.status === 'locating' ? 'Detecting your location...' : 'From'}
                isOpen={openField === 'from'}
                onRequestOpen={() => setOpenField('from')}
                onRequestClose={() => setOpenField((f) => (f === 'from' ? null : f))}
                rightSlot={
                  !usingGpsFrom ? (
                    <button
                      type="button"
                      title="Use my current location"
                      onClick={() => setUsingGpsFrom(true)}
                      className="text-xs text-blue-700 shrink-0"
                    >
                      📍
                    </button>
                  ) : undefined
                }
              />
              <PlaceAutocomplete
                value={to}
                onChange={handleToChange}
                onSelect={handleToSelect}
                dotColor="#dc2626"
                placeholder="Where to?"
                isOpen={openField === 'to'}
                onRequestOpen={() => setOpenField('to')}
                onRequestClose={() => setOpenField((f) => (f === 'to' ? null : f))}
              />

              <button
                onClick={() => handleSearch()}
                disabled={loading || !to.trim()}
                className="w-full px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-md hover:bg-blue-800 disabled:opacity-60"
              >
                {loading ? 'Finding best options...' : 'Find Best Travel Options'}
              </button>

              {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {plan && (
                <>
                  {plan.isShortTrip && (
                    <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs rounded-md p-2.5">
                      🌱 Short trip ({plan.straightLineKm.toFixed(1)} km) — walking or cycling may be lower-emission than
                      driving.
                    </div>
                  )}

                  <RecommendationPanel recommendation={plan.recommendation} aiProviderUsed={plan.aiProviderUsed} />

                  <button
                    onClick={() => {
                      setTripStarted(true);
                      setPanelCollapsed(true);
                    }}
                    className="w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700"
                  >
                    🚀 Start Trip
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPanelView('private')}
                      className={`py-2 rounded-md text-sm font-semibold border ${
                        panelView === 'private' ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-gray-300 text-gray-600'
                      }`}
                    >
                      🚗 Private
                    </button>
                    <button
                      onClick={() => setPanelView('public')}
                      className={`py-2 rounded-md text-sm font-semibold border ${
                        panelView === 'public' ? 'bg-blue-700 border-blue-700 text-white' : 'bg-white border-gray-300 text-gray-600'
                      }`}
                    >
                      🚌 Public
                    </button>
                  </div>

                  {panelView === 'private' && (
                    <div>
                      <div className="space-y-2">
                        {plan.private.map((option) => (
                          <div key={option.mode} onClick={() => setActiveTab(option.mode)} className="cursor-pointer">
                            <PrivateModeCard
                              option={option}
                              isRecommended={option.mode === bestMode}
                              isActive={activeTab === option.mode}
                            />
                          </div>
                        ))}
                      </div>

                      {(activeTab === 'car' || activeTab === 'bike') && (
                        <div className="mt-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                            Parking near destination
                          </h3>
                          <ParkingList spots={plan.parking} />
                        </div>
                      )}
                    </div>
                  )}

                  {panelView === 'public' && (
                    <div>
                      {plan.public.isDemoData && (
                        <div className="mb-2 flex justify-end">
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            Demo data
                          </span>
                        </div>
                      )}
                      {plan.public.buses.length ? (
                        <div className="space-y-2">
                          {plan.public.buses.map((bus, i) => (
                            <div key={`${bus.busNumber}-${i}`} onClick={() => setActiveTab('bus')} className="cursor-pointer">
                              <BusCard bus={bus} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No bus routes found connecting these two points.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              {!plan && (
                <p className="text-sm text-gray-400 pt-4">
                  Enter a destination above to compare private and public transport options.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setPanelCollapsed((c) => !c)}
        className="absolute top-4 z-20 bg-white border border-gray-300 rounded-full w-8 h-8 shadow flex items-center justify-center text-sm"
        style={{ left: panelCollapsed ? 12 : 'calc(min(380px, 100vw) - 16px)' }}
      >
        {panelCollapsed ? '›' : '‹'}
      </button>

      {plan && <SosButton originLat={geo.lat} originLon={geo.lon} onReported={() => handleSearch()} />}
    </div>
  );
}

export default App;
