"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Mic,
  Video,
  Users,
  AlertCircle,
  Copy,
  Check,
  Loader2,
  BookOpen,
  ShieldAlert,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";

interface Meeting {
  id: string;
  title: string;
  meetingDate: string;
  startTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
  restrictions: string | null;
  agendaText: string | null;
  sourceUrl: string | null;
  municipality: {
    id: string;
    name: string;
    state: string;
  } | null;
  agendaItems: AgendaItem[];
}

export default function MeetingPage() {
  const params = useParams();
  const meetingId = params.id as string;

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!meetingId) return;
    setLoading(true);
    fetch(`/api/local/meeting/${meetingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.meeting) {
          setMeeting(data.meeting);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [meetingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
          <h1 className="font-bold text-gray-700">Meeting not found</h1>
          <Link href="/local" className="text-blue-600 text-sm mt-2 inline-block">
            Back to Local
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <Link href="/local" className="hover:text-white/80">Local</Link>
            <ChevronRight size={14} />
            {meeting.municipality && (
              <>
                <Link
                  href={`/local/city/${meeting.municipality.id}`}
                  className="hover:text-white/80"
                >
                  {meeting.municipality.name}
                </Link>
                <ChevronRight size={14} />
              </>
            )}
            <span className="text-white/80">Meeting</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Calendar size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">{meeting.title}</h1>
              <p className="text-white/60 mt-2 text-lg">
                {meeting.municipality?.name}, {meeting.municipality?.state}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar size={16} />
              {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {meeting.startTime && (
              <span className="flex items-center gap-1.5">
                <Clock size={16} />
                {formatTime(meeting.startTime)}
              </span>
            )}
            {meeting.locationAddress && (
              <span className="flex items-center gap-1.5">
                <MapPin size={16} />
                {meeting.locationAddress}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* ── Location & Restrictions ── */}
        <AnimatedSection delay={0}>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" />
                Location
              </h3>
              {meeting.locationName && (
                <p className="text-sm font-medium text-gray-800 mb-1">{meeting.locationName}</p>
              )}
              {meeting.locationAddress ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">{meeting.locationAddress}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      meeting.locationAddress
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Open in Maps <ArrowRight size={14} />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Address not available.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600" />
                Rules & Restrictions
              </h3>
              {meeting.restrictions ? (
                <p className="text-sm text-gray-700">{meeting.restrictions}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  No restrictions on file. Arrive early to sign up for public comment.
                </p>
              )}
              <div className="mt-3 p-2.5 bg-blue-50 rounded-lg text-xs text-blue-800">
                <strong>Tip:</strong> Show up at least 30 minutes early. Bring ID. Bring neighbors.
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Agenda Summary ── */}
        {meeting.agendaText && (
          <AnimatedSection delay={0.03}>
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-bold text-[#1B2A4A] mb-3 flex items-center gap-2">
                <BookOpen size={18} className="text-purple-600" />
                Agenda Summary
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {meeting.agendaText}
              </p>
            </section>
          </AnimatedSection>
        )}

        {/* ── Recording Warning ── */}
        <AnimatedSection delay={0.05}>
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Video size={20} className="text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Record Everything</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Start recording on your phone before the meeting begins. Keep it recording while you
                  speak. If they violate your rights, cut you off illegally, or remove you for protected
                  speech, that recording is your evidence. Back up to cloud storage immediately after.
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Agenda Items ── */}
        <AnimatedSection delay={0.1}>
          <section>
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6 flex items-center gap-2">
              <BookOpen size={24} className="text-purple-600" />
              Agenda
            </h2>
            {meeting.agendaItems?.length > 0 ? (
              <div className="space-y-4">
                {meeting.agendaItems.map((item: AgendaItem) => (
                  <AgendaItemCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No agenda items on file yet. Check the source link below or the city&apos;s official website.
                </p>
              </div>
            )}
          </section>
        </AnimatedSection>

        {/* ── Source / Actions ── */}
        <AnimatedSection delay={0.15}>
          <section className="flex flex-wrap items-center gap-4">
            {meeting.sourceUrl && (
              <a
                href={meeting.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-blue-300 transition-colors"
              >
                View Official Agenda <ArrowRight size={14} />
              </a>
            )}
            <Link
              href="/local/rules"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B2A4A] text-white rounded-xl text-sm font-semibold hover:bg-[#243656] transition-colors"
            >
              <Mic size={16} />
              Rules for Speaking
            </Link>
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
                <h2 className="text-2xl font-bold mb-2">Show Up. Speak Out. Bring Friends.</h2>
                <p className="text-white/70 leading-relaxed">
                  City councils are not used to packed chambers. They are used to silence.
                  <strong> Break the silence.</strong> Coordinate with your neighbors. Speak one
                  after another on the same issue. Record everything. And do not leave until
                  you have been heard.
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
// Agenda Item Card with Template Generator
// ─────────────────────────────────────────────

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  itemNumber: string | null;
}

function AgendaItemCard({ item }: { item: AgendaItem }) {
  const [template, setTemplate] = useState<{
    opening: string;
    body: string;
    closing: string;
    key_facts: string[];
    suggested_questions: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<"professional" | "assertive">("professional");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/local/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agendaItemTitle: item.title,
          agendaItemDescription: item.description || "",
          tone: selectedTone,
        }),
      });
      const data = await res.json();
      if (data.template) {
        setTemplate(data.template);
      } else {
        setError("Failed to generate template.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!template) return;
    const text = `${template.opening}\n\n${template.body}\n\n${template.closing}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-3">
        {item.itemNumber && (
          <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
            {item.itemNumber}
          </span>
        )}
        <h3 className="font-bold text-[#1B2A4A]">{item.title}</h3>
      </div>
      {item.description && (
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{item.description}</p>
      )}

      {!template && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTone("professional")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTone === "professional"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <BookOpen size={13} />
              Professional
            </button>
            <button
              onClick={() => setSelectedTone("assertive")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedTone === "assertive"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <ShieldAlert size={13} />
              First Amendment
            </button>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Mic size={16} />
                Generate Speaking Template
              </>
            )}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {template && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
              {selectedTone} Template
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTemplate(null);
                  setError("");
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Regenerate
              </button>
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm text-gray-800 leading-relaxed">
            <p className="font-medium text-gray-900">{template.opening}</p>
            <p className="whitespace-pre-line">{template.body}</p>
            <p className="font-medium text-gray-900">{template.closing}</p>
          </div>

          {template.key_facts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Key Facts to Cite
              </h4>
              <ul className="space-y-1.5">
                {template.key_facts.map((fact, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {template.suggested_questions.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Questions to Ask on the Record
              </h4>
              <ul className="space-y-1.5">
                {template.suggested_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                      Q
                    </span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
