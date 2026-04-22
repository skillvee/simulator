"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  Bot,
  Sparkles,
  AppWindow,
  ExternalLink,
  Loader2,
  Clock,
  Wifi,
  Coffee,
} from "lucide-react";

interface ScenarioData {
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
  simulationDepth: string;
}

const DEPTH_TIMING: Record<string, { target: number; max: number }> = {
  short: { target: 30, max: 60 },
  medium: { target: 45, max: 75 },
  long: { target: 60, max: 90 },
};

interface WelcomePageClientProps {
  assessmentId: string;
  scenario: ScenarioData;
}

export function WelcomePageClient({
  assessmentId,
  scenario,
}: WelcomePageClientProps) {
  const router = useRouter();
  const t = useTranslations("welcome");
  const [step, setStep] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const totalSteps = 3;

  const handleStart = async () => {
    setIsLaunching(true);
    setStartError(null);
    try {
      const res = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setStartError(data?.error || t("errors.startFailed"));
        setIsLaunching(false);
        return;
      }
      router.push(`/assessments/${assessmentId}/work`);
    } catch {
      setStartError(t("errors.networkError"));
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#020617] text-white font-sans overflow-hidden">
      {/* Left Panel - Dynamic Narrative */}
      <div className="lg:w-3/5 p-8 lg:p-24 flex flex-col justify-between relative min-h-[50vh] lg:min-h-screen">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-20%] w-full h-full bg-primary/20 rounded-full blur-[150px] pointer-events-none"
        />

        <header className="relative z-10">
          <Image
            src="/skillvee-logo.png"
            alt="Skillvee"
            width={120}
            height={32}
            className="object-contain brightness-0 invert"
            style={{ width: "auto", height: "auto" }}
            priority
          />
        </header>

        <main className="relative z-10 py-12 lg:py-20">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1-left"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <h2 className="text-5xl lg:text-[90px] font-black tracking-tight leading-[0.85] text-primary">
                  {t("step1.leftPanel.title")}<br />
                  {t("step1.leftPanel.titleLine2")}
                </h2>
                <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-xl leading-relaxed">
                  {t("step1.leftPanel.description")}
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2-left"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <h2 className="text-5xl lg:text-[90px] font-black tracking-tight leading-[0.85] text-primary">
                  {t("step2.leftPanel.title")}
                  <br />
                  {t("step2.leftPanel.titleLine2")}
                </h2>
                <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-xl leading-relaxed">
                  {t("step2.leftPanel.description")}
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3-left"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <h2 className="text-5xl lg:text-[90px] font-black tracking-tight leading-[0.85] text-primary">
                  {t("step3.leftPanel.title")}
                  <br />
                  {t("step3.leftPanel.titleLine2")}
                  <br />
                  {t("step3.leftPanel.titleLine3")}
                </h2>
                <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-xl leading-relaxed">
                  {t("step3.leftPanel.description")}
                </p>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        <footer className="relative z-10 flex items-center gap-8">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Bot className="w-4 h-4 text-primary" />
            {t("footer.aiTeammates")}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <AppWindow className="w-4 h-4 text-primary" />
            {t("footer.yourOwnTools")}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Monitor className="w-4 h-4 text-primary" />
            {t("footer.screenRecorded")}
          </div>
        </footer>
      </div>

      {/* Right Panel - Instructions */}
      <div className="lg:w-2/5 bg-white text-slate-900 p-8 lg:p-16 flex items-center justify-center min-h-[50vh] lg:min-h-screen">
        <div className="w-full max-w-sm space-y-10">
          {/* Progress Bar */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? "bg-primary" : "bg-slate-100"
                } ${i < step ? "cursor-pointer hover:opacity-70" : "cursor-default"}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    {t("step1.rightPanel.stepLabel")}
                  </h4>
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    {t("step1.rightPanel.title")}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step1.rightPanel.points.teammates.description")}
                      <strong>{t("step1.rightPanel.points.teammates.strong")}</strong>
                      {t("step1.rightPanel.points.teammates.descriptionEnd")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Monitor className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step1.rightPanel.points.recording.description")}
                      <strong>{t("step1.rightPanel.points.recording.strong")}</strong>
                      {t("step1.rightPanel.points.recording.descriptionEnd")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step1.rightPanel.points.aiTools.description")}
                      <strong>{t("step1.rightPanel.points.aiTools.strong")}</strong>
                      {t("step1.rightPanel.points.aiTools.descriptionEnd")}
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600">
                    <strong className="text-slate-700">{t("step1.rightPanel.tip.label")}</strong>
                    {t("step1.rightPanel.tip.text")}
                  </p>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-14 rounded-full bg-slate-900 text-white font-bold text-lg group hover:bg-slate-800"
                >
                  {t("step1.rightPanel.continueButton")}
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    {t("step2.rightPanel.stepLabel")}
                  </h4>
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    {t("step2.rightPanel.title")}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AppWindow className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step2.rightPanel.points.ownComputer.description")}
                      <strong>{t("step2.rightPanel.points.ownComputer.strong")}</strong>
                      {t("step2.rightPanel.points.ownComputer.descriptionEnd")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ExternalLink className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step2.rightPanel.points.workOutside.description")}
                      <strong>{t("step2.rightPanel.points.workOutside.strong")}</strong>
                      {t("step2.rightPanel.points.workOutside.descriptionEnd")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Monitor className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step2.rightPanel.points.screenRecord.description")}
                      <strong>{t("step2.rightPanel.points.screenRecord.strong")}</strong>
                      {t("step2.rightPanel.points.screenRecord.descriptionEnd")}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(3)}
                  className="w-full h-14 rounded-full bg-slate-900 text-white font-bold text-lg group hover:bg-slate-800"
                >
                  {t("step2.rightPanel.continueButton")}
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>

                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 mx-auto text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("step2.rightPanel.backButton")}
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    {t("step3.rightPanel.stepLabel")}
                  </h4>
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    {t("step3.rightPanel.title")}
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {(() => {
                        const timing = DEPTH_TIMING[scenario.simulationDepth] || DEPTH_TIMING.medium;
                        return (
                          <>
                            {t("step3.rightPanel.points.timing.descriptionStart")}
                            <strong>{t("step3.rightPanel.points.timing.targetTime", { target: timing.target })}</strong>
                            {t("step3.rightPanel.points.timing.descriptionMid")}
                            <strong>{t("step3.rightPanel.points.timing.maxTime", { max: timing.max })}</strong>
                            {t("step3.rightPanel.points.timing.descriptionEnd")}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Coffee className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step3.rightPanel.points.quietSpot.description")}
                      <strong>{t("step3.rightPanel.points.quietSpot.strong")}</strong>
                      {t("step3.rightPanel.points.quietSpot.descriptionEnd")}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Wifi className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {t("step3.rightPanel.points.internet.description")}
                      <strong>{t("step3.rightPanel.points.internet.strong")}</strong>
                      {t("step3.rightPanel.points.internet.descriptionEnd")}
                    </p>
                  </div>
                </div>

                {startError && (
                  <p className="text-sm text-center text-destructive font-medium">
                    {startError}
                  </p>
                )}

                <Button
                  onClick={handleStart}
                  disabled={isLaunching}
                  className="w-full h-14 rounded-full bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-90"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                      {t("step3.rightPanel.launchingButton")}
                    </>
                  ) : (
                    t("step3.rightPanel.startButton")
                  )}
                </Button>

                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 mx-auto text-sm text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  {t("step3.rightPanel.backButton")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
