import { useEffect, useRef, useState } from 'react';
import { suggestPlaces, type PlaceSuggestion } from '../api';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: PlaceSuggestion) => void;
  placeholder?: string;
  dotColor: string;
  rightSlot?: React.ReactNode;
  isOpen: boolean;
  onRequestOpen: () => void;
  onRequestClose: () => void;
}

export function PlaceAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  dotColor,
  rightSlot,
  isOpen,
  onRequestOpen,
  onRequestClose,
}: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onRequestClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput(text: string) {
    onChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      onRequestClose();
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await suggestPlaces(text);
      setSuggestions(results);
      if (results.length) onRequestOpen();
    }, 350);
  }

  function handleSelect(place: PlaceSuggestion) {
    onChange(place.displayName);
    onRequestClose();
    setSuggestions([]);
    onSelect?.(place);
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <span className="text-xs shrink-0" style={{ color: dotColor }}>
        ●
      </span>
      <input
        className="flex-1 border border-gray-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => suggestions.length > 0 && onRequestOpen()}
        placeholder={placeholder}
      />
      {rightSlot}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-4 right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              📍 {s.displayName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
