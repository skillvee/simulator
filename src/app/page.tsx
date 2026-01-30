"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, X, ArrowRight } from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import HomeFAQ from "@/components/landing/HomeFAQ";
import AnimatedBackground from "@/components/landing/AnimatedBackground";
import { SectionReveal, StaggerReveal } from "@/components/landing/SectionReveal";
import { CurveDivider } from "@/components/landing/SectionDivider";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white relative">
      {/* Subtle animated background - creates visual continuity */}
      <AnimatedBackground />

      {/* Content layer */}
      <div className="relative z-10">
        <Navigation />

        {/* Hero Section */}
        <section className="relative overflow-hidden pt-8 sm:pt-12 lg:pt-16 pb-28 sm:pb-32">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left: Text Content */}
              <SectionReveal>
                <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-bold leading-tight mb-6">
                  <span className="text-gray-900">See candidates do the actual job</span>
                  <span className="text-blue-600"> before you hire them.</span>
                </h1>

                <p className="text-lg sm:text-xl text-gray-600 mb-10">
                  Role-specific work simulations that replace resumes, take-homes, and
                  gut feel. Hiring teams review standardized performance evidence—fast,
                  fair, and comparable.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <Link href="/demo">
                    <Button
                      size="lg"
                      className="min-w-[200px] h-14 text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                    >
                      Request Demo
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link href="/demo#sample">
                    <Button
                      size="lg"
                      variant="outline"
                      className="min-w-[200px] h-14 text-lg border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      See Sample Assessment
                    </Button>
                  </Link>
                </div>
              </SectionReveal>

              {/* Right: GIF/Video Placeholder */}
              <SectionReveal delay="delay-200">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/80 p-4 lg:p-6 hover:shadow-2xl transition-shadow duration-500">
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-16 h-16 bg-blue-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">🎬</span>
                      </div>
                      <p className="text-sm font-medium">Platform Demo GIF</p>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
          <CurveDivider fillColor="fill-slate-50" />
        </section>

        {/* Problem Section: The Interview Is Broken */}
        <section className="relative py-20 sm:py-24 bg-slate-50">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            {/* Header */}
            <SectionReveal className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                You&apos;ve hired the wrong person before
              </h2>
              <p className="text-xl text-gray-600">
                So has everyone. 75% of companies admit it. Here&apos;s why it keeps
                happening.
              </p>
            </SectionReveal>

            {/* Pain Point Cards */}
            <StaggerReveal className="space-y-4" staggerMs={150}>
              {[
                {
                  stat: "72%",
                  title: "AI broke your hiring funnel",
                  desc: "72% of resumes are AI-written. 45% of candidates use AI during interviews. You can't tell who's actually qualified anymore.",
                },
                {
                  stat: "46%",
                  title: "Half of new hires fail within 18 months",
                  desc: "Interviews test interview skills, not job skills. You won't know which one you hired until it's too late.",
                },
                {
                  stat: "<1%",
                  title: "One good candidate. Buried in 150 applications.",
                  desc: "You don't have time to screen them all—and most aren't even close to qualified. The needle is lost in the haystack.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 p-6 bg-white/80 backdrop-blur-sm border-l-4 border-blue-400 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <span className="text-4xl sm:text-5xl font-bold text-blue-600 min-w-[100px] sm:min-w-[120px]">
                    {item.stat}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-gray-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </StaggerReveal>

            {/* Transition to solution */}
            <SectionReveal className="text-center mt-12">
              <p className="text-xl font-medium text-blue-600">
                What if you could see how they actually work—before you hire them?
              </p>
            </SectionReveal>
          </div>
          <CurveDivider fillColor="fill-white" />
        </section>

        {/* Competitor Comparison Section - Redesigned with light theme */}
        <section className="relative py-24 sm:py-28 bg-white overflow-hidden">
          {/* Subtle background accent */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-blue-100/40 via-transparent to-indigo-100/40 rounded-full blur-3xl" />
          </div>

          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6 relative z-10">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                Your algorithm test has a problem:
                <span className="block text-blue-600 mt-2">
                  it doesn&apos;t work anymore
                </span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                HackerRank, CodeSignal, and TestGorilla were built for a different era.
                They test what candidates memorized. We show you how they work.
              </p>
            </SectionReveal>

            {/* Visual comparison cards */}
            <div className="max-w-5xl mx-auto mb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Their approach */}
                <SectionReveal>
                  <div className="h-full bg-slate-50 rounded-2xl p-8 border border-slate-200 hover:border-slate-300 transition-colors duration-300">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                        <X className="w-6 h-6 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-600">Their approach</h3>
                    </div>
                    <ul className="space-y-4">
                      {[
                        "Ban AI tools and hope no one cheats",
                        "Algorithm puzzles from 2010",
                        "Isolated coding in a vacuum",
                        "Score tells you nothing about fit",
                        "350 random tests from a library",
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="w-4 h-4 text-slate-400" />
                          </div>
                          <span className="text-gray-600">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionReveal>

                {/* What works */}
                <SectionReveal delay="delay-200">
                  <div className="h-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 hover:border-blue-300 transition-colors duration-300 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-blue-700">
                        What actually works
                      </h3>
                    </div>
                    <ul className="space-y-4">
                      {[
                        "Encourage AI—see how they use it",
                        "Real work from 2025",
                        "Live conversations with stakeholders",
                        "Watch them communicate and collaborate",
                        "One simulation tailored to your role",
                      ].map((text, i) => (
                        <li key={i} className="flex items-start gap-4">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-gray-800 font-medium">{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </SectionReveal>
              </div>
            </div>

            {/* Competitor callouts */}
            <StaggerReveal
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
              staggerMs={100}
            >
              {[
                { name: "HackerRank", desc: "Bans AI. Tests trivia. Candidates hate it." },
                {
                  name: "CodeSignal",
                  desc: 'A "GCA score" tells you nothing about how someone works.',
                },
                { name: "TestGorilla", desc: "350 disconnected tests anyone can Google." },
              ].map((comp, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all duration-300"
                >
                  <h4 className="font-bold text-gray-900 mb-2">{comp.name}</h4>
                  <p className="text-gray-500 text-sm">{comp.desc}</p>
                </div>
              ))}
            </StaggerReveal>

            <SectionReveal className="text-center mt-12">
              <p className="inline-block px-6 py-3 bg-blue-50 rounded-full border border-blue-200 text-lg font-semibold text-blue-700">
                Skillvee: One realistic day. Live stakeholders. Can&apos;t be faked.
              </p>
            </SectionReveal>
          </div>
          <CurveDivider fillColor="fill-slate-50" />
        </section>

        {/* How It Works Section */}
        <section className="relative py-20 sm:py-28 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <SectionReveal className="text-center mb-16 sm:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                From job description to hiring decision in three steps.
              </p>
            </SectionReveal>

            {/* Step 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 sm:mb-28">
              <SectionReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    1
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Create Your Simulation
                  </h3>
                </div>
                <p className="text-lg text-gray-600 mb-8">
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
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">{item.title}</span>
                        <p className="text-gray-600 text-sm">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionReveal>
              <SectionReveal delay="delay-200">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/80 p-4 lg:p-6 hover:shadow-2xl transition-shadow duration-500">
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-16 h-16 bg-blue-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">📝</span>
                      </div>
                      <p className="text-sm font-medium">Simulation Builder Screenshot</p>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20 sm:mb-28">
              <SectionReveal delay="delay-200" className="order-2 lg:order-1">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/80 p-4 lg:p-6 hover:shadow-2xl transition-shadow duration-500">
                  <div className="aspect-[4/3] bg-gradient-to-br from-indigo-50 to-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-16 h-16 bg-indigo-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">💬</span>
                      </div>
                      <p className="text-sm font-medium">Candidate Experience Screenshot</p>
                    </div>
                  </div>
                </div>
              </SectionReveal>
              <SectionReveal className="order-1 lg:order-2">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    2
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Candidates Do Real Work
                  </h3>
                </div>
                <p className="text-lg text-gray-600 mb-8">
                  Send a link. Candidates experience a realistic first day—gathering
                  requirements, making decisions, and delivering work. 30-45 minutes, no
                  scheduling.
                </p>
                <ul className="space-y-4">
                  {[
                    {
                      title: "Live stakeholder conversations",
                      desc: "AI-powered voice calls with PM, manager, teammates",
                    },
                    {
                      title: "AI tools encouraged",
                      desc: "See how they actually work in 2025",
                    },
                    {
                      title: "Screen recorded",
                      desc: "Watch their entire process if you want",
                    },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">{item.title}</span>
                        <p className="text-gray-600 text-sm">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionReveal>
            </div>

            {/* Step 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <SectionReveal>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    3
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Review Standardized Evidence
                  </h3>
                </div>
                <p className="text-lg text-gray-600 mb-8">
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
                      <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-gray-900">{item.title}</span>
                        <p className="text-gray-600 text-sm">{item.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionReveal>
              <SectionReveal delay="delay-200">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/80 p-4 lg:p-6 hover:shadow-2xl transition-shadow duration-500">
                  <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-gray-50 rounded-xl flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-16 h-16 bg-emerald-100 rounded-xl mx-auto mb-3 flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="text-sm font-medium">Results Dashboard Screenshot</p>
                    </div>
                  </div>
                </div>
              </SectionReveal>
            </div>
          </div>
          <CurveDivider fillColor="fill-white" />
        </section>

        {/* Roles We Support Section */}
        <section className="relative py-20 sm:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <SectionReveal className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                One platform. Any role.
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Custom simulations tailored to your job description—technical or
                otherwise.
              </p>
            </SectionReveal>

            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                  <div className="hidden md:block" />
                  <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-6">
                    Sample Simulation
                  </div>
                </div>

                <StaggerReveal className="space-y-3" staggerMs={100}>
                  {[
                    {
                      icon: "💻",
                      role: "Software Engineers",
                      desc: "Gather requirements from PM and stakeholders, build the feature, defend your approach",
                      cardClass: "bg-gradient-to-r from-blue-50 to-white border-blue-100 hover:border-blue-300",
                      iconClass: "bg-blue-100 group-hover:bg-blue-200",
                    },
                    {
                      icon: "📊",
                      role: "Product Managers",
                      desc: "Clarify business needs, prioritize competing requests, present your roadmap",
                      cardClass: "bg-gradient-to-r from-purple-50 to-white border-purple-100 hover:border-purple-300",
                      iconClass: "bg-purple-100 group-hover:bg-purple-200",
                    },
                    {
                      icon: "🔬",
                      role: "Data Scientists",
                      desc: "Understand the business question, analyze data, communicate findings to non-technical stakeholders",
                      cardClass: "bg-gradient-to-r from-emerald-50 to-white border-emerald-100 hover:border-emerald-300",
                      iconClass: "bg-emerald-100 group-hover:bg-emerald-200",
                    },
                    {
                      icon: "🎯",
                      role: "Program Managers",
                      desc: "Coordinate across teams, resolve conflicting priorities, drive alignment",
                      cardClass: "bg-gradient-to-r from-amber-50 to-white border-amber-100 hover:border-amber-300",
                      iconClass: "bg-amber-100 group-hover:bg-amber-200",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`group grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 rounded-xl p-4 border hover:shadow-md transition-all duration-300 ${item.cardClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${item.iconClass}`}
                        >
                          <span className="text-lg">{item.icon}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{item.role}</span>
                      </div>
                      <div className="flex items-center text-gray-600 px-2">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </StaggerReveal>
              </div>
            </div>
          </div>
          <CurveDivider fillColor="fill-slate-50" />
        </section>

        {/* FAQ Section */}
        <HomeFAQ />

        {/* Final CTA Section */}
        <section className="relative py-24 sm:py-32 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden">
          {/* Animated circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="cta-circle absolute top-10 left-10 w-32 h-32 border-2 border-white/10 rounded-full" />
            <div className="cta-circle absolute bottom-10 right-10 w-48 h-48 border-2 border-white/10 rounded-full" />
            <div className="cta-circle absolute top-1/2 left-1/4 w-24 h-24 border-2 border-white/5 rounded-full" />
            <div className="cta-circle absolute top-1/3 right-1/4 w-16 h-16 border-2 border-white/10 rounded-full" />
            {/* Gradient glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-6 text-center relative z-10">
            <SectionReveal>
              <Badge className="bg-yellow-400 text-yellow-900 mb-6 sm:mb-8 text-sm font-semibold">
                Ready to hire better?
              </Badge>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                <span className="text-white">Stop interviewing. </span>
                <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Start watching them work.</span>
              </h2>
              <p className="text-xl text-blue-100 mb-4 max-w-2xl mx-auto">
                See exactly how candidates perform before you make the offer.
              </p>
              <p className="text-xl text-white font-semibold mb-10">
                No more gut feel. No more bad hires.
              </p>

              <Link href="/demo">
                <Button
                  size="lg"
                  className="min-w-[220px] h-14 text-lg bg-white text-blue-700 hover:bg-blue-50 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 font-semibold"
                >
                  Request Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </SectionReveal>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
