"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/api-client";
import {
  Search,
  Building2,
  MapPin,
  Calendar,
  Users,
  Mic,
  Video,
  ArrowRight,
  ChevronRight,
  Landmark,
  BookOpen,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";

export default function LocalHubPage() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!city.trim() && !zip.trim()) {
      setError("Please enter a city or zip code.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (city.trim()) params.set("city", city.trim());
      if (stateAbbr) params.set("state", stateAbbr);
      if (zip.trim()) params.set("zip", zip.trim());

      const res = await fetch(`/api/local/municipality?${params.toString()}`);
      const data = await res.json();

      if (data.municipality) {
        router.push(`/local/city/${data.municipality.id}`);
      } else {
        setError(
          "We don't have data for that area yet. Help us add it by submitting meeting info below."
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Local</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Building2 size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Local Action Center</h1>
              <p className="text-white/60 mt-2 text-lg">
                Find your city council. Attend meetings. Speak up. Make change.
              </p>
            </div>
          </div>

          <p className="text-white/70 leading-relaxed max-w-2xl text-base">
            Real change starts at the local level. City councils make decisions about surveillance
            cameras, data centers, zoning, policing, and infrastructure — often with almost no
            public input. <strong>Change that.</strong> Show up, speak out, and bring your neighbors.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* ── Search ── */}
        <AnimatedSection delay={0}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4 flex items-center gap-2">
              <Search size={20} className="text-blue-600" />
              Find Your City Council
            </h2>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label htmlFor="local-search-city" className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input
                    id="local-search-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Seattle"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="local-search-state" className="block text-xs font-medium text-gray-600 mb-1">State</label>
                  <select
                    id="local-search-state"
                    value={stateAbbr}
                    onChange={(e) => setStateAbbr(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="">All states</option>
                    {US_STATES.map((s) => (
                      <option key={s.abbr} value={s.abbr}>
                        {s.abbr} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="local-search-zip" className="block text-xs font-medium text-gray-600 mb-1">Zip Code</label>
                  <input
                    id="local-search-zip"
                    type="text"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="e.g. 98101"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <p className="text-sm text-amber-800">{error}</p>
                  {(city || zip) && (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `City Hall ${city || zip}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                      >
                        <MapPin size={13} />
                        Find City Hall on Maps
                      </a>
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(
                          `${city || zip} city council meetings agenda public comment`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                      >
                        <Search size={13} />
                        Search Meeting Info
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-semibold hover:bg-[#243656] transition-colors disabled:opacity-60"
                >
                  {loading ? "Searching..." : "Find Meetings"}
                  <ArrowRight size={16} />
                </button>
                <span className="text-xs text-gray-400">or browse by city below</span>
              </div>
            </form>
          </section>
        </AnimatedSection>

        {/* ── How It Works ── */}
        <AnimatedSection delay={0.05}>
          <section>
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6">How This Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  icon: Search,
                  title: "Find Your City",
                  description: "Enter your city or zip. We locate city hall and council meeting locations.",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                  border: "border-blue-100",
                },
                {
                  icon: Calendar,
                  title: "See Upcoming Meetings",
                  description: "Browse meeting dates, times, locations, and agendas. Plan ahead.",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                  border: "border-emerald-100",
                },
                {
                  icon: Mic,
                  title: "Get a Speaking Template",
                  description: "AI generates argument templates based on agenda items. Facts included.",
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                  border: "border-purple-100",
                },
                {
                  icon: Users,
                  title: "Show Up With Neighbors",
                  description: "Bring as many people as possible. Coordinate. Record everything.",
                  color: "text-rose-600",
                  bg: "bg-rose-50",
                  border: "border-rose-100",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className={`p-5 rounded-2xl border ${item.border} ${item.bg}`}>
                    <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center mb-3`}>
                      <Icon size={18} className={item.color} />
                    </div>
                    <h3 className="font-bold text-[#1B2A4A] text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Tools ── */}
        <AnimatedSection delay={0.1}>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/local/templates"
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <Mic size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B2A4A] group-hover:text-purple-700 transition-colors">
                    Speaking Templates
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Pre-written, research-backed scripts for Flock cameras, data centers, zoning,
                    and police budgets. Professional and First Amendment tones.
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-purple-600 font-medium mt-3">
                    Browse templates <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/local/rules"
              className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <BookOpen size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B2A4A] group-hover:text-blue-700 transition-colors">
                    Rules for Speaking
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Two approaches: professional and assertive. Know your First Amendment rights,
                    case precedents, and recording protections.
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium mt-3">
                    Read the rules <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </section>
        </AnimatedSection>

        {/* ── Submit a Meeting ── */}
        <AnimatedSection delay={0.15}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-2 flex items-center gap-2">
              <Landmark size={20} className="text-emerald-600" />
              Don&apos;t See Your City?
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              We are expanding coverage city by city. If your municipality is not in our database yet,
              you can submit meeting information and we will add it within 24-48 hours.
            </p>
            <SubmitMeetingForm />
          </section>
        </AnimatedSection>

        {/* ── Grassroots CTA ── */}
        <AnimatedSection delay={0.2}>
          <section className="bg-[#1B2A4A] text-white rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Users size={24} className="text-[#D69E2E]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Start a Movement in Your City</h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  City councils expect empty chambers. They expect no one to care. The single most
                  powerful thing you can do is show up with your neighbors — organized, informed,
                  and unmovable.
                </p>
                <p className="text-white/70 leading-relaxed">
                  Find your meeting. Generate a template. Bring ten people. Record everything.
                  <strong> Make them answer to you.</strong>
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Submit Meeting Form
// ─────────────────────────────────────────────

function SubmitMeetingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    const formData = new FormData(e.currentTarget);
    const payload = {
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      location: formData.get("location") as string,
      agenda: formData.get("agenda") as string,
      email: formData.get("email") as string,
    };

    try {
      const res = await fetch("/api/local/meetings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setSubmitError(apiErrorMessage(data, "Failed to submit. Please try again."));
      }
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
        <h3 className="font-bold text-emerald-900 mb-1">Thank you!</h3>
        <p className="text-sm text-emerald-700">
          We have received your submission and will review it within 24-48 hours.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="submit-city" className="block text-xs font-medium text-gray-600 mb-1">City *</label>
          <input id="submit-city" required type="text" name="city" placeholder="City name"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="submit-state" className="block text-xs font-medium text-gray-600 mb-1">State *</label>
          <input id="submit-state" required type="text" name="state" placeholder="e.g. CA"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="submit-date" className="block text-xs font-medium text-gray-600 mb-1">Meeting Date *</label>
          <input id="submit-date" required type="date" name="date"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="submit-time" className="block text-xs font-medium text-gray-600 mb-1">Meeting Time</label>
          <input id="submit-time" type="time" name="time"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="submit-location" className="block text-xs font-medium text-gray-600 mb-1">Location / Address *</label>
          <input id="submit-location" required type="text" name="location" placeholder="City Hall, 123 Main St"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="submit-agenda" className="block text-xs font-medium text-gray-600 mb-1">Agenda URL or Description</label>
          <input id="submit-agenda" type="text" name="agenda" placeholder="https://... or brief description"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="submit-email" className="block text-xs font-medium text-gray-600 mb-1">Your Email (optional, for updates)</label>
          <input id="submit-email" type="email" name="email" placeholder="you@example.com"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
      </div>
      {submitError && (
        <p className="text-sm text-red-600">{submitError}</p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
      >
        {submitting ? "Submitting..." : "Submit Meeting Info"}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// US States list
// ─────────────────────────────────────────────

const US_STATES = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" },
  { abbr: "AZ", name: "Arizona" }, { abbr: "AR", name: "Arkansas" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" },
  { abbr: "FL", name: "Florida" }, { abbr: "GA", name: "Georgia" },
  { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" },
  { abbr: "IA", name: "Iowa" }, { abbr: "KS", name: "Kansas" },
  { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" },
  { abbr: "MA", name: "Massachusetts" }, { abbr: "MI", name: "Michigan" },
  { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" },
  { abbr: "NE", name: "Nebraska" }, { abbr: "NV", name: "Nevada" },
  { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" },
  { abbr: "NC", name: "North Carolina" }, { abbr: "ND", name: "North Dakota" },
  { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" },
  { abbr: "RI", name: "Rhode Island" }, { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" },
  { abbr: "VT", name: "Vermont" }, { abbr: "VA", name: "Virginia" },
  { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" },
  { abbr: "DC", name: "District of Columbia" },
];
