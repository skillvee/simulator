"use client";

/**
 * Skillvee Homepage
 * - Hero: Text on left, product demo video on right (side-by-side layout)
 * - Credibility strip, problem section, how it works, roles, FAQ, CTA
 */

import { useState } from "react";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Code,
  CheckCircle,
  BarChart3,
  Users,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Footer from "@/components/landing/footer";
import Navigation from "@/components/landing/navigation";

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
      {/* Video container with contrast-enhancing frame */}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 ring-1 ring-white/15">
        {/* Ambient glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 blur-2xl opacity-60" />

        {/* Video - autoplays, loops, muted - brightness boosted for dark content */}
        <div className="relative aspect-video bg-slate-900">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src="/videos/hero-pitch.mp4" type="video/mp4" />
          </video>

          {/* Subtle edge vignette to lift video from background */}
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl pointer-events-none" />
        </div>
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const t = useTranslations("landing");

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
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 xl:px-20 w-full">
          <div className="grid lg:grid-cols-[1fr,1.2fr] gap-12 lg:gap-16 items-center">
            {/* Left side - Text content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.05] mb-6">
                {t("hero.title")}
                <br />
                <span className="text-primary">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 max-w-xl mb-8 lg:pr-8">
                {t("hero.subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                <Link href="/demo">
                  <Button className="h-14 px-8 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl shadow-white/10 hover:bg-slate-100 group">
                    {t("hero.requestDemo")}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
                style={{ width: "auto", height: "auto" }}
              />
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 text-sm">🏆</span>
              </div>
              <span className="text-slate-600 text-sm font-medium">
                {t("credibility.deepmindWinner")}
              </span>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-300" />

            {/* Backed By */}
            <div className="flex items-center gap-5">
              <span className="text-slate-500 text-sm">{t("credibility.backedBy")}</span>
              <Image
                src="/startx.png"
                alt="StartX"
                width={90}
                height={28}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
              />
              <Image
                src="/stanford-logo.png"
                alt="Stanford"
                width={110}
                height={28}
                className="object-contain"
                style={{ width: "auto", height: "auto" }}
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
              {t("problem.label")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              {t("problem.title")}
            </h2>
            <p className="text-xl text-slate-600">
              {t("problem.subtitle")}
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-12 mt-20">
            {[
              { stat: t("problem.stat1.value"), text: t("problem.stat1.text") },
              { stat: t("problem.stat2.value"), text: t("problem.stat2.text") },
              { stat: t("problem.stat3.value"), text: t("problem.stat3.text") },
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
              {t("howItWorks.label")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              {t("howItWorks.title")}
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </motion.div>

          {/* Step 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,2fr] gap-12 lg:gap-16 items-center mb-20 sm:mb-28">
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
                  {t("howItWorks.step1.title")}
                </h3>
              </div>
              <p className="text-lg text-slate-600 mb-8">
                {t("howItWorks.step1.description")}
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: t("howItWorks.step1.point1.title"),
                    desc: t("howItWorks.step1.point1.desc"),
                  },
                  {
                    title: t("howItWorks.step1.point2.title"),
                    desc: t("howItWorks.step1.point2.desc"),
                  },
                  { title: t("howItWorks.step1.point3.title"), desc: t("howItWorks.step1.point3.desc") },
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
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100">
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
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
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-12 lg:gap-16 items-center mb-20 sm:mb-28">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="order-2 lg:order-1"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 lg:p-3 hover:shadow-2xl transition-shadow duration-500 overflow-hidden">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100">
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
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
                  {t("howItWorks.step2.title")}
                </h3>
              </div>
              <p className="text-lg text-slate-600 mb-8">
                {t("howItWorks.step2.description")}
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: t("howItWorks.step2.point1.title"),
                    desc: t("howItWorks.step2.point1.desc"),
                  },
                  {
                    title: t("howItWorks.step2.point2.title"),
                    desc: t("howItWorks.step2.point2.desc"),
                  },
                  {
                    title: t("howItWorks.step2.point3.title"),
                    desc: t("howItWorks.step2.point3.desc"),
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,2fr] gap-12 lg:gap-16 items-center">
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
                  {t("howItWorks.step3.title")}
                </h3>
              </div>
              <p className="text-lg text-slate-600 mb-8">
                {t("howItWorks.step3.description")}
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: t("howItWorks.step3.point1.title"),
                    desc: t("howItWorks.step3.point1.desc"),
                  },
                  {
                    title: t("howItWorks.step3.point2.title"),
                    desc: t("howItWorks.step3.point2.desc"),
                  },
                  {
                    title: t("howItWorks.step3.point3.title"),
                    desc: t("howItWorks.step3.point3.desc"),
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
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-slate-100">
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
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
              {t("roles.label")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              {t("roles.title")}
            </h2>
            <p className="text-xl text-slate-600">
              {t("roles.subtitle")}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: t("roles.softwareEngineers.title"), icon: Code, color: "blue", desc: t("roles.softwareEngineers.desc") },
              { role: t("roles.productManagers.title"), icon: Users, color: "purple", desc: t("roles.productManagers.desc") },
              { role: t("roles.dataScientists.title"), icon: BarChart3, color: "emerald", desc: t("roles.dataScientists.desc") },
              { role: t("roles.programManagers.title"), icon: TrendingUp, color: "amber", desc: t("roles.programManagers.desc") },
              { role: t("roles.sales.title"), icon: DollarSign, color: "rose", desc: t("roles.sales.desc") },
              { role: t("roles.customerSuccess.title"), icon: Users, color: "cyan", desc: t("roles.customerSuccess.desc") },
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
              {t("faq.label")}
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              {t("faq.title")}
            </h2>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                question: t("faq.question1.question"),
                answer: t("faq.question1.answer")
              },
              {
                question: t("faq.question2.question"),
                answer: t.rich("faq.question2.answer", {
                  em: (chunks) => <em>{chunks}</em>,
                  strong: (chunks) => <strong>{chunks}</strong>,
                  br: () => <br />
                })
              },
              {
                question: t("faq.question3.question"),
                answer: t("faq.question3.answer")
              },
              {
                question: t("faq.question4.question"),
                answer: t("faq.question4.answer")
              },
              {
                question: t("faq.question5.question"),
                answer: t.rich("faq.question5.answer", {
                  em: (chunks) => <em>{chunks}</em>,
                  strong: (chunks) => <strong>{chunks}</strong>,
                  br: () => <br />
                })
              },
              {
                question: t("faq.question6.question"),
                answer: t.rich("faq.question6.answer", {
                  em: (chunks) => <em>{chunks}</em>,
                  strong: (chunks) => <strong>{chunks}</strong>,
                  br: () => <br />
                })
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
              {t("faq.viewAll")}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          CTA SECTION
          ============================================ */}
      <section className="py-32 bg-[#020617] relative overflow-hidden">
        {/* Ambient blue glow - top right */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[200px] pointer-events-none"
        />
        {/* Ambient blue glow - bottom left */}
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.08, 0.15, 0.08],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[200px] pointer-events-none"
        />
        {/* Central glow behind CTA */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-primary/20 rounded-full blur-[150px] pointer-events-none"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
              {t("cta.title")}
              <br />
              <span className="text-primary">{t("cta.titleHighlight")}</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <Link href="/demo">
              <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                {t("cta.requestDemo")}
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
