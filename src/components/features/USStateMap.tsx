"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search, ChevronDown } from "lucide-react";
import { useUserState } from "@/hooks/useUserState";
import { US_STATES } from "@/data/us-states";

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface USStateMapProps {
  variant?: "light" | "dark";
}

// ─────────────────────────────────────────────
// Sorted state list for the dropdown
// ─────────────────────────────────────────────

const STATES_SORTED = Object.values(US_STATES).sort((a, b) =>
  a.name.localeCompare(b.name)
);

// ─────────────────────────────────────────────
// State label centroids (SVG viewBox 0 0 960 600)
// ─────────────────────────────────────────────

const STATE_LABELS: Record<string, { x: number; y: number; size?: number }> = {
  AL: { x: 676, y: 402 },
  AK: { x: 171, y: 553, size: 10 },
  AZ: { x: 265, y: 410 },
  AR: { x: 564, y: 382 },
  CA: { x: 155, y: 370 },
  CO: { x: 340, y: 320 },
  CT: { x: 870, y: 230, size: 9 },
  DE: { x: 835, y: 295, size: 9 },
  FL: { x: 745, y: 488 },
  GA: { x: 720, y: 408 },
  HI: { x: 310, y: 555, size: 10 },
  ID: { x: 230, y: 220 },
  IL: { x: 620, y: 300 },
  IN: { x: 660, y: 295 },
  IA: { x: 555, y: 252 },
  KS: { x: 470, y: 330 },
  KY: { x: 695, y: 330 },
  LA: { x: 587, y: 450 },
  ME: { x: 895, y: 140 },
  MD: { x: 815, y: 300, size: 9 },
  MA: { x: 880, y: 215, size: 9 },
  MI: { x: 680, y: 222 },
  MN: { x: 540, y: 170 },
  MS: { x: 622, y: 425 },
  MO: { x: 565, y: 330 },
  MT: { x: 310, y: 155 },
  NE: { x: 445, y: 275 },
  NV: { x: 195, y: 310 },
  NH: { x: 880, y: 175, size: 9 },
  NJ: { x: 850, y: 270, size: 9 },
  NM: { x: 310, y: 405 },
  NY: { x: 835, y: 200 },
  NC: { x: 775, y: 360 },
  ND: { x: 455, y: 155 },
  OH: { x: 720, y: 275 },
  OK: { x: 475, y: 375 },
  OR: { x: 170, y: 185 },
  PA: { x: 800, y: 250 },
  RI: { x: 885, y: 230, size: 9 },
  SC: { x: 755, y: 385 },
  SD: { x: 445, y: 210 },
  TN: { x: 680, y: 360 },
  TX: { x: 445, y: 445 },
  UT: { x: 270, y: 310 },
  VT: { x: 862, y: 165, size: 9 },
  VA: { x: 790, y: 320 },
  WA: { x: 185, y: 115 },
  WV: { x: 755, y: 305, size: 9 },
  WI: { x: 595, y: 195 },
  WY: { x: 315, y: 240 },
  DC: { x: 830, y: 310, size: 8 },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function USStateMap({
  variant = "light",
}: USStateMapProps) {
  const router = useRouter();
  const { userState, setUserState } = useUserState();
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = variant === "dark";
  const hoveredInfo = hoveredState ? US_STATES[hoveredState] : null;

  const filteredStates = search.trim()
    ? STATES_SORTED.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.abbr.toLowerCase().includes(search.toLowerCase())
      )
    : STATES_SORTED;

  const handleStateClick = useCallback(
    (abbr: string) => {
      setUserState(abbr);
      router.push(`/state/${abbr.toLowerCase()}`);
    },
    [router, setUserState]
  );

  const handleDropdownSelect = useCallback(
    (abbr: string) => {
      setUserState(abbr);
      setIsDropdownOpen(false);
      setSearch("");
      router.push(`/state/${abbr.toLowerCase()}`);
    },
    [router, setUserState]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isDropdownOpen]);

  // ── Determine fill/stroke per state ──
  function getStateStyle(abbr: string) {
    const isSelected = userState === abbr;
    const isHovered = hoveredState === abbr;

    if (isSelected) {
      return { fill: "#22C55E", stroke: "#15803D", strokeWidth: 2.5 };
    }
    if (isHovered) {
      return { fill: "#D1D5DB", stroke: "#374151", strokeWidth: 1.5 };
    }
    return { fill: "#FFFFFF", stroke: "#000000", strokeWidth: 1 };
  }

  function getLabelColor(abbr: string) {
    if (userState === abbr) return "#FFFFFF";
    if (hoveredState === abbr) return "#111827";
    return "#374151";
  }

  return (
    <div className="relative w-full">
      {/* Hover tooltip */}
      {hoveredInfo && (
        <div
          className="fixed z-50 px-3 py-1.5 bg-[#1B2A4A] text-white text-sm font-medium rounded-lg shadow-lg pointer-events-none whitespace-nowrap"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          {hoveredInfo.name}
        </div>
      )}

      {/* ── SVG Map ── */}
      <div
        className="rounded-xl overflow-hidden bg-[#eef1f5] p-4"
        onMouseMove={handleMouseMove}
      >
        <svg
          viewBox="0 0 960 600"
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Interactive map of the United States"
        >
          {/* State shapes — white fill, black border */}
          {Object.entries(US_STATES).map(([abbr, stateData]) => {
            const style = getStateStyle(abbr);
            return (
              <path
                key={abbr}
                d={stateData.d}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeLinejoin="round"
                className="cursor-pointer"
                style={{ transition: "fill 0.15s ease, stroke 0.15s ease" }}
                onClick={() => handleStateClick(abbr)}
                onMouseEnter={() => setHoveredState(abbr)}
                onMouseLeave={() => setHoveredState(null)}
                role="button"
                aria-label={stateData.name}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleStateClick(abbr);
                  }
                }}
              />
            );
          })}

          {/* State abbreviation labels */}
          {Object.entries(STATE_LABELS).map(([abbr, pos]) => (
            <text
              key={`lbl-${abbr}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={getLabelColor(abbr)}
              fontSize={pos.size ?? 11}
              fontWeight={userState === abbr ? 700 : 600}
              fontFamily="system-ui, -apple-system, sans-serif"
              className="pointer-events-none select-none"
              style={{ transition: "fill 0.15s ease" }}
            >
              {abbr}
            </text>
          ))}
        </svg>
      </div>

      {/* ── State selector dropdown ── */}
      <div className="mt-3" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isDark
              ? "bg-white/10 hover:bg-white/15 text-white ring-1 ring-white/20"
              : "bg-white hover:bg-gray-50 text-[#1B2A4A] ring-1 ring-gray-200 shadow-sm"
          }`}
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="opacity-50" />
            <span>
              {userState
                ? `${US_STATES[userState]?.name ?? userState} — click to change`
                : "Or search for your state..."}
            </span>
          </div>
          <ChevronDown
            size={14}
            className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isDropdownOpen && (
          <div
            className={`absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden ${
              isDark
                ? "bg-[#1B2A4A] ring-1 ring-white/20"
                : "bg-white ring-1 ring-gray-200"
            }`}
          >
            <div className="p-2">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                  isDark ? "bg-white/10" : "bg-gray-100"
                }`}
              >
                <Search size={14} className="opacity-40 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search states..."
                  className={`w-full bg-transparent text-sm outline-none placeholder:opacity-50 ${
                    isDark ? "text-white" : "text-gray-900"
                  }`}
                />
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto px-1 pb-1">
              {filteredStates.length === 0 ? (
                <p
                  className={`text-sm text-center py-4 ${isDark ? "text-white/40" : "text-gray-400"}`}
                >
                  No states found
                </p>
              ) : (
                filteredStates.map((s) => {
                  const isSelected = userState === s.abbr;
                  return (
                    <button
                      key={s.abbr}
                      onClick={() => handleDropdownSelect(s.abbr)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                        isSelected
                          ? isDark
                            ? "bg-blue-500/20 text-blue-300"
                            : "bg-blue-50 text-blue-700"
                          : isDark
                            ? "text-white/80 hover:bg-white/10"
                            : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className="font-mono text-xs w-6 opacity-60">
                        {s.abbr}
                      </span>
                      <span className="font-medium">{s.name}</span>
                      {isSelected && (
                        <MapPin size={14} className="ml-auto opacity-60" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
