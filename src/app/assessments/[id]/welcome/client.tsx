"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  MessageSquare,
  Loader2,
} from "lucide-react";

interface ScenarioData {
  name: string;
  companyName: string;
  companyDescription: string;
  taskDescription: string;
  techStack: string[];
}

interface WelcomePageClientProps {
  assessmentId: string;
  scenario: ScenarioData;
}

export function WelcomePageClient({
  assessmentId,
  scenario: _scenario,
}: WelcomePageClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const totalSteps = 3;

  const handleStart = () => {
    setIsLaunching(true);
    router.push(`/assessments/${assessmentId}/work`);
  };

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-[#020617] font-sans text-white lg:flex-row">
      {/* Left Panel - Dynamic Narrative */}
      <div className="relative flex min-h-[50vh] flex-col justify-between p-8 lg:min-h-screen lg:w-3/5 lg:p-24">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-[-20%] top-[-20%] h-full w-full rounded-full bg-primary/20 blur-[150px]"
        />

        <header className="relative z-10">
          <Image
            src="/skillvee-logo.png"
            alt="Skillvee"
            width={120}
            height={32}
            className="object-contain brightness-0 invert"
            style={{ height: "auto" }}
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
                <h2 className="text-5xl font-black leading-[0.85] tracking-tight text-primary lg:text-[90px]">
                  NOT A<br />
                  TEST.
                </h2>
                <p className="max-w-xl text-xl font-medium leading-relaxed text-slate-400 lg:text-2xl">
                  This is a simulation of real work. You&apos;ll collaborate
                  with AI teammates, use your favorite tools, and solve actual
                  problems.
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
                <h2 className="text-5xl font-black leading-[0.85] tracking-tight text-primary lg:text-[90px]">
                  YOUR
                  <br />
                  SETUP.
                </h2>
                <p className="max-w-xl text-xl font-medium leading-relaxed text-slate-400 lg:text-2xl">
                  Use your own IDE, browser, terminal — everything on your
                  computer. We record your screen and assess how you actually
                  work.
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
                <h2 className="text-5xl font-black leading-[0.85] tracking-tight text-primary lg:text-[90px]">
                  READY.
                  <br />
                  GO.
                </h2>
                <p className="max-w-xl text-xl font-medium text-slate-400 lg:text-2xl">
                  Your environment is ready. Let&apos;s begin.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="relative z-10 flex items-center gap-8">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Bot className="h-4 w-4 text-primary" />
            AI Teammates
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <AppWindow className="h-4 w-4 text-primary" />
            Your Own Tools
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Monitor className="h-4 w-4 text-primary" />
            Screen Recorded
          </div>
        </footer>
      </div>

      {/* Right Panel - Instructions */}
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-8 text-slate-900 lg:min-h-screen lg:w-2/5 lg:p-16">
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
                    Step 01
                  </h4>
                  <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    The Experience
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Bot className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Work with <strong>AI-powered teammates</strong> via chat.
                      They&apos;ll respond just like real colleagues.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Monitor className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      Your <strong>entire screen will be recorded</strong>. We
                      assess how you work, not just the end result.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Sparkles className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      <strong>Use any AI tools</strong> you want. Copilot,
                      ChatGPT, Claude — whatever helps you work best.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
                  <p className="text-sm text-slate-600">
                    <strong className="text-slate-700">Tip:</strong> Don&apos;t
                    hesitate to reach out to your teammates for clarification.
                    That&apos;s exactly what we want to see!
                  </p>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="group h-14 w-full rounded-full bg-slate-900 text-lg font-bold text-white hover:bg-slate-800"
                >
                  Continue
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
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
                    Step 02
                  </h4>
                  <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    Your Workspace, Your Rules
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <AppWindow className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      <strong>Work on your own computer.</strong> Use your IDE,
                      terminal, browser, repos — any tool you normally use.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <ExternalLink className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      <strong>
                        You&apos;re expected to work outside SkillVee.
                      </strong>{" "}
                      Write code in VS Code, look things up, use whatever
                      workflow you prefer.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Monitor className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      <strong>We record your screen the whole time</strong> —
                      everything you do is part of your assessment.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">
                      <strong>Come back to SkillVee to chat</strong> with your
                      manager and teammates whenever you need to.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(3)}
                  className="group h-14 w-full rounded-full bg-slate-900 text-lg font-bold text-white hover:bg-slate-800"
                >
                  Continue
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>

                <button
                  onClick={() => setStep(1)}
                  className="mx-auto flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3-right"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Step 03
                  </h4>
                  <h3 className="text-2xl font-bold tracking-tight lg:text-3xl">
                    Launch Simulation
                  </h3>
                </div>
                <p className="font-medium leading-relaxed text-slate-500">
                  You&apos;ll receive a task from your manager. The context is{" "}
                  <strong className="text-slate-900">
                    intentionally incomplete
                  </strong>{" "}
                  — part of the assessment is seeing how you ask questions and
                  gather requirements.
                </p>

                <p className="text-center text-xs text-slate-500">
                  By continuing, you agree to screen and webcam recording during
                  this assessment.
                </p>

                <Button
                  onClick={handleStart}
                  disabled={isLaunching}
                  className="h-14 w-full rounded-full bg-primary text-lg font-bold text-white shadow-xl shadow-primary/20 hover:bg-primary/90 disabled:opacity-90"
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    "Start Simulation"
                  )}
                </Button>

                <button
                  onClick={() => setStep(2)}
                  className="mx-auto flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
