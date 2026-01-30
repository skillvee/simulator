"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  MessageSquare,
  Brain,
  Users,
  ArrowRight,
  Clock,
  Zap,
  CheckCircle,
  FileText,
  Video,
  BarChart3,
  Shield,
  Lock,
  Globe,
  ChevronDown,
  Send,
  Eye,
  GitCompare,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import { SectionReveal, StaggerReveal } from "@/components/landing/SectionReveal";
import { CurveDivider } from "@/components/landing/SectionDivider";
import { useState } from "react";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="product" />

      {/* Hero Section - Product Demo Focus */}
      <section className="relative pt-8 sm:pt-12 lg:pt-16 pb-28 sm:pb-32 overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/50 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6 relative z-10">
          <SectionReveal className="text-center max-w-4xl mx-auto mb-12">
            <div className="text-sm font-semibold text-blue-600 mb-4 uppercase tracking-wide">
              See It In Action
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900">
              Watch a candidate complete a real simulation
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              This is what your hiring team sees after a candidate finishes. Real
              conversations. Real work. Real signal.
            </p>
          </SectionReveal>

          {/* Product Demo Video Placeholder */}
          <SectionReveal delay="delay-200" className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 sm:p-4">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer">
                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 text-blue-600 ml-1" />
                  </div>
                  <p className="text-white/90 mt-4 font-medium">
                    Watch 2-minute product demo
                  </p>
                </div>
                {/* Placeholder label */}
                <div className="absolute bottom-4 right-4 bg-black/50 text-white/70 text-xs px-3 py-1 rounded">
                  Video: Full product walkthrough showing simulation creation → candidate
                  experience → review dashboard
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* Your Workflow - Employer View */}
      <section className="relative py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Your workflow: 5 minutes to set up, zero time to proctor
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Create once. Send to many. Review the evidence. Make better hires.
            </p>
          </SectionReveal>

          {/* 3-Step Horizontal Flow */}
          <SectionReveal>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Step 1 */}
                <div className="relative">
                  <div className="bg-white rounded-2xl p-8 h-full shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">1</div>
                    <h3 className="text-lg font-semibold text-blue-600 mb-3">Paste your JD</h3>
                    <p className="text-gray-600">
                      AI generates a realistic simulation based on your job description.
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="bg-white rounded-2xl p-8 h-full shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                      <Send className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">2</div>
                    <h3 className="text-lg font-semibold text-blue-600 mb-3">Send the link</h3>
                    <p className="text-gray-600">
                      Candidates complete it on their own time. No scheduling required.
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <div className="bg-white rounded-2xl p-8 h-full shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                      <Eye className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-4xl font-bold text-gray-900 mb-1">3</div>
                    <h3 className="text-lg font-semibold text-blue-600 mb-3">Review & decide</h3>
                    <p className="text-gray-600">
                      Watch recordings, read transcripts, compare candidates side-by-side.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
        <CurveDivider fillColor="fill-white" />
      </section>

      {/* The Simulation Experience - Deep Dive */}
      <section className="relative py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              A realistic day at work—not algorithm puzzles
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Candidates experience what the job actually feels like. You see how they
              actually work.
            </p>
          </SectionReveal>

          {/* Timeline/Journey View */}
          <div className="max-w-5xl mx-auto">
            <StaggerReveal className="space-y-6" staggerMs={150}>
              {/* Stage 1: Gather requirements (includes manager kickoff) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Gather requirements
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Candidate joins a kickoff call with their AI manager, then chats
                        with stakeholders to clarify the task. Great candidates ask smart
                        questions. Others dive in blind. You&apos;ll see the difference.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          Manager kickoff
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          Stakeholder chat
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="aspect-[16/10] bg-gradient-to-br from-blue-50 to-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <span className="text-xl">💬</span>
                      </div>
                      <p className="text-xs font-medium">
                        Screenshot: Manager call and stakeholder chat
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 2: Do the work */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="bg-white rounded-xl border border-gray-200 p-3 order-2 lg:order-1">
                  <div className="aspect-[16/10] bg-gradient-to-br from-emerald-50 to-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <span className="text-xl">💻</span>
                      </div>
                      <p className="text-xs font-medium">
                        Screenshot: Candidate working with screen recording indicator
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm order-1 lg:order-2">
                  <div className="flex items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Do the actual work
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Build the feature, analyze the data, create the roadmap—whatever
                        the role requires. Screen is recorded. AI tools are encouraged. We
                        want to see how they really work.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                          Screen recorded
                        </span>
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                          AI tools allowed
                        </span>
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                          ~20-30 minutes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stage 3: Present & Defend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-amber-600">3</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Present and defend
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Submit the work and face questions. The AI pushes back on
                        decisions. Do they defend good ideas? Accept valid criticism? Fold
                        at the first sign of disagreement?
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                          Voice call
                        </span>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">
                          Challenging questions
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="aspect-[16/10] bg-gradient-to-br from-amber-50 to-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <span className="text-xl">🎤</span>
                      </div>
                      <p className="text-xs font-medium">
                        Screenshot: PR defense call with challenging questions
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </StaggerReveal>
          </div>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* What You Get - Concrete Deliverables */}
      <section className="relative py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to make the decision
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Not just a score. Actual evidence of how they work.
            </p>
          </SectionReveal>

          <StaggerReveal className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto" staggerMs={100}>
              {/* Deliverable 1: Scorecard */}
              <Card className="border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-gray-50 rounded-t-lg flex items-center justify-center border-b">
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="text-xs font-medium px-4">
                        Screenshot: Structured scorecard with dimension ratings
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Structured Scorecard
                    </h3>
                    <p className="text-gray-600 text-sm">
                      AI-generated ratings across key dimensions: communication,
                      problem-solving, execution quality, AI usage, and handling feedback.
                      Compare candidates consistently.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Deliverable 2: Transcripts */}
              <Card className="border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-gradient-to-br from-purple-50 to-gray-50 rounded-t-lg flex items-center justify-center border-b">
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-xs font-medium px-4">
                        Screenshot: Conversation transcript with highlights
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Full Transcripts
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Every conversation with stakeholders. See what questions they asked,
                      how they clarified requirements, and how they handled pushback.
                      AI-highlighted key moments.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Deliverable 3: Recording */}
              <Card className="border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-0">
                  <div className="aspect-[4/3] bg-gradient-to-br from-emerald-50 to-gray-50 rounded-t-lg flex items-center justify-center border-b">
                    <div className="text-center text-gray-400">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                        <Video className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-xs font-medium px-4">
                        Screenshot: Screen recording player with timeline
                      </p>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      Screen Recording
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Watch their entire process if you want. See how they used AI tools,
                      how they debugged, how they approached the problem. Skip to key
                      moments or watch it all.
                    </p>
                  </div>
                </CardContent>
              </Card>
          </StaggerReveal>

          {/* Additional deliverables row */}
          <SectionReveal className="mt-8 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-200">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Work Artifacts</p>
                  <p className="text-sm text-gray-500">Code, docs, or deliverables</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-200">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Time Analysis</p>
                  <p className="text-sm text-gray-500">How they allocated their time</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-200">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Side-by-Side Compare</p>
                  <p className="text-sm text-gray-500">Stack rank your candidates</p>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
        <CurveDivider fillColor="fill-white" />
      </section>

      {/* Signals Grid - What You Learn */}
      <section className="relative py-20 sm:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Signals you can&apos;t get from algorithm tests
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Coding tests tell you if someone can code. We tell you if they can do the
              job.
            </p>
          </SectionReveal>

          <SectionReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              <Card className="bg-white border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Requirement gathering
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Do they ask the right questions? How do they navigate ambiguity with
                    stakeholders? Do they make assumptions or clarify?
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Brain className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">AI tool usage</h3>
                  <p className="text-gray-600 text-sm">
                    Do they use AI thoughtfully or blindly copy-paste? Do they verify
                    output? Can they explain what AI generated vs. their own work?
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Execution quality
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Technical skill and problem-solving visible in real work. Not memorized
                    solutions or LeetCode patterns.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Communication</h3>
                  <p className="text-gray-600 text-sm">
                    Can they explain their work clearly? Translate technical concepts to
                    business impact? Write professionally?
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Handling feedback
                  </h3>
                  <p className="text-gray-600 text-sm">
                    How do they respond to pushback? Defend ideas when right? Accept
                    criticism gracefully? Adapt or dig in?
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Work style</h3>
                  <p className="text-gray-600 text-sm">
                    Process preferences, seniority calibration, and how they&apos;d fit
                    your team culture and working style.
                  </p>
                </CardContent>
              </Card>
            </div>
          </SectionReveal>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* Social Proof Section */}
      <section className="relative py-20 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-4">
              Trusted by hiring teams
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Companies using Skillvee
            </h2>
          </SectionReveal>

          {/* Logo placeholder row */}
          <SectionReveal className="mb-16">
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-32 h-12 bg-gray-200 rounded flex items-center justify-center"
                >
                  <span className="text-xs text-gray-400">Logo {i}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-400 mt-4">
              Placeholder: Add customer logos when available
            </p>
          </SectionReveal>

          {/* Testimonial */}
          <SectionReveal className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 sm:p-10 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="text-5xl text-blue-300">&ldquo;</div>
                <div>
                  <p className="text-lg sm:text-xl text-gray-700 mb-6 italic">
                    Placeholder: Add a compelling customer quote here. Something like
                    &ldquo;We reduced bad hires by 40% and our engineering managers
                    actually enjoy reviewing candidates now.&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-full" />
                    <div>
                      <p className="font-semibold text-gray-900">Customer Name</p>
                      <p className="text-sm text-gray-500">
                        Title, Company
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionReveal>
        </div>
        <CurveDivider fillColor="fill-gray-900" />
      </section>

      {/* Security & Enterprise Section */}
      <section className="relative py-20 sm:py-24 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
          <SectionReveal className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Enterprise-ready from day one
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
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
                <p className="text-gray-400 text-sm">
                  Audited security controls. Your data is protected by industry-standard
                  practices.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">GDPR Compliant</h3>
                <p className="text-gray-400 text-sm">
                  Full data privacy compliance for EU candidates. Automatic data retention
                  policies.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">SSO & Integrations</h3>
                <p className="text-gray-400 text-sm">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Common questions
            </h2>
          </SectionReveal>

          <ProductFAQ />

          <div className="text-center mt-8">
            <Link
              href="/faq"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              See all questions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white/10 rounded-full" />
          <div className="absolute bottom-10 right-10 w-48 h-48 border-2 border-white/10 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-6 text-center relative z-10">
          <SectionReveal>
            <Badge className="bg-yellow-400 text-yellow-900 mb-6 sm:mb-8 text-sm font-semibold">
              See the difference
            </Badge>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              <span className="text-white">Ready to </span>
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">see it yourself?</span>
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Get a personalized demo or try a sample assessment as a candidate.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button
                  size="lg"
                  className="min-w-[200px] h-14 text-lg bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                >
                  Request Demo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/demo#sample">
                <Button
                  size="lg"
                  variant="outline"
                  className="min-w-[200px] h-14 text-lg bg-transparent border-2 border-white text-white hover:bg-white/10"
                >
                  Try Sample Assessment
                </Button>
              </Link>
            </div>
          </SectionReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}

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
    {
      question: "How accurate is the AI evaluation?",
      answer:
        "The AI provides structured signals, not final decisions. You review the transcripts, recordings, and artifacts yourself. Think of it as a well-organized evidence package, not a black-box score.",
    },
    {
      question: "Does it work for non-technical roles?",
      answer:
        "Yes. We support any role where you can define realistic work tasks: product managers, data scientists, program managers, operations, and more. If it can be simulated, we can assess it.",
    },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="bg-white border-2 border-gray-100 hover:border-blue-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg"
        >
          <button
            className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-blue-50/50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <div className="flex items-start space-x-4 flex-1">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 font-bold text-sm">Q</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-lg pr-4">{faq.question}</h3>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="px-6 pb-5 animate-fade-in">
              <div className="pl-12 text-gray-600 leading-relaxed">{faq.answer}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
