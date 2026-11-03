import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Mic,
  Scale,
  Video,
  Gavel,
  ShieldAlert,
  Users,
  BookOpen,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import AnimatedSection from "@/components/features/AnimatedSection";

export const metadata: Metadata = {
  title: "Rules for Speaking at Public Meetings",
  description:
    "Know your First Amendment rights at city council meetings. Two approaches: professional and assertive. Case law, recording rights, and how to protect yourself.",
};

// ─────────────────────────────────────────────
// Case law data
// ─────────────────────────────────────────────

const KEY_CASES_PROFESSIONAL = [
  {
    name: "City of Madison v. Wisconsin Employment Relations Comm'n",
    citation: "429 U.S. 167 (1976)",
    summary:
      "Once a government body opens a meeting to the public, it may not exclude speakers based on the content of their speech. The government cannot give one side of a public question a monopoly.",
  },
  {
    name: "White v. City of Norwalk",
    citation: "900 F.2d 1421 (9th Cir. 1990)",
    summary:
      "A speaker may not be removed simply because the moderator disagrees with the viewpoint expressed. Removal is only permissible if remarks actually disrupt, disturb, or impede the meeting.",
  },
  {
    name: "McDonough v. Garcia",
    citation: "116 F.4th 1319 (11th Cir. 2024) (en banc)",
    summary:
      "City council meetings are limited public forums where speech must be restricted in a reasonable and viewpoint-neutral manner.",
  },
];

const KEY_CASES_ASSERTIVE = [
  {
    name: "Cohen v. California",
    citation: "403 U.S. 15 (1971)",
    summary:
      'Wearing a jacket bearing "Fuck the Draft" in a public courthouse was protected speech. "One man\'s vulgarity is another\'s lyric." The state cannot criminalize emotive expression simply because it contains profanity.',
  },
  {
    name: "Lewis v. City of New Orleans",
    citation: "415 U.S. 130 (1974)",
    summary:
      "The Supreme Court struck down a law criminalizing insulting language toward police officers, holding such statutes sweep too broadly and criminalize protected speech.",
  },
  {
    name: "Acosta v. City of Costa Mesa",
    citation: "718 F.3d 800 (9th Cir. 2013)",
    summary:
      'Speech in a city council meeting must "actually disrupt" the meeting before a person may be removed. "Actual disruption means actual disruption. It does not mean constructive disruption, technical disruption, virtual disruption, nunc pro tunc disruption, or imaginary disruption."',
  },
  {
    name: "Ison v. Madison Local School District",
    citation: "993 F.3d 446 (6th Cir. 2021)",
    summary:
      'Invalidated a policy prohibiting "abusive" and "antagonistic" comments, noting that speech opposing the government board is core protected speech.',
  },
];

const RECORDING_CASES = [
  {
    name: "Glik v. Cunniffe",
    citation: "655 F.3d 78 (1st Cir. 2011)",
    summary:
      "Citizens have a clearly established First Amendment right to film police officers in public places. The court stated this right is 'fundamental and virtually self-evident.'",
  },
  {
    name: "ACLU of Illinois v. Alvarez",
    citation: "679 F.3d 583 (7th Cir. 2012)",
    summary:
      "The act of making an audio or audiovisual recording is 'necessarily included within the First Amendment's guarantee of speech and press rights as a corollary of the right to disseminate the resulting recording.'",
  },
  {
    name: "Fields v. City of Philadelphia",
    citation: "862 F.3d 353 (3d Cir. 2017)",
    summary:
      "The Third Circuit joined the consensus, holding there is a First Amendment right to record police activity in public. This principle extends to public meetings.",
  },
  {
    name: "Fordyce v. City of Seattle",
    citation: "55 F.3d 436 (9th Cir. 1995)",
    summary:
      "The Ninth Circuit recognized a First Amendment right to film matters of public interest, including government proceedings.",
  },
];

