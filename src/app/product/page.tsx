"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Brain,
  Users,
  ArrowRight,
  CheckCircle,
  Video,
  BarChart3,
  Shield,
  Lock,
  Globe,
  ChevronDown,
  XCircle,
  Code,
} from "lucide-react";
import Footer from "@/components/landing/Footer";
import Navigation from "@/components/landing/Navigation";
import { SectionReveal } from "@/components/landing/SectionReveal";
import { CurveDivider } from "@/components/landing/SectionDivider";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const timelineSteps = [
  {
    icon: Users,
    title: "Gather Requirements",
    description:
      "Candidate joins a kickoff call with their AI manager, then chats with stakeholders to clarify the task. Great candidates ask smart questions. Others dive in blind. You'll see the difference.",
    tags: ["Manager kickoff", "Stakeholder chat"],
    video: "/videos/product-step1.mp4",
  },
  {
    icon: Code,
    title: "Do the Actual Work",
    description:
      "Build the feature, analyze the data, create the roadmap—whatever the role requires. Screen is recorded. AI tools are encouraged. We want to see how they really work.",
    tags: ["Screen recorded", "AI tools allowed", "~20-30 minutes"],
    video: "/videos/product-step2.mp4",
  },
  {
    icon: MessageSquare,
    title: "Present and Defend",
    description:
      "Submit the work and face questions. The AI pushes back on decisions. Do they defend good ideas? Accept valid criticism? Fold at the first sign of disagreement?",
    tags: ["Voice call", "Challenging questions"],
    video: "/videos/product-step3.mp4",
  },
];

const comparisonData = [
  {
    feature: "Signal Quality",
    oldWay: "Low-fidelity signals from resumes and interviews.",
    skillveeWay: "High-fidelity signals from real work simulations.",
  },
  {
    feature: "Candidate Experience",
    oldWay: "Stressful, irrelevant algorithm tests and trivia questions.",
    skillveeWay: "Engaging, relevant tasks that showcase their skills.",
  },
  {
    feature: "Time to Hire",
    oldWay: "Weeks of scheduling and multiple interview rounds.",
    skillveeWay: "Asynchronous assessments completed in hours.",
  },
  {
    feature: "Bias",
    oldWay: "Prone to unconscious bias and 'culture fit' assessment.",
    skillveeWay: "Standardized, objective evidence for every candidate.",
  },
];

