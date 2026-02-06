"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Monitor, Bot, Sparkles } from "lucide-react";

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
  scenario,
}: WelcomePageClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const handleStart = () => {
    router.push(`/assessments/${assessmentId}/work`);
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

        <header className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-primary font-black text-xl">
            S
          </div>
          <span className="text-xl font-bold tracking-tight">SkillVee</span>
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
                <h1 className="text-5xl lg:text-[90px] font-black tracking-tight leading-[0.85] text-white">
                  YOUR
                  <br />
                  NEXT ROLE.
                </h1>
                <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-xl">
                  {scenario.companyName} is looking for someone to join their
                  team. Experience a day in the role before you commit.
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
                  NOT A<br />
                  TEST.
                </h2>
                <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-xl leading-relaxed">
                  This is a simulation of real work. You&apos;ll collaborate
                  with AI teammates, use your favorite tools, and solve actual
                  problems.
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
                  READY.
                  <br />
                  GO.
                </h2>
                <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-xl">
                  Your environment is ready. Let&apos;s begin.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="relative z-10 flex items-center gap-8">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Bot className="w-4 h-4 text-primary" />
            AI Teammates
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Sparkles className="w-4 h-4 text-primary" />
            Use Any AI Tools
          </div>
        </footer>
      </div>

      {/* Right Panel - Instructions */}
      <div className="lg:w-2/5 bg-white text-slate-900 p-8 lg:p-16 flex items-center justify-center min-h-[50vh] lg:min-h-screen">
        <div className="w-full max-w-sm space-y-10">
          {/* Progress Bar */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= step ? "bg-primary" : "bg-slate-100"
                }`}
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
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Welcome
                  </h3>
                </div>
                <p className="text-slate-500 leading-relaxed font-medium">
                  You&apos;ve been invited to experience a day at{" "}
                  <span className="text-slate-900 font-semibold">
                    {scenario.companyName}
                  </span>
                  . This simulation assesses how you work, not just what you
                  produce.
                </p>
                <Button
                  onClick={() => setStep(2)}
                  className="w-full h-14 rounded-full bg-slate-900 text-white font-bold text-lg group hover:bg-slate-800"
                >
                  Continue
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
                    Step 02
                  </h4>
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    The Experience
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Work with <strong>AI-powered teammates</strong> via Slack.
                      They&apos;ll respond just like real colleagues.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Monitor className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      Your <strong>screen will be recorded</strong>. We assess
                      how you work, not just the end result.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-slate-500" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      <strong>Use any AI tools</strong> you want. Copilot,
                      ChatGPT, Claude - whatever helps you work best.
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600">
                    <strong className="text-slate-700">Tip:</strong> Don&apos;t
                    hesitate to reach out to your teammates for clarification.
                    That&apos;s exactly what we want to see!
                  </p>
                </div>
                <Button
                  onClick={() => setStep(3)}
                  className="w-full h-14 rounded-full bg-slate-900 text-white font-bold text-lg group hover:bg-slate-800"
                >
                  Continue
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
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
                  <h3 className="text-2xl lg:text-3xl font-bold tracking-tight">
                    Launch Environment
                  </h3>
                </div>
                <p className="text-slate-500 leading-relaxed font-medium">
                  You&apos;ll receive a task from your manager. The context is{" "}
                  <strong className="text-slate-900">
                    intentionally incomplete
                  </strong>{" "}
                  - part of the assessment is seeing how you ask questions and
                  gather requirements.
                </p>

                <p className="text-xs text-center text-slate-500">
                  By continuing, you agree to screen recording during this
                  assessment.
                </p>

                <Button
                  onClick={handleStart}
                  className="w-full h-14 rounded-full bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary/90"
                >
                  Start Simulation
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
