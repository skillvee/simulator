"use client";

import { useState } from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Clock, Users, Calendar, TrendingDown, Brain, DollarSign } from "lucide-react";
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
      <section className="relative overflow-hidden pt-32 pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                Book a Demo
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-tight">
                See the platform.{" "}
                <span className="text-primary">Ask the hard questions.</span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 mb-8">
                20 minutes. No slides. We&apos;ll show you exactly how Skillvee
                works with your roles—and you&apos;ll see why algorithm tests
                are dead.
              </p>

              {/* What you'll get */}
              <div className="space-y-4 mb-8">
                <h3 className="font-semibold text-slate-900">In your demo:</h3>
                <ul className="space-y-3">
                  {[
                    "Live walkthrough with your actual job description",
                    "See how candidates experience the simulation",
                    "Review sample candidate results and scorecards",
                    "Get honest answers about fit for your team",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span>20 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Users className="w-4 h-4" />
                  <span>Talk to a founder</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="w-4 h-4" />
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
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
                {formState === "form" && (
                  <>
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">
                      Request your demo
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              setFormData({ ...formData, email: e.target.value })
                            }
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            type="text"
                            placeholder="Acme Corp"
                            required
                            value={formData.company}
                            onChange={(e) =>
                              setFormData({ ...formData, company: e.target.value })
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
                        className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {isSubmitting ? (
                          "Loading..."
                        ) : (
                          <>
                            Continue to scheduling
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-slate-500 text-center">
                        We&apos;ll never share your info. See our{" "}
                        <a href="/privacy" className="text-primary hover:underline">
                          privacy policy
                        </a>
                        .
                      </p>
                    </form>
                  </>
                )}

                {formState === "scheduling" && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
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
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
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

                    <p className="text-xs text-slate-500 text-center mt-4">
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
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-3">
                      You&apos;re all set!
                    </h2>
                    <p className="text-slate-600 mb-6">
                      Check your email for the calendar invite. We&apos;ll send a
                      quick prep guide before your demo.
                    </p>
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                      <p className="text-sm text-slate-700">
                        <strong>Pro tip:</strong> Have a job description ready.
                        We&apos;ll show you exactly how Skillvee would assess that role.
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
      <section className="relative py-24 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              Why Switch
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              Why teams switch to Skillvee
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                <item.icon className="w-8 h-8 text-primary mb-4" />
                <div className="text-5xl lg:text-6xl font-black text-primary mb-2">
                  {item.stat}
                </div>
                <div className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">
                  {item.label}
                </div>
                <p className="text-slate-600 mb-2">{item.desc}</p>
                <span className="text-xs text-slate-400">Source: {item.source}</span>
              </motion.div>
            ))}
          </div>
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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              Ready to Start?
            </p>
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
              STOP GUESSING.
              <br />
              <span className="text-primary">START KNOWING.</span>
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              See exactly how candidates perform before you make the offer.
            </p>
            <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                Book Your Demo
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
