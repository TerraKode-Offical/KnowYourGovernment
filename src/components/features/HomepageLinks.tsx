"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, BarChart3, AlertCircle, Newspaper } from "lucide-react";
import { useUserState } from "@/hooks/useUserState";
import AnimatedCards from "@/components/features/AnimatedCards";

export function ExploreStateButton() {
  const { userState, isHydrating } = useUserState();

  if (isHydrating) {
    return (
      <span className="inline-flex items-center gap-2 bg-white/70 text-[#1B2A4A] font-semibold px-6 py-3 rounded-lg shadow-lg">
        Explore Your State <ArrowRight size={16} />
      </span>
    );
  }

  // If no state selected, scroll to the map so the user can pick one
  const href = userState ? `/state/${userState}` : "#select-state";

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 bg-white text-[#1B2A4A] font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
    >
      {userState ? "Explore Your State" : "Select Your State"} <ArrowRight size={16} />
    </Link>
  );
}

interface QuickAction {
  icon: string;
  title: string;
  description: string;
  path: string;
  color: string;
  bg: string;
  border: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: "Vote",
    title: "Upcoming Elections",
    description: "See what elections are coming up in your area and what's on the ballot.",
    path: "/elections",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    icon: "FileText",
    title: "Active Bills",
    description: "Track federal and state legislation that affects your community.",
    path: "/bills",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-100",
  },
  {
    icon: "Users",
    title: "Your Representatives",
    description: "Find out who represents you in Congress and your state legislature.",
    path: "/representatives",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    icon: "BookOpen",
    title: "How to Vote",
    description: "Registration deadlines, polling locations, absentee ballots, and your rights.",
    path: "/voter-info",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
];

export function QuickActions() {
  const { userState, isHydrating } = useUserState();

  const items = QUICK_ACTIONS.map((a) => ({
    ...a,
    href: isHydrating
      ? "#"
      : userState
        ? `/state/${userState}${a.path}`
        : "/#select-state",
  }));

  return <AnimatedCards items={items} />;
}

const VOTER_ESSENTIALS = [
  {
    icon: ShieldCheck,
    title: "Your Rights at the Polls",
    description: "Know what you're entitled to as a voter and what to do if your rights are violated.",
    path: "/voter-info#rights",
  },
  {
    icon: BarChart3,
    title: "Understanding Campaign Finance",
    description: "See who's funding political campaigns and how dark money influences elections.",
    path: "/bills",
  },
  {
    icon: AlertCircle,
    title: "Spotting Hidden Riders",
    description: "Learn how unrelated provisions get attached to popular bills — and how to spot them.",
    path: "/bills",
  },
  {
    icon: Newspaper,
    title: "Media Literacy for Voters",
    description: "Tips for evaluating political news and distinguishing fact from spin.",
    path: "/about",
  },
];

export function VoterEssentials() {
  const { userState, isHydrating } = useUserState();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {VOTER_ESSENTIALS.map((item) => {
        const Icon = item.icon;
        const href = item.path.startsWith("/about")
          ? item.path
          : isHydrating
            ? "#"
            : userState
              ? `/state/${userState}${item.path}`
              : "/#select-state";
        return (
          <Link
            key={item.title}
            href={href}
            className="group flex flex-col gap-3 p-5 rounded-xl border border-gray-200 bg-gray-50 hover:border-[#1B2A4A]/30 hover:bg-[#1B2A4A]/5 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-lg bg-[#1B2A4A]/10 flex items-center justify-center">
              <Icon size={20} className="text-[#1B2A4A]" />
            </div>
            <h3 className="font-semibold text-[#1B2A4A] group-hover:underline leading-snug">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed flex-1">
              {item.description}
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B2A4A]/70 group-hover:gap-2 transition-all">
              Read more <ArrowRight size={12} />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
