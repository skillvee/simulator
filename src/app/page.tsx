"use client";

/**
 * Skillvee Homepage
 * - Hero: Text on left, product demo video on right (side-by-side layout)
 * - Credibility strip, problem section, how it works, roles, FAQ, CTA
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Play,
  Code,
  CheckCircle,
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Footer from "@/components/landing/Footer";
import Navigation from "@/components/landing/Navigation";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-100/50"
      >
        <div className="flex flex-1 items-start space-x-4">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-bold text-primary">Q</span>
          </div>
          <h3 className="pr-4 text-lg font-semibold text-slate-900">
            {item.question}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 duration-200 animate-in fade-in">
          <div className="pl-12 leading-relaxed text-slate-600">
            {item.answer}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Product Demo Video for side-by-side layout - autoplaying loop
function HeroProductDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3, duration: 0.8 }}
      className="relative w-full"
    >
      {/* Video container with contrast-enhancing frame */}
      <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/20 ring-1 ring-white/15">
        {/* Ambient glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 opacity-60 blur-2xl" />

        {/* Video - autoplays, loops, muted - brightness boosted for dark content */}
        <div className="relative aspect-video bg-slate-900">
          <video
            className="contrast-110 absolute inset-0 h-full w-full object-cover brightness-125"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>

          {/* Subtle edge vignette to lift video from background */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#020617]">
      {/* ============================================
          HERO SECTION - Side by Side Layout
          ============================================ */}

      {/* Dark Navigation */}
      <Navigation variant="dark" />

      {/* Hero Section - Side by Side */}
      <section className="relative flex min-h-screen items-center overflow-hidden pb-16 pt-20">
        {/* Subtle animated background */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/30 blur-[200px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[200px]"
        />

        {/* Main Content - Grid Layout */}
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr,1.2fr] lg:gap-12">
            {/* Left side - Text content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-sm text-slate-400">
                  Work simulations that actually work
                </span>
              </div>

              <h1 className="mb-6 text-4xl font-black leading-[1.05] text-white sm:text-5xl lg:text-6xl xl:text-7xl">
                Watch them work.
                <br />
                <span className="text-primary">Then hire.</span>
              </h1>

              <p className="mb-8 max-w-xl text-lg text-slate-400 sm:text-xl lg:pr-8">
                See exactly how candidates communicate, collaborate, and solve
                problems—before you make the offer. No more expensive hiring
                mistakes.
              </p>

              <div className="flex flex-col items-center gap-4 sm:flex-row lg:items-start">
                <Link href="/demo">
                  <Button className="group h-14 rounded-full bg-white px-8 text-lg font-bold text-slate-900 shadow-xl shadow-white/10 hover:bg-slate-100">
                    Request Demo
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/demo#sample">
                  <Button
                    variant="ghost"
                    className="group h-14 rounded-full px-6 font-semibold text-white hover:bg-white/10"
                  >
                    <Play className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
                    See Sample
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right side - Product Demo */}
            <div>
              <HeroProductDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          CREDIBILITY STRIP
          ============================================ */}
      <section className="border-b border-slate-100 bg-white py-12">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-12"
          >
            {/* DeepMind Win */}
            <div className="flex items-center gap-3">
              <Image
                src="/deepmind logo.png"
                alt="Google DeepMind"
                width={120}
                height={28}
                className="object-contain"
              />
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                <span className="text-sm text-amber-600">🏆</span>
              </div>
              <span className="text-sm font-medium text-slate-600">
                Hackathon Winner
              </span>
            </div>

            {/* Divider */}
            <div className="hidden h-8 w-px bg-slate-300 sm:block" />

            {/* Backed By */}
            <div className="flex items-center gap-5">
              <span className="text-sm text-slate-500">Backed by</span>
              <Image
                src="/startx.png"
                alt="StartX"
                width={90}
                height={28}
                className="object-contain"
              />
              <Image
                src="/stanford-logo.png"
                alt="Stanford"
                width={110}
                height={28}
                className="object-contain"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          PROBLEM SECTION
          ============================================ */}
      <section className="bg-white py-32">
        <div className="mx-auto max-w-[1200px] px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              The Problem
            </p>
            <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
              You&apos;ve hired the wrong person before
            </h2>
            <p className="text-xl text-slate-600">
              So has everyone. 75% of companies admit it. Here&apos;s why it
              keeps happening.
            </p>
          </motion.div>

          <div className="mt-20 grid gap-12 lg:grid-cols-3">
            {[
              {
                stat: "72%",
                text: "of resumes are now AI-written and look alike. You can't tell who's qualified.",
              },
              {
                stat: "46%",
                text: "of new hires fail within 18 months. Expensive mistake.",
              },
              {
                stat: "<1%",
                text: "of applicants are truly qualified. Needle in a haystack.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="border-t-4 border-slate-900 pt-8"
              >
                <div className="mb-4 text-6xl font-black text-primary lg:text-7xl">
                  {item.stat}
                </div>
                <p className="text-lg text-slate-600">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS
          ============================================ */}
      <section className="relative bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center sm:mb-20"
          >
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              How It Works
            </p>
            <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
              From job description to hiring decision
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-600">
              Three steps. No scheduling headaches. Real evidence.
            </p>
          </motion.div>

          {/* Step 1 */}
          <div className="mb-20 grid grid-cols-1 items-center gap-12 sm:mb-28 lg:grid-cols-[1fr,2fr] lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-black text-white shadow-lg shadow-primary/30">
                  1
                </div>
                <h3 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Create Your Simulation
                </h3>
              </div>
              <p className="mb-8 text-lg text-slate-600">
                Paste your job description and we generate a realistic work
                scenario. No generic tests—your simulation matches the actual
                role.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: "Role-specific scenarios",
                    desc: "AI generates tasks that match your JD",
                  },
                  {
                    title: "Custom stakeholder personas",
                    desc: "PM, manager, and team members tailored to you",
                  },
                  {
                    title: "Ready in minutes",
                    desc: "No weeks of test design required",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        {item.title}
                      </span>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl transition-shadow duration-500 hover:shadow-2xl lg:p-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source
                      src="/videos/how-it-works-step1.mp4"
                      type="video/mp4"
                    />
                  </video>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Step 2 */}
          <div className="mb-20 grid grid-cols-1 items-center gap-12 sm:mb-28 lg:grid-cols-[2fr,1fr] lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="order-2 lg:order-1"
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl transition-shadow duration-500 hover:shadow-2xl lg:p-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source
                      src="/videos/how-it-works-step2.mp4"
                      type="video/mp4"
                    />
                  </video>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-black text-white shadow-lg shadow-primary/30">
                  2
                </div>
                <h3 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Candidates Do Real Work
                </h3>
              </div>
              <p className="mb-8 text-lg text-slate-600">
                Send a link. Candidates experience a realistic first
                day—gathering requirements, making decisions, and delivering
                work. 30-45 minutes, no scheduling.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: "Real-time voice calls they can't fake",
                    desc: "Unscripted conversations with AI stakeholders—no rehearsing, no cheating",
                  },
                  {
                    title: "AI tools encouraged",
                    desc: "See how they actually work in 2025",
                  },
                  {
                    title: "Full transparency",
                    desc: "Candidates see exactly what you see—no hidden evaluation",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        {item.title}
                      </span>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Step 3 */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr,2fr] lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-black text-white shadow-lg shadow-primary/30">
                  3
                </div>
                <h3 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  Review Standardized Evidence
                </h3>
              </div>
              <p className="mb-8 text-lg text-slate-600">
                Compare candidates side-by-side with consistent, objective data.
                No more gut feel—see exactly what you&apos;re getting.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: "Structured scorecards",
                    desc: "Communication, problem-solving, execution, AI usage",
                  },
                  {
                    title: "Conversation transcripts",
                    desc: "See how they clarified requirements and collaborated",
                  },
                  {
                    title: "Work artifacts",
                    desc: "Review their actual output and code",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        {item.title}
                      </span>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl transition-shadow duration-500 hover:shadow-2xl lg:p-3">
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-slate-100">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source
                      src="/videos/how-it-works-step3.mp4"
                      type="video/mp4"
                    />
                  </video>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================
          WORKS FOR EVERY ROLE
          ============================================ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Universal Platform
            </p>
            <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
              Works for every role
            </h2>
            <p className="text-xl text-slate-600">
              Custom simulations tailored to your specific needs
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                role: "Software Engineers",
                icon: Code,
                color: "blue",
                desc: "Build features, review code, collaborate with stakeholders",
              },
              {
                role: "Product Managers",
                icon: Users,
                color: "purple",
                desc: "Prioritize backlogs, run meetings, present roadmaps",
              },
              {
                role: "Data Scientists",
                icon: BarChart3,
                color: "emerald",
                desc: "Analyze data, communicate findings, make recommendations",
              },
              {
                role: "Program Managers",
                icon: TrendingUp,
                color: "amber",
                desc: "Coordinate teams, resolve conflicts, drive alignment",
              },
              {
                role: "Sales",
                icon: DollarSign,
                color: "rose",
                desc: "Run discovery calls, handle objections, close deals",
              },
              {
                role: "Customer Success",
                icon: Users,
                color: "cyan",
                desc: "Onboard clients, handle escalations, drive renewals",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                    item.color === "blue"
                      ? "bg-blue-100"
                      : item.color === "purple"
                        ? "bg-purple-100"
                        : item.color === "emerald"
                          ? "bg-emerald-100"
                          : item.color === "amber"
                            ? "bg-amber-100"
                            : item.color === "rose"
                              ? "bg-rose-100"
                              : "bg-cyan-100"
                  }`}
                >
                  <item.icon
                    className={`h-6 w-6 ${
                      item.color === "blue"
                        ? "text-blue-600"
                        : item.color === "purple"
                          ? "text-purple-600"
                          : item.color === "emerald"
                            ? "text-emerald-600"
                            : item.color === "amber"
                              ? "text-amber-600"
                              : item.color === "rose"
                                ? "text-rose-600"
                                : "text-cyan-600"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <span className="block font-bold text-slate-900">
                    {item.role}
                  </span>
                  <span className="text-sm text-slate-500">{item.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          FAQ SECTION
          ============================================ */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Got Questions?
            </p>
            <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                question: "How long does the assessment take candidates?",
                answer:
                  "30-45 minutes. Candidates complete the simulation in one sitting—no scheduling required. They get a link, complete the work, and you get results.",
              },
              {
                question: "Can candidates cheat with AI?",
                answer: (
                  <>
                    We encourage AI use—that&apos;s how people actually work in
                    2025. What matters is <em>how</em> they use it.{" "}
                    <strong>
                      Our real-time voice conversations are unfakeable
                    </strong>
                    —candidates can&apos;t rehearse, script, or have someone
                    else take the call. Combined with screen recordings of their
                    entire process, you see the real person, not just polished
                    output.
                  </>
                ),
              },
              {
                question: "Can we customize the simulation for our role?",
                answer:
                  "Yes. Paste your job description and we generate a simulation tailored to your specific role, tech stack, and company context. No generic tests—candidates work on scenarios that match what they'd actually do on day one.",
              },
              {
                question: "What ATS integrations do you support?",
                answer: (
                  <>
                    We integrate with major ATS platforms including Greenhouse,
                    Lever, Ashby, and Workday. Results sync automatically to
                    candidate profiles. Don&apos;t see yours?{" "}
                    <Link href="/demo" className="text-primary hover:underline">
                      Contact us
                    </Link>
                    —we&apos;re adding new integrations regularly.
                  </>
                ),
              },
              {
                question: "Is this fair for all candidates?",
                answer: (
                  <>
                    <strong>More fair than traditional interviews.</strong>{" "}
                    Think about what candidates face today: being judged on
                    appearance, nervousness, and interviewer mood. Subjective
                    &ldquo;culture fit&rdquo; assessments. Advantages for people
                    who interview well but work poorly.
                    <br />
                    <br />
                    With SkillVee, every candidate gets the identical scenario.
                    No power dynamics, no surprise questions, no bias. They
                    choose when to complete it, use their preferred tools, and
                    their work speaks for itself. We measure what people
                    actually do—not how they perform under artificial pressure.
                  </>
                ),
              },
              {
                question: "What about candidate privacy?",
                answer: (
                  <>
                    Candidates know exactly what&apos;s being
                    evaluated—there&apos;s no hidden scoring or secret criteria.
                    They see the same materials reviewers see. Compare this to
                    traditional interviews where candidates have no idea
                    what&apos;s being written about them, or personality tests
                    with opaque algorithms.
                    <br />
                    <br />
                    Our approach is <strong>transparent by design</strong>:
                    candidates demonstrate real skills, reviewers see real work,
                    and everyone knows the rules upfront.
                  </>
                ),
              },
            ].map((item, index) => (
              <FAQAccordion key={index} item={item} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <Link
              href="/faq"
              className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              View all questions →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="relative overflow-hidden bg-[#020617] py-32">
        {/* Ambient blue glow - top right */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/30 blur-[200px]"
        />
        {/* Ambient blue glow - bottom left */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[200px]"
        />
        {/* Central glow behind CTA */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[150px]"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-6 text-4xl font-black text-white lg:text-6xl">
              STOP GUESSING.
              <br />
              <span className="text-primary">START KNOWING.</span>
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">
              See exactly how candidates perform before you make the offer.
            </p>
            <Link href="/demo">
              <Button className="group h-14 rounded-full bg-white px-10 text-lg font-bold text-slate-900 shadow-xl hover:bg-slate-100">
                Request Demo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
