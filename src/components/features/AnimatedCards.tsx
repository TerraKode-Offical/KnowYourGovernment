"use client";

import Link from "next/link";
import { motion, type Variants, type Transition } from "framer-motion";
import {
  ArrowRight,
  Vote,
  FileText,
  Users,
  BookOpen,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Vote,
  FileText,
  Users,
  BookOpen,
};

interface CardItem {
  icon: string;
  title: string;
  description: string;
  href: string;
  color: string;
  bg: string;
  border: string;
}

interface AnimatedCardsProps {
  items: CardItem[];
}

const cardTransition: Transition = { duration: 0.45, ease: "easeOut" };

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: cardTransition,
  },
};

export default function AnimatedCards({ items }: AnimatedCardsProps) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon] || Vote;
        return (
          <motion.div key={item.title} variants={cardVariants}>
            <Link
              href={item.href}
              className={`group flex flex-col gap-4 p-6 rounded-2xl border ${item.border} ${item.bg} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 h-full`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-sm`}
              >
                <Icon size={22} className={item.color} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#1B2A4A] text-base mb-1.5">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold ${item.color} group-hover:gap-2 transition-all`}
              >
                Explore <ArrowRight size={12} />
              </span>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
