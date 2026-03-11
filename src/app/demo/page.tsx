"use client";

import { useState } from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  ArrowRight,
  Clock,
  Users,
  Calendar,
  TrendingDown,
  Brain,
  DollarSign,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

// TODO: Replace with your actual Calendly URL
const CALENDLY_URL = "https://calendly.com/german-skillvee/30min";

type FormState = "form" | "scheduling" | "submitted";

export default function DemoPage() {
  const [formState, setFormState] = useState<FormState>("form");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Send form data to backend/CRM
    // For now, simulate a brief delay then show scheduling
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsSubmitting(false);
    setFormState("scheduling");
  };

  // Listen for Calendly events
  useCalendlyEventListener({
    onEventScheduled: () => {
      setFormState("submitted");
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pb-20 pt-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                Book a Demo
              </p>

              <h1 className="mb-6 text-3xl font-black leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
                See the platform.{" "}
                <span className="text-primary">Ask the hard questions.</span>
              </h1>

              <p className="mb-8 text-lg text-slate-600 sm:text-xl">
                20 minutes. No slides. We&apos;ll show you exactly how Skillvee
                works with your roles—and you&apos;ll see why algorithm tests
                are dead.
              </p>

              {/* What you'll get */}
              <div className="mb-8 space-y-4">
                <h3 className="font-semibold text-slate-900">In your demo:</h3>
                <ul className="space-y-3">
                  {[
                    "Live walkthrough with your actual job description",
                    "See how candidates experience the simulation",
                    "Review sample candidate results and scorecards",
                    "Get honest answers about fit for your team",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 border-t border-slate-200 pt-6">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="h-4 w-4" />
                  <span>20 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="h-4 w-4" />
                  <span>Talk to a founder</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Pick your time</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Form / Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
                {formState === "form" && (
                  <>
                    <h2 className="mb-6 text-xl font-semibold text-slate-900">
                      Request your demo
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Jane Smith"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Work email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="jane@company.com"
                            required
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            type="text"
                            placeholder="Acme Corp"
                            required
                            value={formData.company}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                company: e.target.value,
                              })
                            }
                            className="h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Your role</Label>
                          <Input
                            id="role"
                            type="text"
                            placeholder="Head of Engineering"
                            value={formData.role}
                            onChange={(e) =>
                              setFormData({ ...formData, role: e.target.value })
                            }
                            className="h-12"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 w-full bg-primary text-base text-white shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl"
                      >
                        {isSubmitting ? (
                          "Loading..."
                        ) : (
                          <>
                            Continue to scheduling
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <p className="text-center text-xs text-slate-500">
                        We&apos;ll never share your info. See our{" "}
                        <a
                          href="/privacy"
                          className="text-primary hover:underline"
                        >
                          privacy policy
                        </a>
                        .
                      </p>
                    </form>
                  </>
                )}

                {formState === "scheduling" && (
                  <>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Thanks, {formData.name.split(" ")[0]}!
                        </h2>
                        <p className="text-sm text-slate-600">
                          Pick a time that works for you.
                        </p>
                      </div>
                    </div>

                    {/* Calendly Inline Widget */}
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <InlineWidget
                        url={CALENDLY_URL}
                        styles={{ height: "700px", minWidth: "320px" }}
                        prefill={{
                          name: formData.name,
                          email: formData.email,
                          customAnswers: {
                            a1: formData.company,
                            a2: formData.role,
                          },
                        }}
                        pageSettings={{
                          backgroundColor: "ffffff",
                          hideEventTypeDetails: false,
                          hideLandingPageDetails: false,
                          primaryColor: "237CF1",
                          textColor: "1e293b",
                        }}
                      />
                    </div>

                    <p className="mt-4 text-center text-xs text-slate-500">
                      No time that works?{" "}
                      <a
                        href="mailto:hi@skillvee.com"
                        className="text-primary hover:underline"
                      >
                        Email us directly
                      </a>
                    </p>
                  </>
                )}

                {formState === "submitted" && (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="mb-3 text-2xl font-semibold text-slate-900">
                      You&apos;re all set!
                    </h2>
                    <p className="mb-6 text-slate-600">
                      Check your email for the calendar invite. We&apos;ll send
                      a quick prep guide before your demo.
                    </p>
                    <div className="rounded-xl border border-primary/10 bg-primary/5 p-4">
                      <p className="text-sm text-slate-700">
                        <strong>Pro tip:</strong> Have a job description ready.
                        We&apos;ll show you exactly how Skillvee would assess
                        that role.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sample Assessment Section - Hidden until we have content to show
      <section id="sample" className="relative py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              Try Before You Talk
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              See it before you schedule
            </h2>
            <p className="text-xl text-slate-600">
              Explore a sample assessment and candidate results—no demo required.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg">💻</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Sample: Frontend Engineer
                      </h3>
                      <p className="text-sm text-slate-500">30-minute simulation</p>
                    </div>
                  </div>
                  <p className="text-slate-600 mb-6">
                    See what candidates experience: gathering requirements,
                    building a feature, and defending their approach.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5"
                  >
                    Try the simulation
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <span className="text-lg">📊</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        Sample: Candidate Results
                      </h3>
                      <p className="text-sm text-slate-500">Scorecard & artifacts</p>
                    </div>
                  </div>
                  <p className="text-slate-600 mb-6">
                    Review a completed assessment: structured scores,
                    conversation transcripts, and code review.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                  >
                    View sample results
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      */}

      {/* Why teams switch section */}
      <section className="relative bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Why Switch
            </p>
            <h2 className="mb-4 text-3xl font-black text-slate-900 sm:text-4xl lg:text-5xl">
              Why teams switch to Skillvee
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                icon: TrendingDown,
                stat: "46%",
                label: "of new hires fail",
                desc: "Within 18 months. Traditional interviews miss what matters.",
                source: "Leadership IQ",
              },
              {
                icon: Brain,
                stat: "89%",
                label: "fail due to attitude, not skills",
                desc: "Resumes can't show how someone actually works.",
                source: "Leadership IQ",
              },
              {
                icon: DollarSign,
                stat: "$14.9k",
                label: "wasted per bad hire",
                desc: "On average. One simulation costs less than one mistake.",
                source: "CareerBuilder",
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
                <item.icon className="mb-4 h-8 w-8 text-primary" />
                <div className="mb-2 text-5xl font-black text-primary lg:text-6xl">
                  {item.stat}
                </div>
                <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-900">
                  {item.label}
                </div>
                <p className="mb-2 text-slate-600">{item.desc}</p>
                <span className="text-xs text-slate-400">
                  Source: {item.source}
                </span>
              </motion.div>
            ))}
          </div>
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
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Ready to Start?
            </p>
            <h2 className="mb-6 text-4xl font-black text-white lg:text-6xl">
              STOP GUESSING.
              <br />
              <span className="text-primary">START KNOWING.</span>
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">
              See exactly how candidates perform before you make the offer.
            </p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <Button className="group h-14 rounded-full bg-white px-10 text-lg font-bold text-slate-900 shadow-xl hover:bg-slate-100">
                Book Your Demo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
