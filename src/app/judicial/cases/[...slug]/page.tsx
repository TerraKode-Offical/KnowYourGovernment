import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Scale, Users, ExternalLink } from "lucide-react";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CasePageProps {
  params: Promise<{ slug: string[] }>;
}

// ─────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────

export async function generateMetadata({
  params,
}: CasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const oyezId = slug.join("/");
  try {
    const courtCase = await prisma.courtCase.findUnique({
      where: { oyezId },
      select: { name: true },
    });
    if (!courtCase) return { title: "Case Not Found" };
    return {
      title: courtCase.name,
      description: `Supreme Court case: ${courtCase.name}. Read the plain-English summary, vote breakdown, and full analysis.`,
    };
  } catch {
    return { title: "Case Not Found" };
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { slug } = await params;
  const oyezId = slug.join("/"); // e.g. "2024/23-191"

  let courtCase;
  try {
    courtCase = await prisma.courtCase.findUnique({
      where: { oyezId },
      include: {
        votes: {
          include: {
            justice: {
              select: {
                id: true,
                oyezIdentifier: true,
                name: true,
                photoUrl: true,
                roleTitle: true,
              },
            },
          },
        },
      },
    });
  } catch {
    notFound();
  }

  if (!courtCase) notFound();

  const majorityVotes = courtCase.votes.filter(
    (v) => v.voteType === "majority"
  );
  const minorityVotes = courtCase.votes.filter(
    (v) => v.voteType === "minority"
  );

  const statusLabel =
    courtCase.status === "DECIDED"
      ? "Decided"
      : courtCase.status === "ARGUED"
        ? "Argued"
        : "Cert Granted";
  const statusColor =
    courtCase.status === "DECIDED"
      ? "bg-green-100 text-green-700"
      : courtCase.status === "ARGUED"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <section className="bg-[#1B2A4A] text-white py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/judicial"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Supreme Court
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-mono text-white/50">
              {courtCase.docketNumber}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}
            >
              {statusLabel}
              {courtCase.majorityVotes && courtCase.minorityVotes
                ? ` ${courtCase.majorityVotes}-${courtCase.minorityVotes}`
                : ""}
            </span>
            <span className="text-xs text-white/40">
              {courtCase.term} Term
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold mb-3">
            {courtCase.name}
          </h1>

          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            {courtCase.dateArgued && (
              <span>
                Argued:{" "}
                {new Date(courtCase.dateArgued).toLocaleDateString()}
              </span>
            )}
            {courtCase.dateDecided && (
              <span>
                Decided:{" "}
                {new Date(courtCase.dateDecided).toLocaleDateString()}
              </span>
            )}
            {courtCase.justiaUrl && (
              <a
                href={courtCase.justiaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200"
              >
                Full opinion <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* AI Summary */}
      {courtCase.aiSummary && (
        <section className="bg-blue-50 border-b border-blue-200 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={18} className="text-blue-700" />
              <h2 className="text-lg font-bold text-blue-900">
                Plain English Summary
              </h2>
              <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                AI Generated
              </span>
            </div>
            <p className="text-sm text-blue-900/80 leading-relaxed">
              {courtCase.aiSummary}
            </p>
          </div>
        </section>
      )}

      {/* AI Impact Analysis */}
      {courtCase.aiImpactAnalysis && (
        <section className="bg-amber-50 border-b border-amber-200 py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg font-bold text-amber-900 mb-3">
              What This Means for You
            </h2>
            <p className="text-sm text-amber-900/80 leading-relaxed">
              {courtCase.aiImpactAnalysis}
            </p>
          </div>
        </section>
      )}

      {/* Vote Breakdown */}
      {courtCase.votes.length > 0 && (
        <section className="bg-white border-b border-gray-200 py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-6">
              <Users size={20} className="text-[#1B2A4A]" />
              <h2 className="text-xl font-bold text-[#1B2A4A]">
                How the Justices Voted
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Majority */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-3">
                  Majority ({majorityVotes.length})
                </h3>
                <div className="space-y-2">
                  {majorityVotes.map((v) => (
                    <Link
                      key={v.id}
                      href={`/judicial/justices/${v.justice.oyezIdentifier}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-green-200 bg-green-50
                                 hover:shadow-sm transition-shadow"
                    >
                      {v.justice.photoUrl ? (
                        <Image
                          src={v.justice.photoUrl}
                          alt={v.justice.name}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-800">
                          {v.justice.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[#1B2A4A]">
                          {v.justice.name}
                        </p>
                        {v.opinionType && v.opinionType !== "none" && (
                          <p className="text-xs text-gray-500 capitalize">
                            {v.opinionType === "majority"
                              ? "Wrote the majority opinion"
                              : v.opinionType}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Dissent */}
              {minorityVotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-3">
                    Dissent ({minorityVotes.length})
                  </h3>
                  <div className="space-y-2">
                    {minorityVotes.map((v) => (
                      <Link
                        key={v.id}
                        href={`/judicial/justices/${v.justice.oyezIdentifier}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50
                                   hover:shadow-sm transition-shadow"
                      >
                        {v.justice.photoUrl ? (
                          <img
                            src={v.justice.photoUrl}
                            alt={v.justice.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-xs font-bold text-red-800">
                            {v.justice.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-[#1B2A4A]">
                            {v.justice.name}
                          </p>
                          {v.opinionType && v.opinionType !== "none" && (
                            <p className="text-xs text-gray-500 capitalize">
                              {v.opinionType === "dissent"
                                ? "Wrote the dissent"
                                : v.opinionType}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Question Presented */}
      {courtCase.question && (
        <section className="bg-gray-50 border-b border-gray-200 py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              Question Presented
            </h2>
            <div
              className="prose prose-sm prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(courtCase.question) }}
            />
          </div>
        </section>
      )}

      {/* Facts of the Case */}
      {courtCase.factsOfTheCase && (
        <section className="bg-white border-b border-gray-200 py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              Facts of the Case
            </h2>
            <div
              className="prose prose-sm prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(courtCase.factsOfTheCase) }}
            />
          </div>
        </section>
      )}

      {/* Conclusion / Ruling */}
      {courtCase.conclusion && (
        <section className="bg-gray-50 py-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4">
              Opinion & Ruling
            </h2>
            <div
              className="prose prose-sm prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(courtCase.conclusion) }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
