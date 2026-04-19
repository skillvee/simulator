"use client";

import { Link } from "@/i18n/routing";
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
import Footer from "@/components/landing/footer";
import Navigation from "@/components/landing/navigation";
import { SectionReveal } from "@/components/landing/section-reveal";
import { CurveDivider } from "@/components/landing/section-divider";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("product");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: t("faq.q1.question"),
      answer: t("faq.q1.answer"),
    },
    {
      question: t("faq.q2.question"),
      answer: t("faq.q2.answer"),
    },
    {
      question: t("faq.q3.question"),
      answer: t("faq.q3.answer"),
    },
    {
      question: t("faq.q4.question"),
      answer: t("faq.q4.answer"),
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
    const t = useTranslations("product");
    const [activeStep, setActiveStep] = useState(0);

    const timelineSteps = [
        {
            icon: Users,
            title: t("timeline.step1.title"),
            description: t("timeline.step1.description"),
            tags: [t("timeline.step1.tag1"), t("timeline.step1.tag2")],
            video: "/videos/product-step1.mp4"
        },
        {
            icon: Code,
            title: t("timeline.step2.title"),
            description: t("timeline.step2.description"),
            tags: [t("timeline.step2.tag1"), t("timeline.step2.tag2"), t("timeline.step2.tag3")],
            video: "/videos/product-step2.mp4"
        },
        {
            icon: MessageSquare,
            title: t("timeline.step3.title"),
            description: t("timeline.step3.description"),
            tags: [t("timeline.step3.tag1"), t("timeline.step3.tag2")],
            video: "/videos/product-step3.mp4"
        }
    ];

    const comparisonData = [
        {
            feature: t("comparison.signalQuality.title"),
            oldWay: t("comparison.signalQuality.oldWay"),
            skillveeWay: t("comparison.signalQuality.skillveeWay")
        },
        {
            feature: t("comparison.candidateExperience.title"),
            oldWay: t("comparison.candidateExperience.oldWay"),
            skillveeWay: t("comparison.candidateExperience.skillveeWay")
        },
        {
            feature: t("comparison.timeToHire.title"),
            oldWay: t("comparison.timeToHire.oldWay"),
            skillveeWay: t("comparison.timeToHire.skillveeWay")
        },
        {
            feature: t("comparison.bias.title"),
            oldWay: t("comparison.bias.oldWay"),
            skillveeWay: t("comparison.bias.skillveeWay")
        }
    ];

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
                <span className="text-slate-400 text-sm">{t("hero.badge")}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                {t("hero.title")}
                <br />
                <span className="text-primary">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12">
                {t("hero.subtitle")}
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
                {t("timeline.title")}
                </h2>
                <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                {t("timeline.subtitle")}
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
              {t("features.title")}
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {t("features.subtitle")}
            </p>
          </SectionReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <FeatureCard icon={BarChart3} title={t("features.scorecard.title")} text={t("features.scorecard.text")} iconColor="blue" />
              <FeatureCard icon={MessageSquare} title={t("features.transcripts.title")} text={t("features.transcripts.text")} iconColor="purple" />
              <FeatureCard icon={Video} title={t("features.recording.title")} text={t("features.recording.text")} iconColor="emerald" />
              <FeatureCard icon={Brain} title={t("features.aiUsage.title")} text={t("features.aiUsage.text")} iconColor="amber" />
              <FeatureCard icon={CheckCircle} title={t("features.feedback.title")} text={t("features.feedback.text")} iconColor="rose" />
              <FeatureCard icon={Users} title={t("features.communication.title")} text={t("features.communication.text")} iconColor="indigo" />
          </div>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* Comparison Section */}
      <section className="relative py-20 sm:py-24 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-6">
             <SectionReveal className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                {t("comparison.title")}
                </h2>
            </SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* The Old Way */}
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                    <h2 className="text-2xl font-bold text-red-600 mb-6 text-center">{t("comparison.oldWayLabel")}</h2>
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
                    <h2 className="text-2xl font-bold text-emerald-600 mb-6 text-center">{t("comparison.skillveeWayLabel")}</h2>
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
              {t("security.title")}
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              {t("security.subtitle")}
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t("security.soc2.title")}</h3>
                <p className="text-slate-400 text-sm">
                  {t("security.soc2.description")}
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t("security.gdpr.title")}</h3>
                <p className="text-slate-400 text-sm">
                  {t("security.gdpr.description")}
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t("security.sso.title")}</h3>
                <p className="text-slate-400 text-sm">
                  {t("security.sso.description")}
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
                {t("security.contactCta")}
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
              {t("faq.title")}
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
              {t("cta.title")}
              <br />
              <span className="text-primary">{t("cta.titleHighlight")}</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                  {t("cta.requestDemo")}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/demo#sample">
                <Button variant="ghost" className="h-14 px-8 rounded-full text-white hover:bg-white/10 font-semibold">
                  {t("cta.trySample")}
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
