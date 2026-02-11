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
        description: "Candidate joins a kickoff call with their AI manager, then chats with stakeholders to clarify the task. Great candidates ask smart questions. Others dive in blind. You'll see the difference.",
        tags: ["Manager kickoff", "Stakeholder chat"],
        video: "/videos/product-step1.mp4"
    },
    {
        icon: Code,
        title: "Do the Actual Work",
        description: "Build the feature, analyze the data, create the roadmap—whatever the role requires. Screen is recorded. AI tools are encouraged. We want to see how they really work.",
        tags: ["Screen recorded", "AI tools allowed", "~20-30 minutes"],
        video: "/videos/product-step2.mp4"
    },
    {
        icon: MessageSquare,
        title: "Present and Defend",
        description: "Submit the work and face questions. The AI pushes back on decisions. Do they defend good ideas? Accept valid criticism? Fold at the first sign of disagreement?",
        tags: ["Voice call", "Challenging questions"],
        video: "/videos/product-step3.mp4"
    }
];

const comparisonData = [
    {
        feature: "Signal Quality",
        oldWay: "Low-fidelity signals from resumes and interviews.",
        skillveeWay: "High-fidelity signals from real work simulations."
    },
    {
        feature: "Candidate Experience",
        oldWay: "Stressful, irrelevant algorithm tests and trivia questions.",
        skillveeWay: "Engaging, relevant tasks that showcase their skills."
    },
    {
        feature: "Time to Hire",
        oldWay: "Weeks of scheduling and multiple interview rounds.",
        skillveeWay: "Asynchronous assessments completed in hours."
    },
    {
        feature: "Bias",
        oldWay: "Prone to unconscious bias and 'culture fit' assessment.",
        skillveeWay: "Standardized, objective evidence for every candidate."
    }
];

