"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  Clock,
  Code,
  BarChart3,
  Users,
  Target,
  Briefcase,
  HeadphonesIcon,
  Check,
} from "lucide-react";
import Navigation from "@/components/landing/navigation";
import Footer from "@/components/landing/footer";

// --- Types ---

interface ChallengeArchetype {
  slug: string;
  name: string;
  description: string;
  scenarioId: string;
  challengeTagline: string | null;
  roleFamily: {
    slug: string;
    name: string;
  };
}

interface RoleFamilyGroup {
  slug: string;
  name: string;
  archetypes: ChallengeArchetype[];
}

interface CandidatesPageClientProps {
  groups: RoleFamilyGroup[];
}

interface Level {
  value: "junior" | "mid" | "senior" | "staff";
  label: string;
  years: string;
  description: string;
  expectations: string[];
}

// --- Role family styling ---

const FAMILY_STYLES: Record<
  string,
  { color: string; bg: string; border: string; icon: React.ElementType }
> = {
  engineering: {
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Code,
  },
  product_management: {
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Target,
  },
  data_science: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: BarChart3,
  },
  program_management: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Briefcase,
  },
  sales: {
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: Users,
  },
  customer_success: {
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    icon: HeadphonesIcon,
  },
};

// --- Components ---

function LevelPickerDialog({
  open,
  onOpenChange,
  archetype,
  levels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archetype: ChallengeArchetype | null;
  levels: Level[];
}) {
  const router = useRouter();
  const t = useTranslations("candidatesPage");
  const [selected, setSelected] = useState<string | null>(null);

  if (!archetype) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {t("dialog.title")}
          </DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            {t("dialog.subtitle", { name: archetype.name })}
          </p>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {levels.map((level) => {
            const isSelected = selected === level.value;
            return (
              <button
                key={level.value}
                onClick={() => setSelected(level.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {level.label}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {level.years}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {level.description}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {level.expectations.map((exp) => (
                        <li
                          key={exp}
                          className="text-xs text-slate-400 flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3 text-slate-300 shrink-0" />
                          {exp}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full mt-4 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold"
          size="lg"
          disabled={!selected}
          onClick={() => {
            if (selected) {
              router.push(
                `/invite/${archetype.scenarioId}?level=${selected}`
              );
            }
          }}
        >
          {t("dialog.startChallenge")}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ChallengeCard({
  archetype,
  onSelect,
}: {
  archetype: ChallengeArchetype;
  onSelect: () => void;
}) {
  const t = useTranslations("candidatesPage");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-white rounded-xl border border-slate-200 hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors">
            {t.has(`archetypes.${archetype.slug}.name`)
              ? t(`archetypes.${archetype.slug}.name`)
              : archetype.name}
          </h3>
        </div>

        {/* Task tagline */}
        <p className="text-sm text-slate-500 mb-5">
          {archetype.challengeTagline ??
            (t.has(`archetypes.${archetype.slug}.description`)
              ? t(`archetypes.${archetype.slug}.description`)
              : archetype.description)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{t("card.duration")}</span>
          </div>

          <Button
            size="sm"
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-semibold px-5 group-hover:shadow-md group-hover:shadow-primary/20 transition-all"
            onClick={onSelect}
          >
            {t("card.takeChallenge")}
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function RoleFamilySection({
  group,
  onSelectArchetype,
}: {
  group: RoleFamilyGroup;
  onSelectArchetype: (archetype: ChallengeArchetype) => void;
}) {
  const t = useTranslations("candidatesPage");
  const style = FAMILY_STYLES[group.slug] ?? FAMILY_STYLES.engineering;
  const Icon = style.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-16"
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center`}
        >
          <Icon className={`w-5 h-5 ${style.color}`} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {t.has(`roleFamilies.${group.slug}`)
              ? t(`roleFamilies.${group.slug}`)
              : group.name}
          </h2>
          <p className="text-sm text-slate-500">
            {t("section.challengesAvailable", {
              count: group.archetypes.length,
              plural: group.archetypes.length !== 1 ? "s" : "",
            })}
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {group.archetypes.map((archetype) => (
          <ChallengeCard
            key={archetype.slug}
            archetype={archetype}
            onSelect={() => onSelectArchetype(archetype)}
          />
        ))}
      </div>
    </motion.section>
  );
}

// --- Page ---

export function CandidatesPageClient({ groups }: CandidatesPageClientProps) {
  const t = useTranslations("candidatesPage");
  const totalChallenges = groups.reduce(
    (sum, g) => sum + g.archetypes.length,
    0
  );
  const [selectedArchetype, setSelectedArchetype] =
    useState<ChallengeArchetype | null>(null);

  const levels: Level[] = [
    {
      value: "junior",
      label: t("levels.junior.label"),
      years: t("levels.junior.years"),
      description: t("levels.junior.description"),
      expectations: t.raw("levels.junior.expectations") as string[],
    },
    {
      value: "mid",
      label: t("levels.mid.label"),
      years: t("levels.mid.years"),
      description: t("levels.mid.description"),
      expectations: t.raw("levels.mid.expectations") as string[],
    },
    {
      value: "senior",
      label: t("levels.senior.label"),
      years: t("levels.senior.years"),
      description: t("levels.senior.description"),
      expectations: t.raw("levels.senior.expectations") as string[],
    },
    {
      value: "staff",
      label: t("levels.staff.label"),
      years: t("levels.staff.years"),
      description: t("levels.staff.description"),
      expectations: t.raw("levels.staff.expectations") as string[],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation variant="dark" currentPage="candidates" />

      {/* Hero - Dark theme matching pricing page */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-[#020617]">
        {/* Animated background glow */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[200px] pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[200px] pointer-events-none"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-slate-400 text-sm">
                {t("hero.badge")}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              {t("hero.titleLine1")}
              <br />
              <span className="text-primary">{t("hero.titleLine2")}</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
              {t("hero.subtitle")}
            </p>

            {/* Quick stats */}
            <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{t("hero.stats.duration")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{t("hero.stats.teammates")}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>{t("hero.stats.report")}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Challenge Grid */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        {totalChallenges > 0 ? (
          groups.map((group) => (
            <RoleFamilySection
              key={group.slug}
              group={group}
              onSelectArchetype={setSelectedArchetype}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Code className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t("empty.title")}
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              {t("empty.description")}
            </p>
          </motion.div>
        )}
      </section>

      <Footer />

      {/* Level Picker Dialog */}
      <LevelPickerDialog
        open={selectedArchetype !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedArchetype(null);
        }}
        archetype={selectedArchetype}
        levels={levels}
      />
    </div>
  );
}
