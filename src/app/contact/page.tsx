import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Mail, Github, Globe, AlertTriangle } from "lucide-react";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contact Us — InformedVoter",
  description:
    "Get in touch with the InformedVoter team. Report corrections, ask questions, or contribute to our open-source project.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1B2A4A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <nav className="flex items-center gap-1.5 text-white/50 text-sm mb-6">
            <Link href="/" className="hover:text-white/80">Home</Link>
            <ChevronRight size={14} />
            <span className="text-white/80">Contact</span>
          </nav>

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <Mail size={26} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Contact Us</h1>
              <p className="text-white/60 mt-2 text-lg">
                Questions, corrections, or want to contribute? We&apos;d love to hear from you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        {/* Open Source Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-4">Open-Source Project</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            InformedVoter is an open-source project dedicated to providing nonpartisan civic
            information to every American. We believe that transparent, accessible civic tools
            should be built in the open — and we welcome contributions from developers,
            designers, data analysts, and civic-minded individuals.
          </p>

          <a
            href="https://github.com/iamscott53/InformedVoter"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-5 py-3 bg-[#1B2A4A] text-white rounded-xl
                       hover:bg-[#253a5e] transition-colors focus-visible:outline-none
                       focus-visible:ring-2 focus-visible:ring-[#1B2A4A]/50"
          >
            <Github size={20} />
            <span className="font-semibold text-sm">View on GitHub</span>
          </a>

          <p className="text-sm text-gray-500 mt-4 leading-relaxed">
            Found a bug? Have a feature idea? Open an issue or submit a pull request on GitHub.
            We review all contributions and appreciate every bit of help.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-[#1B2A4A] mb-6">Get in Touch</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="mailto:info@knowyourgov.us"
              className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl
                         hover:bg-blue-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">General inquiries</p>
                <p className="text-sm font-semibold text-[#1B2A4A]">info@knowyourgov.us</p>
              </div>
            </a>

            <a
              href="mailto:corrections@knowyourgov.us"
              className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl
                         hover:bg-amber-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Report a correction</p>
                <p className="text-sm font-semibold text-[#1B2A4A]">corrections@knowyourgov.us</p>
              </div>
            </a>

            <a
              href="https://github.com/iamscott53/InformedVoter"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl
                         hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                <Github size={18} className="text-gray-700" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Source code & issues</p>
                <p className="text-sm font-semibold text-[#1B2A4A]">GitHub Repository</p>
              </div>
            </a>

            <a
              href="https://knowyourgov.us"
              className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl
                         hover:bg-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                <Globe size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Website</p>
                <p className="text-sm font-semibold text-[#1B2A4A]">knowyourgov.us</p>
              </div>
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            InformedVoter is not affiliated with any government agency or political organization.
          </p>
        </div>
      </div>
    </div>
  );
}