const FIGHTING_WORDS_CASES = [
  {
    name: "Chaplinsky v. New Hampshire",
    citation: "315 U.S. 568 (1942)",
    summary:
      "Established the fighting words doctrine: words 'which by their very utterance inflict injury or tend to incite an immediate breach of the peace.' However, this doctrine has been significantly narrowed since.",
  },
  {
    name: "R.A.V. v. City of St. Paul",
    citation: "505 U.S. 377 (1992)",
    summary:
      "The government cannot single out particular viewpoints for punishment, even within categories of proscribable speech like fighting words. No Supreme Court decision since Chaplinsky has upheld a fighting words conviction.",
  },
  {
    name: "Virginia v. Black",
    citation: "538 U.S. 343 (2003)",
    summary:
      "Modern courts focus on whether speech constitutes a 'true threat' rather than fighting words. Political criticism, even with profanity, rarely qualifies.",
  },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function RulesPage() {
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
            <span className="text-white/80">Rules for Speaking</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Mic size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Rules for Speaking</h1>
              <p className="text-white/60 mt-2 text-lg">
                Know your rights. Speak with power. Make them listen.
              </p>
            </div>
          </div>

          <p className="text-white/70 leading-relaxed max-w-2xl text-base">
            City council meetings are <strong>limited public forums</strong>. That means you have
            First Amendment rights — but the government can set reasonable time, place, and manner
            rules. This page gives you two proven approaches: the professional path and the
            constitutionally assertive path. Both are legal. Both work. Choose what fits your style.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* ── Recording Warning ── */}
        <AnimatedSection delay={0}>
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <Video size={24} className="text-amber-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-900 mb-2">
                  Record Everything. Protect Yourself.
                </h2>
                <p className="text-amber-800 leading-relaxed mb-4">
                  Before you say a word, <strong>start recording on your phone</strong>. Keep it recording
                  the entire meeting — especially while you are speaking. If they violate your rights,
                  cut you off illegally, or remove you for protected speech, that recording is your evidence.
                </p>
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <Video size={16} className="shrink-0 mt-0.5" />
                    <span>Record the meeting from the moment you arrive until you leave.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Video size={16} className="shrink-0 mt-0.5" />
                    <span>If you are speaking, make sure your phone is positioned to capture both you and the officials.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Video size={16} className="shrink-0 mt-0.5" />
                    <span>If they tell you to stop recording, politely remind them: public meetings are subject to First Amendment recording rights. Do not let them intimidate you.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Video size={16} className="shrink-0 mt-0.5" />
                    <span>Back up the video to cloud storage immediately after the meeting.</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-white/60 rounded-lg text-xs text-amber-900">
                  <strong>Why this matters:</strong> If officials remove you for protected speech,
                  that recording is the foundation of a <strong>42 U.S.C. § 1983</strong> civil rights lawsuit.
                  Without it, it is your word against theirs — and they write the minutes.
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Two Approaches ── */}
        <AnimatedSection delay={0.05}>
          <section>
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6 flex items-center gap-3">
              <Scale size={24} className="text-blue-600" />
              Two Ways to Speak
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Professional */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <BookOpen size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1B2A4A]">The Professional</h3>
                    <p className="text-xs text-gray-500">Disarm them with courtesy</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <span>Introduce yourself: name, neighborhood, and that you are a constituent.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Thank the council for their public service — even if you disagree with them.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <span>State your concern clearly, cite facts, and reference specific agenda items.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">4</span>
                    <span>Ask direct questions they must answer on the record.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">5</span>
                    <span>End by stating you will follow up and that you have organized neighbors attending.</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-800">
                  <strong>Best for:</strong> First-time speakers, building long-term relationships,
                  and situations where you will be returning to multiple meetings.
                </div>
              </div>

              {/* Assertive */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                    <ShieldAlert size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1B2A4A]">The First Amendment</h3>
                    <p className="text-xs text-gray-500">You have rights. Use them.</p>
                  </div>
                </div>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <span>You do not need to be polite to exercise a constitutional right.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Profanity used as expressive or political speech is <strong>protected</strong> — see <em>Cohen v. California</em>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <span>They cannot remove you for being offensive or critical. Only <strong>actual disruption</strong> justifies removal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0">4</span>
                    <span>If they threaten removal, calmly state: "This is a limited public forum. My speech is protected. I am not disrupting the meeting."</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center shrink-0">5</span>
                    <span>If removed anyway, announce: "I am being removed for protected speech. This is being recorded. I will pursue 42 U.S.C. § 1983 remedies."</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-rose-50 rounded-lg text-xs text-rose-800">
                  <strong>Best for:</strong> Urgent issues, officials who have ignored constituents,
                  or when you need to make it clear you know your rights and will not be bullied.
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Protected Amendments & Laws ── */}
        <AnimatedSection delay={0.1}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6 flex items-center gap-3">
              <Gavel size={24} className="text-emerald-600" />
              Your Protected Rights & Applicable Laws
            </h2>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <h3 className="font-bold text-emerald-900 mb-2">First Amendment (U.S. Constitution)</h3>
                <p className="text-sm text-emerald-800 leading-relaxed">
                  "Congress shall make no law... abridging the freedom of speech, or of the press;
                  or the right of the people peaceably to assemble, and to petition the Government
                  for a redress of grievances." This applies to state and local governments through
                  the Fourteenth Amendment.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">42 U.S.C. § 1983 — Civil Action for Deprivation of Rights</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  The primary federal statute for suing state and local officials who violate your
                  constitutional rights. If you are removed from a public meeting for protected speech,
                  you can sue for damages and injunctive relief. Officials may also be denied
                  qualified immunity if the right was "clearly established" — which it is.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">State Sunshine / Open Meetings Laws</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  All 50 states have open meetings laws governing public bodies. Many explicitly
                  guarantee the right to attend, speak, and record. Examples:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 list-disc list-inside">
                  <li>California Brown Act (Gov't Code § 54954.3) — guarantees public comment</li>
                  <li>Georgia Open Meetings Act — "Visual and sound recording during open meetings shall be permitted."</li>
                  <li>Florida Sunshine Law — citizens may not be prohibited from videotaping public meetings with nondisruptive devices</li>
                  <li>Illinois Open Meetings Act (5 ILCS 120/2.06(g)) — public comment rights</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">Fourteenth Amendment — Due Process & Equal Protection</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Protects against arbitrary enforcement of speech rules. If the council lets supporters
                  speak freely but cuts off critics, that is viewpoint discrimination — the "greatest
                  First Amendment sin" — and violates the Equal Protection Clause.
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Case Law: General Speech Rights ── */}
        <AnimatedSection delay={0.15}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4 flex items-center gap-3">
              <Scale size={22} className="text-blue-600" />
              Key Precedents: General Speech Rights at Public Meetings
            </h2>
            <div className="space-y-4">
              {KEY_CASES_PROFESSIONAL.map((c) => (
                <div key={c.name} className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <h3 className="font-semibold text-blue-900 text-sm">{c.name}</h3>
                  <p className="text-xs text-blue-700 mt-0.5 font-mono">{c.citation}</p>
                  <p className="text-sm text-blue-800 mt-2 leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Case Law: Profanity & Assertive Speech ── */}
        <AnimatedSection delay={0.2}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4 flex items-center gap-3">
              <ShieldAlert size={22} className="text-rose-600" />
              Key Precedents: Profanity, Criticism & Removal
            </h2>
            <div className="space-y-4">
              {KEY_CASES_ASSERTIVE.map((c) => (
                <div key={c.name} className="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                  <h3 className="font-semibold text-rose-900 text-sm">{c.name}</h3>
                  <p className="text-xs text-rose-700 mt-0.5 font-mono">{c.citation}</p>
                  <p className="text-sm text-rose-800 mt-2 leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Fighting Words Doctrine ── */}
        <AnimatedSection delay={0.25}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4 flex items-center gap-3">
              <AlertTriangle size={22} className="text-amber-600" />
              The "Fighting Words" Doctrine — Narrow and Nearly Dead
            </h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              "Fighting words" are a narrowly limited category of unprotected speech. Today, speech
              must be a <strong>direct personal insult directed at a specific individual</strong> that is
              <strong> likely to provoke an immediate violent response</strong>. General profanity,
              political criticism, and offensive language directed at public officials <strong>do not qualify</strong>.
            </p>
            <div className="space-y-4">
              {FIGHTING_WORDS_CASES.map((c) => (
                <div key={c.name} className="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                  <h3 className="font-semibold text-amber-900 text-sm">{c.name}</h3>
                  <p className="text-xs text-amber-700 mt-0.5 font-mono">{c.citation}</p>
                  <p className="text-sm text-amber-800 mt-2 leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Recording Rights ── */}
        <AnimatedSection delay={0.3}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-4 flex items-center gap-3">
              <Video size={22} className="text-purple-600" />
              Your Right to Record
            </h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              A growing consensus of federal circuit courts recognizes a <strong>First Amendment right
              to record government officials</strong> engaged in their duties in public places. This
              right extends to public meetings. Many state open meetings laws explicitly guarantee
              recording rights.
            </p>
            <div className="space-y-4">
              {RECORDING_CASES.map((c) => (
                <div key={c.name} className="p-4 rounded-xl bg-purple-50/50 border border-purple-100">
                  <h3 className="font-semibold text-purple-900 text-sm">{c.name}</h3>
                  <p className="text-xs text-purple-700 mt-0.5 font-mono">{c.citation}</p>
                  <p className="text-sm text-purple-800 mt-2 leading-relaxed">{c.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </AnimatedSection>

        {/* ── Grassroots CTA ── */}
        <AnimatedSection delay={0.35}>
          <section className="bg-[#1B2A4A] text-white rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <Users size={24} className="text-[#D69E2E]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Bring Your Neighbors. Make Them Listen.</h2>
                <p className="text-white/70 leading-relaxed mb-4">
                  One person speaking is a crank. Ten people speaking is a movement. Fifty people
                  speaking is a political crisis for them. Show up early. Sit together. Speak one
                  after another on the same issue. Coordinate your message. Be respectful but
                  unmovable. And <strong>record everything</strong>.
                </p>
                <p className="text-white/70 leading-relaxed">
                  City councils are not used to being held accountable. They are used to empty
                  chambers and rubber stamps. <strong>Change that.</strong>
                </p>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Templates CTA ── */}
        <AnimatedSection delay={0.35}>
          <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                <Mic size={24} className="text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1B2A4A] mb-2">Need a Script?</h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  We have pre-written, research-backed speaking templates for the most common city council
                  issues: Flock cameras, data centers, zoning overdevelopment, and police budgets.
                  Each template comes in both Professional and First Amendment tones.
                </p>
                <Link
                  href="/local/templates"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors"
                >
                  Browse Templates <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* ── Disclaimer ── */}
        <AnimatedSection delay={0.4}>
          <section className="bg-gray-100 rounded-2xl p-6 text-center">
            <p className="text-xs text-gray-500 leading-relaxed max-w-2xl mx-auto">
              This page is for educational purposes and does not constitute legal advice. Laws vary
              by jurisdiction and change over time. If your rights are violated, consult a qualified
              civil rights attorney. Case summaries are simplified for readability; read the full
              opinions for complete holdings.
            </p>
          </section>
        </AnimatedSection>
      </div>
    </div>
  );
}
