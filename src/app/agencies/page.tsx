import type { Metadata } from "next";
import FederalAgenciesSection from "@/components/features/FederalAgenciesSection";

export const metadata: Metadata = {
  title: "Federal Agencies",
  description:
    "Track federal agency budgets, spending, and legislation. See how your tax dollars are allocated across government agencies.",
};

export default function AgenciesPage() {
  return (
    <div className="flex flex-col">
      <FederalAgenciesSection />
    </div>
  );
}
