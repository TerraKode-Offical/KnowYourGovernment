"use client";

import { useState, useCallback } from "react";
import {
  X,
  Loader2,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Users,
} from "lucide-react";

// ─────────────────────────────────────────────
// Option lists
// ─────────────────────────────────────────────

const PARTY_OPTIONS = [
  "Democrat",
  "Republican",
  "Independent",
  "Libertarian",
  "Green Party",
  "No Party Preference",
  "Other",
] as const;

const AGE_OPTIONS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

const ETHNICITY_OPTIONS = [
  "White/Caucasian",
  "Black/African American",
  "Hispanic/Latino",
  "Asian/Pacific Islander",
  "Native American/Alaska Native",
  "Middle Eastern/North African",
  "Multiracial",
  "Other",
  "Prefer not to say",
] as const;

const GENDER_OPTIONS = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

const EDUCATION_OPTIONS = [
  "High school or less",
  "Some college",
  "Associate's degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctoral/Professional degree",
] as const;

const VOTING_FREQUENCY_OPTIONS = [
  "Every election",
  "Most elections",
  "Occasionally",
  "Rarely/Never",
  "First-time voter",
] as const;

const ISSUE_OPTIONS = [
  "Economy & Jobs",
  "Healthcare",
  "Education",
  "Environment & Climate",
  "Immigration",
  "Gun Policy",
  "Criminal Justice",
  "Foreign Policy",
  "Social Security & Medicare",
  "Civil Rights",
  "Housing & Cost of Living",
  "Infrastructure",
] as const;

const REFERRAL_OPTIONS = [
  "Social media",
  "Search engine",
  "Friend or family",
  "News article",
  "Other",
] as const;

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface DemographicSurveyModalProps {
  profileToken: string;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────

interface FormData {
  partyAffiliation: string;
  ageRange: string;
  ethnicity: string;
  gender: string;
  zipCode: string;
  educationLevel: string;
  communityService: boolean | null;
  votingFrequency: string;
  issuesOfInterest: string[];
  referralSource: string;
}

const INITIAL_FORM: FormData = {
  partyAffiliation: "",
  ageRange: "",
  ethnicity: "",
  gender: "",
  zipCode: "",
  educationLevel: "",
  communityService: null,
  votingFrequency: "",
  issuesOfInterest: [],
  referralSource: "",
};

type SubmitState = "idle" | "submitting" | "success" | "error";

// ─────────────────────────────────────────────
// Sub-components for each step
// ─────────────────────────────────────────────

function RadioGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-700 mb-2">
        {label}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(value === opt ? "" : opt)}
            className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
              value === opt
                ? "border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A] font-medium"
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MultiSelect({
  label,
  subtitle,
  options,
  value,
  onChange,
}: {
  label: string;
  subtitle?: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]
    );
  };

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-gray-700 mb-1">
        {label}
      </legend>
      {subtitle && (
        <p className="text-xs text-gray-400 mb-2">{subtitle}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-2 text-sm rounded-lg border text-left transition-colors ${
              value.includes(opt)
                ? "border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A] font-medium"
                : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// ─────────────────────────────────────────────
// Steps
// ─────────────────────────────────────────────

const STEP_TITLES = [
  "About You",
  "Your Background",
  "Civic Engagement",
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function DemographicSurveyModal({
  profileToken,
  onClose,
}: DemographicSurveyModalProps) {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [step, setStep] = useState(0);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    setSubmitState("submitting");
    try {
      const res = await fetch("/api/subscribe/demographics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileToken,
          ...form,
        }),
      });

      if (!res.ok) {
        setSubmitState("error");
        return;
      }

      setSubmitState("success");
      setTimeout(onClose, 2000);
    } catch {
      setSubmitState("error");
    }
  }, [profileToken, form, onClose]);

  const totalSteps = STEP_TITLES.length;

  // ── Success state ──
  if (submitState === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h3>
          <p className="text-gray-500 text-sm">
            Your responses help us deliver more relevant civic information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1B2A4A]/10 rounded-lg flex items-center justify-center">
              <Users size={18} className="text-[#1B2A4A]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Help us know you better
              </h2>
              <p className="text-xs text-gray-400">
                All fields are optional &middot; Step {step + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
            aria-label="Close survey"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1B2A4A] rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          {step === 0 && (
            <>
              <RadioGroup
                label="Party Affiliation"
                options={PARTY_OPTIONS}
                value={form.partyAffiliation}
                onChange={(v) => updateField("partyAffiliation", v)}
              />
              <RadioGroup
                label="Age Range"
                options={AGE_OPTIONS}
                value={form.ageRange}
                onChange={(v) => updateField("ageRange", v)}
              />
              <RadioGroup
                label="Gender"
                options={GENDER_OPTIONS}
                value={form.gender}
                onChange={(v) => updateField("gender", v)}
              />
            </>
          )}

          {step === 1 && (
            <>
              <RadioGroup
                label="Ethnicity"
                options={ETHNICITY_OPTIONS}
                value={form.ethnicity}
                onChange={(v) => updateField("ethnicity", v)}
              />
              <RadioGroup
                label="Education Level"
                options={EDUCATION_OPTIONS}
                value={form.educationLevel}
                onChange={(v) => updateField("educationLevel", v)}
              />
              <div>
                <label
                  htmlFor="zip"
                  className="text-sm font-semibold text-gray-700 mb-2 block"
                >
                  Zip Code
                </label>
                <input
                  id="zip"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.zipCode}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  placeholder="e.g. 90210"
                  className="w-full sm:w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none
                             focus:border-[#1B2A4A]/40 focus:ring-1 focus:ring-[#1B2A4A]/20"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <RadioGroup
                label="How often do you vote?"
                options={VOTING_FREQUENCY_OPTIONS}
                value={form.votingFrequency}
                onChange={(v) => updateField("votingFrequency", v)}
              />
              <MultiSelect
                label="Issues you care about"
                subtitle="Select all that apply"
                options={ISSUE_OPTIONS}
                value={form.issuesOfInterest}
                onChange={(v) => updateField("issuesOfInterest", v)}
              />
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Would you like to be contacted about community service
                  opportunities?
                </label>
                <div className="flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() =>
                        updateField(
                          "communityService",
                          form.communityService === val ? null : val
                        )
                      }
                      className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                        form.communityService === val
                          ? "border-[#1B2A4A] bg-[#1B2A4A]/5 text-[#1B2A4A] font-medium"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {val ? "Yes, please!" : "No thanks"}
                    </button>
                  ))}
                </div>
              </div>
              <RadioGroup
                label="How did you hear about InformedVoter?"
                options={REFERRAL_OPTIONS}
                value={form.referralSource}
                onChange={(v) => updateField("referralSource", v)}
              />
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip for now
            </button>
          )}

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="inline-flex items-center gap-1 px-5 py-2 text-sm font-semibold bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2a3f6a] transition-colors"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitState === "submitting"}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#1B2A4A] text-white rounded-lg hover:bg-[#2a3f6a] transition-colors disabled:opacity-50"
            >
              {submitState === "submitting" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : submitState === "error" ? (
                "Retry"
              ) : (
                "Submit"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
