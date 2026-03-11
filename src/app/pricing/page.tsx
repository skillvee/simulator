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
        <section className="relative overflow-hidden pb-20 pt-32">
          {/* Animated background glow */}
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

          <div className="relative z-10 mx-auto max-w-7xl px-6 text-center sm:px-8 lg:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="text-sm text-slate-400">
                  Simple, transparent pricing
                </span>
              </div>

              <h1 className="mb-6 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                Start free.
                <br />
                <span className="text-primary">Scale as you grow.</span>
              </h1>

              <p className="mx-auto max-w-2xl text-xl text-slate-400">
                No per-assessment fees, no surprises. Upgrade when you need more
                capacity.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
            <PricingContent />

            {/* Value Props */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mx-auto mt-20 max-w-4xl"
            >
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
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
                    className="border-t-4 border-primary pt-6 text-center"
                  >
                    <div className="mb-2 text-3xl font-black text-slate-900">
                      {item.stat}
                    </div>
                    <p className="text-slate-600">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section - Matching homepage style */}
        <section className="bg-slate-50 py-24">
          <div className="mx-auto max-w-3xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                Common Questions
              </p>
              <h2 className="text-3xl font-black text-slate-900 sm:text-4xl">
                Pricing FAQ
              </h2>
            </motion.div>

            <div className="space-y-4">
              {[
                {
                  question: "What counts as an assessment?",
                  answer:
                    "Each unique candidate who completes a work simulation counts as one assessment. You can send unlimited invitations.",
                },
                {
                  question: "What happens if I exceed my monthly limit?",
                  answer:
                    "We'll notify you when you're approaching your limit. You can upgrade anytime, or purchase additional assessments at $10 each.",
                },
                {
                  question: "Do unused assessments roll over?",
                  answer:
                    "Monthly allocations reset each billing cycle. Annual plans get a 20% bonus and more flexibility.",
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-bold text-primary">Q</span>
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-semibold text-slate-900">
                        {item.question}
                      </h3>
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

        {/* CTA Section - Dark theme matching homepage */}
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
                NOT SURE WHICH PLAN?
                <br />
                <span className="text-primary">LET&apos;S TALK.</span>
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">
                Start with Free and upgrade when you need more capacity. Or
                schedule a demo to see how it works.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/demo">
                  <Button className="group h-14 rounded-full bg-white px-10 text-lg font-bold text-slate-900 shadow-xl hover:bg-slate-100">
                    Schedule a Demo
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link href="/faq">
                  <Button
                    variant="ghost"
                    className="h-14 rounded-full px-8 font-semibold text-white hover:bg-white/10"
                  >
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
