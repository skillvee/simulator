"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import PricingContent from "./PricingContent";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#020617]">
      <Navigation variant="dark" currentPage="pricing" />

      <main className="flex-1">
        {/* Hero Section - Dark theme matching homepage */}
        <section className="relative pt-32 pb-20 overflow-hidden">
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
                <span className="text-slate-400 text-sm">Simple, transparent pricing</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
                Start free.
                <br />
                <span className="text-primary">Scale as you grow.</span>
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                No per-assessment fees, no surprises. Upgrade when you need more capacity.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <PricingContent />

            {/* Value Props */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-20 max-w-4xl mx-auto"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { stat: "$0", label: "Setup fees" },
                  { stat: "Cancel", label: "Anytime, no contracts" },
                  { stat: "14-day", label: "Free trial on paid plans" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center border-t-4 border-primary pt-6"
                  >
                    <div className="text-3xl font-black text-slate-900 mb-2">{item.stat}</div>
                    <p className="text-slate-600">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section - Matching homepage style */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                Common Questions
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                Pricing FAQ
              </h2>
            </motion.div>

            <div className="space-y-4">
              {[
                {
                  question: "What counts as an assessment?",
                  answer: "Each unique candidate who completes a work simulation counts as one assessment. You can send unlimited invitations."
                },
                {
                  question: "What happens if I exceed my monthly limit?",
                  answer: "We'll notify you when you're approaching your limit. You can upgrade anytime, or purchase additional assessments at $10 each."
                },
                {
                  question: "Do unused assessments roll over?",
                  answer: "Monthly allocations reset each billing cycle. Annual plans get a 20% bonus and more flexibility."
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white border border-slate-200 hover:border-primary/30 rounded-xl p-6 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-sm">Q</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-2">{item.question}</h3>
                      <p className="text-slate-600">{item.answer}</p>
                    </div>
                  </div>
                </motion.div>
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

        {/* CTA Section - Dark theme matching homepage */}
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
                NOT SURE WHICH PLAN?
                <br />
                <span className="text-primary">LET&apos;S TALK.</span>
              </h2>
              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                Start with Free and upgrade when you need more capacity. Or schedule a demo to see how it works.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/demo">
                  <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                    Schedule a Demo
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/faq">
                  <Button variant="ghost" className="h-14 px-8 rounded-full text-white hover:bg-white/10 font-semibold">
                    View FAQ
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
