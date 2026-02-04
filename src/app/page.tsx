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
      className="bg-slate-50 border border-slate-200 hover:border-primary/30 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-start space-x-4 flex-1">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary font-bold text-sm">Q</span>
          </div>
          <h3 className="font-semibold text-slate-900 text-lg pr-4">{item.question}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 animate-in fade-in duration-200">
          <div className="pl-12 text-slate-600 leading-relaxed">{item.answer}</div>
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
      {/* Video container with subtle glow */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10">
        {/* Ambient glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-xl opacity-50" />

        {/* Video - autoplays, loops, muted */}
        <div className="relative aspect-video bg-[#020617]">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/hero-video.mp4" type="video/mp4" />
          </video>
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
      <section className="relative min-h-screen flex items-center pt-20 pb-16 overflow-hidden">
        {/* Subtle animated background */}
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

        {/* Main Content - Grid Layout */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-[1fr,1.2fr] gap-12 lg:gap-12 items-center">
            {/* Left side - Text content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-slate-400 text-sm">Work simulations that actually work</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.05] mb-6">
                Watch them work.
                <br />
                <span className="text-primary">Then hire.</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 max-w-xl mb-8 lg:pr-8">
                See exactly how candidates communicate, collaborate, and solve problems—before you make the offer. No more expensive hiring mistakes.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                <Link href="/demo">
                  <Button className="h-14 px-8 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl shadow-white/10 hover:bg-slate-100 group">
                    Request Demo
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/demo#sample">
                  <Button variant="ghost" className="h-14 px-6 rounded-full text-white hover:bg-white/10 font-semibold group">
                    <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
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
      <section className="py-12 bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12"
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
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 text-sm">🏆</span>
              </div>
              <span className="text-slate-600 text-sm font-medium">
                Hackathon Winner
              </span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-300" />

            {/* Backed By */}
            <div className="flex items-center gap-5">
              <span className="text-slate-500 text-sm">Backed by</span>
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
      <section className="py-32 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              The Problem
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              You&apos;ve hired the wrong person before
            </h2>
            <p className="text-xl text-slate-600">
              So has everyone. 75% of companies admit it. Here&apos;s why it keeps happening.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12 mt-20">
            {[
              { stat: "72%", text: "of resumes are now AI-written. You can't tell who's qualified." },
              { stat: "46%", text: "of new hires fail within 18 months. Expensive mistake." },
              { stat: "<1%", text: "of applicants are truly qualified. Needle in a haystack." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="border-t-4 border-slate-900 pt-8"
              >
                <div className="text-6xl lg:text-7xl font-black text-primary mb-4">{item.stat}</div>
                <p className="text-slate-600 text-lg">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS
          ============================================ */}
      <section className="relative py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16 sm:mb-20"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              From job description to hiring decision
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Three steps. No scheduling headaches. Real evidence.
            </p>
          </motion.div>

          {/* Step 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 sm:mb-28">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/30">
                  1
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Create Your Simulation
                </h3>
              </div>
              <p className="text-lg text-slate-600 mb-8">
                Paste your job description and we generate a realistic work scenario.
                No generic tests—your simulation matches the actual role.
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
                  { title: "Ready in minutes", desc: "No weeks of test design required" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
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
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 lg:p-3 hover:shadow-2xl transition-shadow duration-500 overflow-hidden">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden">
                  <video
                    className="absolute inset-0 w-full h-full object-cover scale-[1.8] origin-[70%_40%]"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/videos/how-it-works-step1.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Step 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 sm:mb-28">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="order-2 lg:order-1"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 lg:p-3 hover:shadow-2xl transition-shadow duration-500 overflow-hidden">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden">
                  <video
                    className="absolute inset-0 w-full h-full object-cover scale-[1.5] origin-[50%_50%]"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/videos/how-it-works-step2.mp4" type="video/mp4" />
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
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/30">
                  2
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Candidates Do Real Work
                </h3>
              </div>
              <p className="text-lg text-slate-600 mb-8">
                Send a link. Candidates experience a realistic first day—gathering
                requirements, making decisions, and delivering work. 30-45 minutes, no
                scheduling.
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
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Step 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg shadow-primary/30">
                  3
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                  Review Standardized Evidence
                </h3>
              </div>
              <p className="text-lg text-slate-600 mb-8">
                Compare candidates side-by-side with consistent, objective data. No
                more gut feel—see exactly what you&apos;re getting.
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
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <p className="text-slate-600 text-sm">{item.desc}</p>
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
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 lg:p-3 hover:shadow-2xl transition-shadow duration-500 overflow-hidden">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden">
                  <video
                    className="absolute inset-0 w-full h-full object-cover scale-[1.5] origin-[50%_50%]"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/videos/how-it-works-step3.mp4" type="video/mp4" />
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
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              Universal Platform
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              Works for every role
            </h2>
            <p className="text-xl text-slate-600">
              Custom simulations tailored to your specific needs
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: "Software Engineers", icon: Code, color: "blue", desc: "Build features, review code, collaborate with stakeholders" },
              { role: "Product Managers", icon: Users, color: "purple", desc: "Prioritize backlogs, run meetings, present roadmaps" },
              { role: "Data Scientists", icon: BarChart3, color: "emerald", desc: "Analyze data, communicate findings, make recommendations" },
              { role: "Program Managers", icon: TrendingUp, color: "amber", desc: "Coordinate teams, resolve conflicts, drive alignment" },
              { role: "Sales", icon: DollarSign, color: "rose", desc: "Run discovery calls, handle objections, close deals" },
              { role: "Customer Success", icon: Users, color: "cyan", desc: "Onboard clients, handle escalations, drive renewals" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  item.color === 'blue' ? 'bg-blue-100' :
                  item.color === 'purple' ? 'bg-purple-100' :
                  item.color === 'emerald' ? 'bg-emerald-100' :
                  item.color === 'amber' ? 'bg-amber-100' :
                  item.color === 'rose' ? 'bg-rose-100' :
                  'bg-cyan-100'
                }`}>
                  <item.icon className={`w-6 h-6 ${
                    item.color === 'blue' ? 'text-blue-600' :
                    item.color === 'purple' ? 'text-purple-600' :
                    item.color === 'emerald' ? 'text-emerald-600' :
                    item.color === 'amber' ? 'text-amber-600' :
                    item.color === 'rose' ? 'text-rose-600' :
                    'text-cyan-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <span className="font-bold text-slate-900 block">{item.role}</span>
                  <span className="text-slate-500 text-sm">{item.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================
          FAQ SECTION
          ============================================ */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              Got Questions?
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                question: "How long does the assessment take candidates?",
                answer: "30-45 minutes. Candidates complete the simulation in one sitting—no scheduling required. They get a link, complete the work, and you get results."
              },
              {
                question: "Can candidates cheat with AI?",
                answer: (
                  <>
                    We encourage AI use—that&apos;s how people actually work in 2025. What matters is <em>how</em> they use it. <strong>Our real-time voice conversations are unfakeable</strong>—candidates can&apos;t rehearse, script, or have someone else take the call. Combined with screen recordings of their entire process, you see the real person, not just polished output.
                  </>
                )
              },
              {
                question: "Can we customize the simulation for our role?",
                answer: "Yes. Paste your job description and we generate a simulation tailored to your specific role, tech stack, and company context. No generic tests—candidates work on scenarios that match what they'd actually do on day one."
              },
              {
                question: "What ATS integrations do you support?",
                answer: (
                  <>
                    We integrate with major ATS platforms including Greenhouse, Lever, Ashby, and Workday. Results sync automatically to candidate profiles. Don&apos;t see yours? <Link href="/demo" className="text-primary hover:underline">Contact us</Link>—we&apos;re adding new integrations regularly.
                  </>
                )
              },
              {
                question: "Is this fair for all candidates?",
                answer: (
                  <>
                    <strong>More fair than traditional interviews.</strong> Think about what candidates face today: being judged on appearance, nervousness, and interviewer mood. Subjective &ldquo;culture fit&rdquo; assessments. Advantages for people who interview well but work poorly.<br /><br />
                    With SkillVee, every candidate gets the identical scenario. No power dynamics, no surprise questions, no bias. They choose when to complete it, use their preferred tools, and their work speaks for itself. We measure what people actually do—not how they perform under artificial pressure.
                  </>
                )
              },
              {
                question: "What about candidate privacy?",
                answer: (
                  <>
                    Candidates know exactly what&apos;s being evaluated—there&apos;s no hidden scoring or secret criteria. They see the same materials reviewers see. Compare this to traditional interviews where candidates have no idea what&apos;s being written about them, or personality tests with opaque algorithms.<br /><br />
                    Our approach is <strong>transparent by design</strong>: candidates demonstrate real skills, reviewers see real work, and everyone knows the rules upfront.
                  </>
                )
              }
            ].map((item, index) => (
              <FAQAccordion key={index} item={item} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link
              href="/faq"
              className="text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
            >
              View all questions →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="py-32 bg-[#020617] relative overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[200px] pointer-events-none"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
              STOP GUESSING.
              <br />
              <span className="text-primary">START KNOWING.</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              See exactly how candidates perform before you make the offer.
            </p>
            <Link href="/demo">
              <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                Request Demo
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
