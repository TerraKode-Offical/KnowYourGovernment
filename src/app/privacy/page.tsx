import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy — InformedVoter",
  description:
    "InformedVoter privacy policy. Learn how we handle your data, cookies, and personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Privacy Policy</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
              <p className="text-white/60 mt-2 text-lg">
                Your privacy matters. Here is how we handle your data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-8">

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">No Tracking or Ads</h2>
            <p className="text-gray-600 leading-relaxed">
              InformedVoter does not use third-party analytics trackers, advertising networks,
              or tracking pixels. We do not serve ads of any kind. Your browsing activity on
              this site is not monitored, profiled, or sold to advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">Public Data Sources</h2>
            <p className="text-gray-600 leading-relaxed">
              All civic information displayed on InformedVoter is sourced from publicly available
              government APIs and official data providers, including Congress.gov, the Federal
              Election Commission (FEC), LegiScan, and the Google Civic Information API. We
              aggregate and present this public information — we do not create or manufacture
              political data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">Cookies</h2>
            <p className="text-gray-600 leading-relaxed">
              InformedVoter uses a single cookie to remember your state preference (e.g., &ldquo;FL&rdquo;
              or &ldquo;CA&rdquo;) so we can show you relevant local information. This cookie contains
              only your two-letter state abbreviation, expires after one year, and is not shared
              with any third party. No other cookies are set by this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">No Personal Data Collection</h2>
            <p className="text-gray-600 leading-relaxed">
              We do not collect, store, or process any personal information. We do not require
              account creation, email addresses, or any form of registration. There are no
              contact forms that transmit personal data to our servers. Your visit to
              InformedVoter is anonymous.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">Your Data Is Never Sold</h2>
            <p className="text-gray-600 leading-relaxed">
              InformedVoter does not sell, rent, trade, or otherwise share any user data with
              third parties. Since we do not collect personal data, there is nothing to sell.
              We are committed to keeping this platform free from commercial data exploitation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">State Selection</h2>
            <p className="text-gray-600 leading-relaxed">
              You choose your state manually by clicking the map or selecting from the dropdown.
              Your selection is stored in a cookie on your device so it persists across visits.
              We do not detect your location, do not look up your IP address, and do not send
              your location to any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1B2A4A] mb-3">Changes to This Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              If we make changes to this privacy policy, we will update this page. Because we
              do not collect email addresses, we cannot notify you directly — we encourage you
              to review this page periodically.
            </p>
          </section>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-400">
              Last updated: March 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