const FeatureCard = ({ icon: Icon, title, text, iconColor }: { icon: React.ComponentType<{ className?: string }>, title: string, text: string, iconColor: string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-start hover:border-primary/30 hover:shadow-lg transition-all"
    >
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-${iconColor}-500/10`}>
            <Icon className={`w-6 h-6 text-${iconColor}-600`} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 text-sm">{text}</p>
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
          className="bg-white border-2 border-slate-200 hover:border-primary/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
        >
          <button
            className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <div className="flex items-start space-x-4 flex-1">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-sm">Q</span>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg pr-4">{faq.question}</h3>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-6 pb-5 animate-in fade-in duration-200">
              <div className="pl-12 text-slate-600 leading-relaxed">{faq.answer}</div>
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
      <div className="bg-[#020617] relative overflow-hidden">
        <Navigation variant="dark" currentPage="product" />

        {/* Animated background glows */}
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

        {/* Hero Section */}
        <section className="relative pt-32 pb-20">
          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-slate-400 text-sm">See it in action</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                Watch a candidate complete
                <br />
                <span className="text-primary">a real simulation.</span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
                This is what your hiring team sees after a candidate finishes. Real
                conversations. Real work. Real signal.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-5xl mx-auto"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-white/15">
                {/* Ambient glow effect */}
                <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 blur-2xl opacity-60" />

                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/videos/product-demo.mp4" type="video/mp4" />
                  </video>

                  {/* Subtle edge vignette to lift video from background */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Interactive Timeline Section */}
      <section className="relative py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <SectionReveal className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                A realistic day at work—not algorithm puzzles
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Candidates experience what the job actually feels like. You see how they
                actually work.
                </p>
            </SectionReveal>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1">
                    <div className="flex flex-col gap-4">
                        {timelineSteps.map((step, index) => (
                             <button key={index} onClick={() => setActiveStep(index)} className={`p-6 rounded-xl text-left transition-all duration-300 ${activeStep === index ? 'bg-primary/10 border-primary/50' : 'bg-white border-slate-200'} border`}>
                                 <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeStep === index ? 'bg-primary/20' : 'bg-slate-100'}`}>
                                        <step.icon className={`w-5 h-5 ${activeStep === index ? 'text-primary' : 'text-slate-500'}`} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
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
                            className="bg-white rounded-2xl border border-slate-200 p-8"
                        >
                            <div className="aspect-[16/9] rounded-lg overflow-hidden mb-6 bg-slate-900">
                                <video
                                    key={timelineSteps[activeStep].video}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                >
                                    <source src={timelineSteps[activeStep].video} type="video/mp4" />
                                </video>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">{timelineSteps[activeStep].title}</h3>
                            <p className="text-slate-600 mb-6">{timelineSteps[activeStep].description}</p>
                             <div className="flex flex-wrap gap-2">
                                {timelineSteps[activeStep].tags.map(tag => (
                                     <span key={tag} className="text-xs bg-primary/10 text-primary/80 px-2 py-1 rounded">
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
      <section className="relative py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to make the decision
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Not just a score. Actual evidence of how they work.
            </p>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <FeatureCard icon={BarChart3} title="Structured Scorecard" text="AI-generated ratings across key dimensions." iconColor="blue" />
              <FeatureCard icon={MessageSquare} title="Full Transcripts" text="Every conversation with stakeholders." iconColor="purple" />
              <FeatureCard icon={Video} title="Screen Recording" text="Watch their entire process if you want." iconColor="emerald" />
              <FeatureCard icon={Brain} title="AI Tool Usage" text="Do they use AI thoughtfully or blindly copy-paste?" iconColor="amber" />
              <FeatureCard icon={CheckCircle} title="Handling Feedback" text="How do they respond to pushback? Defend ideas when right?" iconColor="rose" />
              <FeatureCard icon={Users} title="Communication" text="Can they explain their work clearly and professionally?" iconColor="indigo" />
          </div>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* Comparison Section */}
      <section className="relative py-20 sm:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-6">
             <SectionReveal className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                There&apos;s a better way to hire
                </h2>
            </SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* The Old Way */}
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                    <h2 className="text-2xl font-bold text-red-600 mb-6 text-center">The Old Way</h2>
                    <div className="space-y-6">
                        {comparisonData.map((item, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-xl p-6">
                                <h3 className="font-bold text-slate-900 mb-2">{item.feature}</h3>
                                <div className="flex items-start gap-3">
                                    <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                                    <p className="text-slate-600 text-sm">{item.oldWay}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* The Skillvee Way */}
                <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                    <h2 className="text-2xl font-bold text-emerald-600 mb-6 text-center">The Skillvee Way</h2>
                     <div className="space-y-6">
                        {comparisonData.map((item, index) => (
                            <div key={index} className="bg-white border border-slate-200 rounded-xl p-6">
                                <h3 className="font-bold text-slate-900 mb-2">{item.feature}</h3>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                                    <p className="text-slate-600 text-sm">{item.skillveeWay}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
      </section>

      {/* Security & Enterprise Section */}
      <section className="relative py-20 sm:py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Enterprise-ready from day one
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Your candidate data is secure. Your compliance needs are met.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">SOC 2 Type II</h3>
                <p className="text-slate-400 text-sm">
                  Audited security controls. Your data is protected by industry-standard
                  practices.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">GDPR Compliant</h3>
                <p className="text-slate-400 text-sm">
                  Full data privacy compliance for EU candidates. Automatic data retention
                  policies.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">SSO & Integrations</h3>
                <p className="text-slate-400 text-sm">
                  SAML SSO, Greenhouse, Lever, and Workday integrations available for
                  Enterprise.
                </p>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal className="text-center mt-12">
            <Link href="/demo">
              <Button
                variant="outline"
                className="bg-transparent border-white/50 text-white hover:bg-white/10 hover:border-white"
              >
                Contact us for Enterprise
              </Button>
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* Product FAQ */}
      <section className="py-20 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Common questions
            </h2>
          </SectionReveal>
          <ProductFAQ />
        </div>
      </section>

      {/* Final CTA */}
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
              READY TO UPGRADE
              <br />
              <span className="text-primary">YOUR HIRING?</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Get a personalized demo or try a sample assessment as a candidate.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                  Request Demo
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/demo#sample">
                <Button variant="ghost" className="h-14 px-8 rounded-full text-white hover:bg-white/10 font-semibold">
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
