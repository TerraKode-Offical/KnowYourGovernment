"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronDown } from "lucide-react";
import { useUserState } from "@/hooks/useUserState";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface StateOption {
  name: string;
  abbreviation: string;
  fipsCode: string;
}

// ─────────────────────────────────────────────
// States list (sourced from public/data/states.json values)
// ─────────────────────────────────────────────

const STATES: StateOption[] = [
  { name: "Alabama",        abbreviation: "AL", fipsCode: "01" },
  { name: "Alaska",         abbreviation: "AK", fipsCode: "02" },
  { name: "Arizona",        abbreviation: "AZ", fipsCode: "04" },
  { name: "Arkansas",       abbreviation: "AR", fipsCode: "05" },
  { name: "California",     abbreviation: "CA", fipsCode: "06" },
  { name: "Colorado",       abbreviation: "CO", fipsCode: "08" },
  { name: "Connecticut",    abbreviation: "CT", fipsCode: "09" },
  { name: "Delaware",       abbreviation: "DE", fipsCode: "10" },
  { name: "Florida",        abbreviation: "FL", fipsCode: "12" },
  { name: "Georgia",        abbreviation: "GA", fipsCode: "13" },
  { name: "Hawaii",         abbreviation: "HI", fipsCode: "15" },
  { name: "Idaho",          abbreviation: "ID", fipsCode: "16" },
  { name: "Illinois",       abbreviation: "IL", fipsCode: "17" },
  { name: "Indiana",        abbreviation: "IN", fipsCode: "18" },
  { name: "Iowa",           abbreviation: "IA", fipsCode: "19" },
  { name: "Kansas",         abbreviation: "KS", fipsCode: "20" },
  { name: "Kentucky",       abbreviation: "KY", fipsCode: "21" },
  { name: "Louisiana",      abbreviation: "LA", fipsCode: "22" },
  { name: "Maine",          abbreviation: "ME", fipsCode: "23" },
  { name: "Maryland",       abbreviation: "MD", fipsCode: "24" },
  { name: "Massachusetts",  abbreviation: "MA", fipsCode: "25" },
  { name: "Michigan",       abbreviation: "MI", fipsCode: "26" },
  { name: "Minnesota",      abbreviation: "MN", fipsCode: "27" },
  { name: "Mississippi",    abbreviation: "MS", fipsCode: "28" },
  { name: "Missouri",       abbreviation: "MO", fipsCode: "29" },
  { name: "Montana",        abbreviation: "MT", fipsCode: "30" },
  { name: "Nebraska",       abbreviation: "NE", fipsCode: "31" },
  { name: "Nevada",         abbreviation: "NV", fipsCode: "32" },
  { name: "New Hampshire",  abbreviation: "NH", fipsCode: "33" },
  { name: "New Jersey",     abbreviation: "NJ", fipsCode: "34" },
  { name: "New Mexico",     abbreviation: "NM", fipsCode: "35" },
  { name: "New York",       abbreviation: "NY", fipsCode: "36" },
  { name: "North Carolina", abbreviation: "NC", fipsCode: "37" },
  { name: "North Dakota",   abbreviation: "ND", fipsCode: "38" },
  { name: "Ohio",           abbreviation: "OH", fipsCode: "39" },
  { name: "Oklahoma",       abbreviation: "OK", fipsCode: "40" },
  { name: "Oregon",         abbreviation: "OR", fipsCode: "41" },
  { name: "Pennsylvania",   abbreviation: "PA", fipsCode: "42" },
  { name: "Rhode Island",   abbreviation: "RI", fipsCode: "44" },
  { name: "South Carolina", abbreviation: "SC", fipsCode: "45" },
  { name: "South Dakota",   abbreviation: "SD", fipsCode: "46" },
  { name: "Tennessee",      abbreviation: "TN", fipsCode: "47" },
  { name: "Texas",          abbreviation: "TX", fipsCode: "48" },
  { name: "Utah",           abbreviation: "UT", fipsCode: "49" },
  { name: "Vermont",        abbreviation: "VT", fipsCode: "50" },
  { name: "Virginia",       abbreviation: "VA", fipsCode: "51" },
  { name: "Washington",     abbreviation: "WA", fipsCode: "53" },
  { name: "West Virginia",  abbreviation: "WV", fipsCode: "54" },
  { name: "Wisconsin",      abbreviation: "WI", fipsCode: "55" },
  { name: "Wyoming",        abbreviation: "WY", fipsCode: "56" },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export interface StateSelectorProps {
  /** Additional CSS classes to apply to the wrapper */
  className?: string;
  /** If true, render a compact version showing only the abbreviation */
  compact?: boolean;
}

export default function StateSelector({ className = "", compact = false }: StateSelectorProps) {
  const router = useRouter();
  const { userState, setUserState } = useUserState();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const abbr = e.target.value;
      if (!abbr) return;
      setUserState(abbr);
      router.push(`/state/${abbr.toLowerCase()}`);
    },
    [router, setUserState]
  );

  const selectedState = STATES.find((s) => s.abbreviation === userState);
  const placeholderText = "Select Your State";

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      title={selectedState ? `Your state: ${selectedState.name}` : "Select your state"}
    >
      {/* MapPin icon overlay */}
      <MapPin
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none
                   text-white/60 z-10"
        aria-hidden="true"
      />

      <select
        value={userState ?? ""}
        onChange={handleChange}
        aria-label="Select your state"
        className={`appearance-none bg-white/10 text-white text-sm font-medium rounded-lg
                    border border-white/20 cursor-pointer
                    hover:bg-white/20 hover:border-white/30
                    focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent
                    transition-colors
                    ${!userState ? "ring-1 ring-white/40 font-semibold" : ""}
                    ${compact
                      ? "pl-7 pr-7 py-1.5 w-24 text-center"
                      : "pl-8 pr-8 py-2 w-52"}`}
      >
        <option value="" disabled className="bg-[#1B2A4A] text-white">
          {placeholderText}
        </option>
        {STATES.map((state) => (
          <option
            key={state.abbreviation}
            value={state.abbreviation}
            className="bg-[#1B2A4A] text-white"
          >
            {compact ? state.abbreviation : state.name}
          </option>
        ))}
      </select>

      {/* Chevron icon overlay */}
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none
                   text-white/60"
        aria-hidden="true"
      />
    </div>
  );
}
