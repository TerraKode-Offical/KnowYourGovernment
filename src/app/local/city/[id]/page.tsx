import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ArrowRight,
  Users,
  Video,
  Landmark,
  AlertCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import AnimatedSection from "@/components/features/AnimatedSection";

export const dynamic = "force-dynamic";

interface CityPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    const municipality = await prisma.municipality.findUnique({
      where: { id },
    });
    if (!municipality) {
      notFound();
    }
    return {
      title: `${municipality.name}, ${municipality.state} — Local Meetings`,
      description: `Upcoming city council meetings for ${municipality.name}. Find city hall location, meeting agendas, and speaking templates.`,
    };
  } catch {
    return { title: "Local Government — InformedVoter" };
  }
}

export default async function CityPage({ params }: CityPageProps) {
  const { id } = await params;

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    include: {
      meetings: {
        where: {
          meetingDate: { gte: new Date() },
          status: "scheduled",
        },
        orderBy: { meetingDate: "asc" },
        include: { agendaItems: true },
      },
    },
  });

  if (!municipality) {
    notFound();
  }

  const { name, state, cityHallAddress, councilMeetingAddress, meetingScheduleNote, meetings } =
    municipality;

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
            <span className="text-white/80">
              {name}, {state}
            </span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Building2 size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">
                {name}, {state}
              </h1>
              <p className="text-white/60 mt-2 text-lg">
                City council meetings, locations, and local action tools.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* ── Locations ── */}
        <AnimatedSection delay={0}>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Landmark size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B2A4A]">City Hall</h3>
                  <p className="text-xs text-gray-500">Primary government building</p>
                </div>
              </div>
              {cityHallAddress ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 flex items-start gap-2">
                    <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
                    {cityHallAddress}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cityHallAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Open in Maps <ArrowRight size={14} />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Address not yet available.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B2A4A]">Council Meeting Location</h3>
                  <p className="text-xs text-gray-500">Where public meetings are held</p>
                </div>
              </div>
              {councilMeetingAddress ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 flex items-start gap-2">
                    <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
                    {councilMeetingAddress}
                  </p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(councilMeetingAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Open in Maps <ArrowRight size={14} />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">Address not yet available.</p>
              )}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Schedule Note ── */}
        {meetingScheduleNote && (
          <AnimatedSection delay={0.05}>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm">Typical Meeting Schedule</h4>
                <p className="text-sm text-blue-800 mt-0.5">{meetingScheduleNote}</p>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ── Upcoming Meetings ── */}
        <AnimatedSection delay={0.1}>
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1B2A4A] flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
                Upcoming Meetings
              </h2>
              <Link
                href="/local/rules"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Speaking rules <ArrowRight size={14} />
              </Link>
            </div>

            {meetings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
                <h3 className="font-bold text-gray-700 mb-1">No upcoming meetings found</h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  We don&apos;t have any scheduled meetings on file for {name} yet. Check back soon,
                  or submit meeting information using the form on the Local page.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    href={`/local/meeting/${meeting.id}`}
                    className="group block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-[#1B2A4A] group-hover:text-blue-700 transition-colors">
                          {meeting.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(meeting.meetingDate).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                          {meeting.startTime && (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {formatTime(meeting.startTime)}
                            </span>
                          )}
                          {meeting.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin size={14} />
                              {meeting.locationName}
                            </span>
                          )}
                        </div>
                        {meeting.agendaItems.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400">
                              {meeting.agendaItems.length} agenda item
                              {meeting.agendaItems.length !== 1 ? "s" : ""}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {meeting.agendaItems.slice(0, 3).map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-md"
                                >
                                  {item.title.length > 40 ? item.title.slice(0, 40) + "..." : item.title}
                                </span>
                              ))}
                              {meeting.agendaItems.length > 3 && (
                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-md">
                                  +{meeting.agendaItems.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0">
                        <span className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium">
                          Details <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                    {meeting.restrictions && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 inline-flex items-center gap-1.5">
                          <AlertCircle size={12} />
                          {meeting.restrictions}
                        </p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </AnimatedSection>

        {/* ── Recording Reminder ── */}
        <AnimatedSection delay={0.15}>
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <Video size={20} className="text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Record the Meeting</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Start recording on your phone before the meeting begins. Keep it recording while
                  you speak. If officials violate your First Amendment rights or remove you illegally,
                  that recording is your evidence for a <strong>42 U.S.C. § 1983</strong> lawsuit.
                  Back up the video to cloud storage immediately after.
                </p>
              </div>
            </div>
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
                <h2 className="text-2xl font-bold mb-2">Bring Your Neighbors</h2>
                <p className="text-white/70 leading-relaxed">
                  One voice is easy to ignore. Ten coordinated voices are a headline. Fifty people
                  speaking together is a political earthquake. Show up early, sit together, and speak
                  one after another on the same issue. <strong>Make them answer to you.</strong>
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>
      </div>
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