const FeatureCard = ({
  icon: Icon,
  title,
  text,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  iconColor: string;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay: 0.1 }}
    className="flex flex-col items-start rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:border-primary/30 hover:shadow-lg"
  >
    <div
      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-${iconColor}-500/10`}
    >
      <Icon className={`h-6 w-6 text-${iconColor}-600`} />
    </div>
    <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
    <p className="text-sm text-slate-600">{text}</p>
  </motion.div>
);

function ProductFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How long does it take to set up a simulation?",
      answer:
        "Most simulations are ready in under 5 minutes. Paste your job description, review the generated scenario, customize if needed, and you're ready to send to candidates. No weeks of test design required.",
    },
    {
      question: "Can I customize the simulation for my specific role?",
      answer:
        "Yes. The AI generates a baseline from your JD, but you can customize the scenario, stakeholder personas, specific tasks, and evaluation criteria. Enterprise plans include white-glove simulation design support.",
    },
    {
      question: "How do candidates feel about this vs. traditional interviews?",
      answer:
        "Candidates consistently rate Skillvee higher than algorithm tests. They appreciate that it's relevant to the actual job, respects their time (30-45 min vs. multi-hour interviews), and lets them show their real skills—not trivia recall.",
    },
    {
      question: "What if a candidate has technical issues?",
      answer:
        "Candidates can pause and resume. If issues persist, they can contact support. All sessions are saved automatically, so no work is lost. We also provide a pre-flight check before they start.",
    },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
        >
          <button
            className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-50"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <div className="flex flex-1 items-start space-x-4">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-bold text-primary">Q</span>
              </div>
              <h3 className="pr-4 text-lg font-semibold text-slate-900">
                {faq.question}
              </h3>
            </div>
            <ChevronDown
              className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-6 pb-5 duration-200 animate-in fade-in">
              <div className="pl-12 leading-relaxed text-slate-600">
                {faq.answer}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProductPage() {
  const [activeStep, setActiveStep] = useState(0);
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Dark Hero Section */}
      <div className="relative overflow-hidden bg-[#020617]">
        <Navigation variant="dark" currentPage="product" />

        {/* Animated background glows */}
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

        {/* Hero Section */}
        <section className="relative pb-20 pt-32">
          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center sm:px-8 lg:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-sm text-slate-400">See it in action</span>
              </div>

              <h1 className="mb-6 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Watch a candidate complete
                <br />
                <span className="text-primary">a real simulation.</span>
              </h1>

              <p className="mx-auto mb-12 max-w-2xl text-xl text-slate-400">
                This is what your hiring team sees after a candidate finishes.
                Real conversations. Real work. Real signal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mx-auto max-w-5xl"
            >
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/20 ring-1 ring-white/15">
                {/* Ambient glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 opacity-60 blur-2xl" />

                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  <video
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/videos/product-demo.mp4" type="video/mp4" />
                  </video>

                  {/* Subtle edge vignette to lift video from background */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Interactive Timeline Section */}
      <section className="relative bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              A realistic day at work—not algorithm puzzles
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600">
              Candidates experience what the job actually feels like. You see
              how they actually work.
            </p>
          </SectionReveal>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="flex flex-col gap-4">
                {timelineSteps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`rounded-xl p-6 text-left transition-all duration-300 ${activeStep === index ? "border-primary/50 bg-primary/10" : "border-slate-200 bg-white"} border`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${activeStep === index ? "bg-primary/20" : "bg-slate-100"}`}
                      >
                        <step.icon
                          className={`h-5 w-5 ${activeStep === index ? "text-primary" : "text-slate-500"}`}
                        />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {step.title}
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-slate-200 bg-white p-8"
                >
                  <div className="mb-6 aspect-[16/9] overflow-hidden rounded-lg bg-slate-900">
                    <video
                      key={timelineSteps[activeStep].video}
                      className="h-full w-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    >
                      <source
                        src={timelineSteps[activeStep].video}
                        type="video/mp4"
                      />
                    </video>
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-slate-900">
                    {timelineSteps[activeStep].title}
                  </h3>
                  <p className="mb-6 text-slate-600">
                    {timelineSteps[activeStep].description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {timelineSteps[activeStep].tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-primary/10 px-2 py-1 text-xs text-primary/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <CurveDivider fillColor="fill-white" />
      </section>

      {/* What You Get & Signals Grid Section */}
      <section className="relative bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              Everything you need to make the decision
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600">
              Not just a score. Actual evidence of how they work.
            </p>
          </SectionReveal>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={BarChart3}
              title="Structured Scorecard"
              text="AI-generated ratings across key dimensions."
              iconColor="blue"
            />
            <FeatureCard
              icon={MessageSquare}
              title="Full Transcripts"
              text="Every conversation with stakeholders."
              iconColor="purple"
            />
            <FeatureCard
              icon={Video}
              title="Screen Recording"
              text="Watch their entire process if you want."
              iconColor="emerald"
            />
            <FeatureCard
              icon={Brain}
              title="AI Tool Usage"
              text="Do they use AI thoughtfully or blindly copy-paste?"
              iconColor="amber"
            />
            <FeatureCard
              icon={CheckCircle}
              title="Handling Feedback"
              text="How do they respond to pushback? Defend ideas when right?"
              iconColor="rose"
            />
            <FeatureCard
              icon={Users}
              title="Communication"
              text="Can they explain their work clearly and professionally?"
              iconColor="indigo"
            />
          </div>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* Comparison Section */}
      <section className="relative bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              There&apos;s a better way to hire
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* The Old Way */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-6 text-center text-2xl font-bold text-red-600">
                The Old Way
              </h2>
              <div className="space-y-6">
                {comparisonData.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-white p-6"
                  >
                    <h3 className="mb-2 font-bold text-slate-900">
                      {item.feature}
                    </h3>
                    <div className="flex items-start gap-3">
                      <XCircle className="mt-1 h-5 w-5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-slate-600">{item.oldWay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* The Skillvee Way */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-6 text-center text-2xl font-bold text-emerald-600">
                The Skillvee Way
              </h2>
              <div className="space-y-6">
                {comparisonData.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-white p-6"
                  >
                    <h3 className="mb-2 font-bold text-slate-900">
                      {item.feature}
                    </h3>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-500" />
                      <p className="text-sm text-slate-600">
                        {item.skillveeWay}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Security & Enterprise Section */}
      <section className="relative bg-slate-900 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Enterprise-ready from day one
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-400">
              Your candidate data is secure. Your compliance needs are met.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/30">
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">
                  SOC 2 Type II
                </h3>
                <p className="text-sm text-slate-400">
                  Audited security controls. Your data is protected by
                  industry-standard practices.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/30">
                  <Lock className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">
                  GDPR Compliant
                </h3>
                <p className="text-sm text-slate-400">
                  Full data privacy compliance for EU candidates. Automatic data
                  retention policies.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/30">
                  <Globe className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">
                  SSO & Integrations
                </h3>
                <p className="text-sm text-slate-400">
                  SAML SSO, Greenhouse, Lever, and Workday integrations
                  available for Enterprise.
                </p>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal className="mt-12 text-center">
            <Link href="/demo">
              <Button
                variant="outline"
                className="border-white/50 bg-transparent text-white hover:border-white hover:bg-white/10"
              >
                Contact us for Enterprise
              </Button>
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* Product FAQ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              Common questions
            </h2>
          </SectionReveal>
          <ProductFAQ />
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-[#020617] py-32">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[200px]"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="mb-6 text-4xl font-black text-white lg:text-6xl">
              READY TO UPGRADE
              <br />
              <span className="text-primary">YOUR HIRING?</span>
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">
              Get a personalized demo or try a sample assessment as a candidate.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/demo">
                <Button className="group h-14 rounded-full bg-white px-10 text-lg font-bold text-slate-900 shadow-xl hover:bg-slate-100">
                  Request Demo
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/demo#sample">
                <Button
                  variant="ghost"
                  className="h-14 rounded-full px-8 font-semibold text-white hover:bg-white/10"
                >
                  Try Sample Assessment
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
