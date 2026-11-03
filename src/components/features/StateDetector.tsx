"use client";

import { useRouter } from "next/navigation";
import { MapPin, ChevronDown, ArrowRight } from "lucide-react";
import { useUserState } from "@/hooks/useUserState";

interface State {
  abbr: string;
  name: string;
}

interface StateDetectorProps {
  states: State[];
}

export default function StateDetector({ states }: StateDetectorProps) {
  const router = useRouter();
  const { userState, isHydrating } = useUserState();

  const stateName = states.find((s) => s.abbr === userState)?.name ?? userState;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const abbr = e.target.value;
    if (abbr) {
      router.push(`/state/${abbr}`);
    }
  }

  // During hydration, render nothing to avoid flashing "Select your state"
  // for a user whose cookie is about to load.
  if (isHydrating) return null;

  // ── Selected state ──
  if (userState) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-[#1B2A4A]/10 rounded-full">
            <MapPin size={20} className="text-[#1B2A4A]" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#1B2A4A] leading-snug">
              Your state:{" "}
              <a
                href={`/state/${userState}`}
                className="underline decoration-2 underline-offset-2 hover:text-[#2a3f6a] transition-colors"
              >
                {stateName}
              </a>
            </p>
            <div className="flex items-center gap-3 mt-0.5">
              <a
                href={`/state/${userState}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#1B2A4A]/70 hover:text-[#1B2A4A] transition-colors"
              >
                View your state info <ArrowRight size={14} />
              </a>
              <span className="text-gray-300 select-none">|</span>
              <div className="relative inline-flex items-center">
                <select
                  value=""
                  onChange={handleChange}
                  aria-label="Change state"
                  className="appearance-none pl-2 pr-6 py-0.5 text-sm font-medium text-[#1B2A4A]/70 hover:text-[#1B2A4A] bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0"
                >
                  <option value="">Change state</option>
                  {states.map((s) => (
                    <option key={s.abbr} value={s.abbr}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-0 text-[#1B2A4A]/50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── No state selected — prompt user to pick one ──
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-5 py-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
          <MapPin size={20} className="text-amber-600" />
        </div>
        <div>
          <p className="text-lg font-semibold text-[#1B2A4A]">
            Select your state to see local information
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            We&apos;ll show you your representatives, upcoming elections, and more.
          </p>
        </div>
      </div>

      {/* Prominent dropdown */}
      <div className="relative inline-flex items-center sm:ml-auto">
        <MapPin
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#1B2A4A]/50 z-10"
          aria-hidden="true"
        />
        <select
          value=""
          onChange={handleChange}
          aria-label="Select your state"
          className="appearance-none pl-9 pr-10 py-3 text-base font-semibold text-[#1B2A4A] bg-white border-2 border-[#1B2A4A]/30 rounded-xl hover:border-[#1B2A4A]/60 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 focus:border-[#1B2A4A] cursor-pointer shadow-sm transition-all min-w-[220px]"
        >
          <option value="">Choose Your State</option>
          {states.map((s) => (
            <option key={s.abbr} value={s.abbr}>
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={18}
          className="pointer-events-none absolute right-3 text-[#1B2A4A]/50"
        />
      </div>
    </div>
  );
}
