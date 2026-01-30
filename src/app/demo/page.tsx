"use client";

import { useState } from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Clock, Users, Calendar, Building2 } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import AnimatedBackground from "@/components/landing/AnimatedBackground";
import { SectionReveal } from "@/components/landing/SectionReveal";
import { CurveDivider } from "@/components/landing/SectionDivider";

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
    <div className="min-h-screen bg-white relative">
      <AnimatedBackground />

      <div className="relative z-10">
        <Navigation />

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-20 sm:pb-24">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              {/* Left: Content */}
              <SectionReveal>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
                  <span className="text-gray-900">See the platform. </span>
                  <span className="text-blue-600">Ask the hard questions.</span>
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 mb-8">
                  20 minutes. No slides. We&apos;ll show you exactly how Skillvee
                  works with your roles—and you&apos;ll see why algorithm tests
                  are dead.
                </p>

                {/* What you'll get */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-semibold text-gray-900">In your demo:</h3>
                  <ul className="space-y-3">
                    {[
                      "Live walkthrough with your actual job description",
                      "See how candidates experience the simulation",
                      "Review sample candidate results and scorecards",
                      "Get honest answers about fit for your team",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Trust indicators */}
                <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>20 minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>Talk to a founder</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Pick your time</span>
                  </div>
                </div>
              </SectionReveal>

              {/* Right: Form / Calendar */}
              <SectionReveal delay="delay-200">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
                  {formState === "form" && (
                    <>
                      <h2 className="text-xl font-semibold text-gray-900 mb-6">
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
                          className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
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

                        <p className="text-xs text-gray-500 text-center">
                          We&apos;ll never share your info. See our{" "}
                          <a href="/privacy" className="text-blue-600 hover:underline">
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
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            Thanks, {formData.name.split(" ")[0]}!
                          </h2>
                          <p className="text-sm text-gray-600">
                            Pick a time that works for you.
                          </p>
                        </div>
                      </div>

                      {/* Calendly Inline Widget */}
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">
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
                            primaryColor: "2563eb",
                            textColor: "1f2937",
                          }}
                        />
                      </div>

                      <p className="text-xs text-gray-500 text-center mt-4">
                        No time that works?{" "}
                        <a
                          href="mailto:hi@skillvee.com"
                          className="text-blue-600 hover:underline"
                        >
                          Email us directly
                        </a>
                      </p>
                    </>
                  )}

                  {formState === "submitted" && (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                        You&apos;re all set!
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Check your email for the calendar invite. We&apos;ll send a
                        quick prep guide before your demo.
                      </p>
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <p className="text-sm text-blue-800">
                          <strong>Pro tip:</strong> Have a job description ready.
                          We&apos;ll show you exactly how Skillvee would assess that role.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </SectionReveal>
            </div>
          </div>
          <CurveDivider fillColor="fill-slate-50" />
        </section>

        {/* Sample Assessment Section */}
        <section id="sample" className="relative py-20 sm:py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <SectionReveal className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                See it before you schedule
              </h2>
              <p className="text-xl text-gray-600">
                Explore a sample assessment and candidate results—no demo required.
              </p>
            </SectionReveal>

            <SectionReveal delay="delay-200">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Sample Assessment Preview */}
                  <div className="p-6 sm:p-8 border-b md:border-b-0 md:border-r border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">💻</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Sample: Frontend Engineer
                        </h3>
                        <p className="text-sm text-gray-500">30-minute simulation</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-6">
                      See what candidates experience: gathering requirements,
                      building a feature, and defending their approach.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      Try the simulation
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>

                  {/* Sample Results Preview */}
                  <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-lg">📊</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Sample: Candidate Results
                        </h3>
                        <p className="text-sm text-gray-500">Scorecard & artifacts</p>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-6">
                      Review a completed assessment: structured scores,
                      conversation transcripts, and code review.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    >
                      View sample results
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>
          <CurveDivider fillColor="fill-white" />
        </section>

        {/* Why teams switch section */}
        <section className="relative py-20 sm:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <SectionReveal className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Why teams switch to Skillvee
              </h2>
            </SectionReveal>

            <SectionReveal delay="delay-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Building2,
                    stat: "37%",
                    label: "faster time-to-hire",
                    desc: "No more scheduling five rounds of interviews. One simulation, one decision.",
                  },
                  {
                    icon: Users,
                    stat: "2x",
                    label: "better candidate quality",
                    desc: "See real work, not interview polish. Bad fits filter themselves out.",
                  },
                  {
                    icon: CheckCircle,
                    stat: "$14.9k",
                    label: "saved per bad hire avoided",
                    desc: "The average cost of a wrong hire. One simulation pays for itself.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100 hover:border-blue-200 hover:shadow-md transition-all duration-300"
                  >
                    <item.icon className="w-8 h-8 text-blue-600 mb-4" />
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {item.stat}
                    </div>
                    <div className="text-sm font-medium text-blue-600 mb-3">
                      {item.label}
                    </div>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </SectionReveal>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
