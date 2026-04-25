"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Bot,
  Target,
  Sparkles,
  Phone,
  PhoneOff,
  CheckCircle2,
  Play,
  BarChart3,
  Maximize2,
  Minimize2,
  XCircle,
  Trophy,
  Rocket,
  Database,
  Repeat,
  Building2,
  Users,
  Code2,
  Briefcase,
  ArrowRight,
  Mail,
} from "lucide-react";

/* ============================================================
   Skillvee — VC Pitch Deck V2
   12 slides. English-only (US VC audience).
   ============================================================ */

type SlideKind =
  | "cover"
  | "problem"
  | "insight"
  | "solution"
  | "product-build"
  | "product-evaluate"
  | "why-now"
  | "market"
  | "business-gtm"
  | "moat-competition"
  | "team-traction"
  | "ask";

type Slide = {
  id: string;
  kind: SlideKind;
  layout: "split" | "full";
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

const SLIDES: Slide[] = [
  { id: "cover", kind: "cover", layout: "full", title: "" },
  {
    id: "problem",
    kind: "problem",
    layout: "split",
    eyebrow: "The Problem",
    title: "Hiring broke\nin the AI era.",
    subtitle:
      "Every filter recruiters used to vet candidates stopped working overnight.",
  },
  {
    id: "insight",
    kind: "insight",
    layout: "full",
    title: "",
  },
  {
    id: "solution",
    kind: "solution",
    layout: "split",
    eyebrow: "Our Solution",
    title: "A 45-minute simulation\nof the real job.",
    subtitle:
      "Candidates spend a day at work — talking to AI stakeholders, shipping real artifacts, defending decisions. Every minute is captured and evaluated.",
  },
  {
    id: "product-build",
    kind: "product-build",
    layout: "split",
    eyebrow: "Product · 1 of 2",
    title: "Build a sim in minutes.\nRun it like a day at work.",
    subtitle:
      "Recruiters describe the role in chat — Skillvee generates the scenario, the AI coworkers, and the deliverables. Candidates join via link and start working.",
  },
  {
    id: "product-evaluate",
    kind: "product-evaluate",
    layout: "split",
    eyebrow: "Product · 2 of 2",
    title: "AI watches every minute.\nRanks every candidate.",
    subtitle:
      "Gemini multimodal scores 8 dimensions of how candidates actually work. Recruiters get a ranked shortlist with evidence — not vibes.",
  },
  {
    id: "why-now",
    kind: "why-now",
    layout: "split",
    eyebrow: "Why Now",
    title: "Two AI unlocks made\nthis shippable in 2025.",
    subtitle:
      "This was sci-fi 12 months ago. The model arrived — we're not waiting for it.",
  },
  {
    id: "market",
    kind: "market",
    layout: "split",
    eyebrow: "Market",
    title: "$3B beachhead.\n$250B endgame.",
    subtitle:
      "We start in pre-hire assessments — a $3B market growing 16% a year — and expand into the full talent acquisition stack as verified work data becomes the matching layer.",
  },
  {
    id: "business-gtm",
    kind: "business-gtm",
    layout: "split",
    eyebrow: "Business Model · GTM",
    title: "Land cheap.\nExpand fast.",
    subtitle:
      "SaaS with freemium entry. Beachhead is enterprise eng teams hiring 5+ devs/month — highest stakes, highest willingness to pay. Then design, product, and every white-collar role.",
  },
  {
    id: "moat-competition",
    kind: "moat-competition",
    layout: "split",
    eyebrow: "Moat · Competition",
    title: "Competitors can copy\nthe product. Not the data.",
    subtitle:
      "Every simulation generates behavioral signal incumbents don't have. Outcome data sharpens our predictions over time — a flywheel that compounds in our favor as the leader.",
  },
  {
    id: "team-traction",
    kind: "team-traction",
    layout: "split",
    eyebrow: "Team · Traction",
    title: "We know the buyer.\nWe can build this.\nWe ship fast.",
    subtitle:
      "Two HR Tech exits. Meta GenAI. A working prototype, two committed pilots, and validation from the people who pick winners.",
  },
  { id: "ask", kind: "ask", layout: "full", title: "" },
];

/* ============================================================
   COVER
   ============================================================ */

function CoverSlide() {
  return (
    <div className="h-full w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[900px] h-[900px] bg-primary/25 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-5xl text-center px-16">
        <div className="mb-14 flex justify-center">
          <Image
            src="/skillvee-logo.png"
            alt="SkillVee"
            width={320}
            height={96}
            style={{ width: "auto", height: 88, filter: "brightness(0) invert(1)" }}
            priority
          />
        </div>

        <h1 className="text-6xl lg:text-8xl font-black tracking-tight leading-[0.95] text-white mb-8">
          Watch them work.
          <br />
          <span className="text-primary">Then hire.</span>
        </h1>

        <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
          See exactly how candidates communicate, collaborate, and solve problems — before you make the offer. No more expensive hiring mistakes.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   PROBLEM
   ============================================================ */

function ProblemVisual() {
  const broken = [
    { label: "Resumes", reason: "AI-written — all look alike" },
    { label: "Take-homes", reason: "AI-submitted — can't tell who did the work" },
    { label: "Interviews", reason: "45% of candidates use AI live, undetectable" },
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
          Gameable now
        </div>
        <div className="space-y-3">
          {broken.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-4 bg-slate-800/40 border border-slate-700/50 rounded-xl p-5"
            >
              <XCircle className="w-7 h-7 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xl font-bold text-slate-200 line-through decoration-red-500/60 decoration-2">{item.label}</div>
                <div className="text-sm text-slate-400 mt-0.5">{item.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/60 border-l-4 border-primary rounded-r-xl p-5">
        <p className="text-base text-slate-200 leading-relaxed font-medium">
          The signals recruiters trusted for 30 years are gone — and nothing has replaced them yet.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   INSIGHT — full-bleed
   ============================================================ */

function InsightSlide() {
  return (
    <div className="h-full w-full flex items-center justify-center relative overflow-hidden px-24">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[900px] h-[900px] bg-primary/20 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-5xl w-full text-center">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-8">
          The Insight
        </div>
        <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white mb-4">
          Interviews are going away.
        </h2>
        <h2 className="text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white">
          The future of hiring is <span className="text-primary">watching people work.</span>
        </h2>
      </div>
    </div>
  );
}

/* ============================================================
   SOLUTION
   ============================================================ */

function SolutionVisual() {
  const features = [
    { title: "Live AI stakeholders", desc: "Voice calls with PM, manager, and tech lead", icon: Phone },
    { title: "Real deliverables", desc: "Code, PRs, decisions — actual work output", icon: FileText },
    { title: "Full session capture", desc: "Screen + voice recorded end-to-end", icon: Play },
    { title: "Structured evaluation", desc: "8 dimensions scored by Gemini multimodal", icon: BarChart3 },
  ];

  return (
    <div className="h-full flex flex-col justify-center">
      <div className="grid grid-cols-2 gap-5 w-full h-full max-h-[600px]">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-7 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <div className="relative z-10 w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center">
                <Icon className="w-7 h-7 text-primary" />
              </div>
              <div className="relative z-10">
                <div className="text-white font-bold text-xl mb-2">{f.title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{f.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT I — Build & experience (collage)
   ============================================================ */

function ProductBuildVisual() {
  return (
    <div className="h-full flex items-center justify-center relative">
      {/* Builder mock — back layer (top-left) */}
      <div className="absolute top-0 left-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden -rotate-3">
        <div className="h-9 border-b border-slate-200 flex items-center px-3 gap-2 bg-slate-50">
          <Bot className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-slate-900">Simulation Builder</span>
        </div>
        <div className="p-4 space-y-2.5 bg-slate-50 h-52">
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">AI</div>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700">
              What role are you hiring for?
            </div>
          </div>
          <div className="flex gap-2 flex-row-reverse">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">R</div>
            <div className="bg-primary/10 rounded-lg p-2 text-[11px] text-slate-700 max-w-[80%]">
              Senior backend engineer at Acme. Build a REST API.
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">AI</div>
            <div className="bg-white border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700">
              Got it. Spinning up a sim with PM, eng manager, and a tech lead they can call.
            </div>
          </div>
        </div>
      </div>

      {/* Chat workspace mock — middle/focal layer */}
      <div className="relative z-10 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2 bg-slate-900">
          <span className="text-xs font-semibold text-white">#sarah-chen — Engineering Manager</span>
        </div>
        <div className="p-4 space-y-3 h-56 bg-white flex flex-col">
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">S</div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-slate-900">Sarah Chen</div>
              <div className="text-xs bg-slate-100 rounded-lg p-2 text-slate-700 mt-0.5">
                Hey, welcome. I have a checkout-flow bug — can you take a look?
              </div>
            </div>
          </div>
          <div className="flex gap-2.5 flex-row-reverse">
            <div className="w-7 h-7 rounded bg-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">Y</div>
            <div className="flex-1 text-right">
              <div className="text-[10px] font-semibold text-slate-900">You</div>
              <div className="text-xs bg-primary/10 rounded-lg p-2 text-slate-700 mt-0.5 inline-block text-left">
                Sure — can I jump on a call to get context?
              </div>
            </div>
          </div>
          <div className="mt-auto bg-primary text-white text-xs font-bold py-2 rounded-lg text-center flex items-center justify-center gap-2">
            <Phone className="w-3.5 h-3.5" /> Start call with Sarah
          </div>
        </div>
      </div>

      {/* Voice call mock — front layer (bottom-right) */}
      <div className="absolute bottom-0 right-0 w-72 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6 text-center overflow-hidden rotate-[4deg]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20" />
        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-emerald-500/30 mb-3">
            S
          </div>
          <div className="text-base font-bold text-white">Sarah Chen</div>
          <div className="text-xs text-slate-400 mb-4">Engineering Manager</div>
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full"
                style={{ height: 8 + (i % 3) * 6 }}
              />
            ))}
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-400" />
            </div>
            <div className="w-11 h-11 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              <PhoneOff className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
            <div className="w-2.5 h-2.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded" />
            Powered by Gemini Live
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRODUCT II — Evaluate
   ============================================================ */

function ProductEvaluateVisual() {
  const dimensions = [
    "Problem Solving", "Communication", "AI Leverage", "Code Quality",
    "Time Mgmt", "Collaboration", "Technical Depth", "Autonomy",
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-4">
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm font-bold text-white">Gemini multimodal scores 8 dimensions</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dimensions.map((d) => (
            <div
              key={d}
              className="text-xs bg-slate-800/60 border border-slate-700/50 text-slate-300 px-2.5 py-1 rounded"
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white text-base font-bold">J</div>
            <div>
              <div className="text-base font-bold text-slate-900">John Smith</div>
              <div className="text-xs text-slate-500">Senior Backend Engineer</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-primary leading-none">4.2</div>
            <div className="text-[10px] text-slate-500 mt-0.5">overall</div>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          {[
            { name: "Problem Solving", score: 4.5, color: "bg-emerald-500" },
            { name: "AI Leverage", score: 4.2, color: "bg-blue-500" },
            { name: "Communication", score: 4.0, color: "bg-blue-500" },
            { name: "Technical Depth", score: 3.5, color: "bg-slate-500" },
          ].map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <div className="text-xs text-slate-700 font-medium w-32 flex-shrink-0">{d.name}</div>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.color}`}
                  style={{ width: `${(d.score / 5) * 100}%` }}
                />
              </div>
              <div className="text-xs font-bold text-slate-700 w-8 text-right">{d.score}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Ranked shortlist
        </div>
        <div className="flex items-center gap-3">
          {[
            { initial: "A", name: "Alex", score: 4.5, color: "bg-emerald-500", best: true },
            { initial: "J", name: "John", score: 4.2, color: "bg-primary" },
            { initial: "E", name: "Emma", score: 3.8, color: "bg-purple-500" },
          ].map((c) => (
            <div
              key={c.name}
              className={`flex-1 rounded-lg p-3 ${c.best ? "bg-emerald-500/10 border border-emerald-500/40" : "bg-slate-900/40 border border-slate-700/30"}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 ${c.color} rounded flex items-center justify-center text-white text-sm font-bold`}>
                  {c.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">{c.name}</div>
                  <div className="text-base font-black text-white leading-tight">{c.score}</div>
                </div>
                {c.best && <Trophy className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   WHY NOW
   ============================================================ */

function WhyNowVisual() {
  const unlocks = [
    {
      title: "Gemini Live",
      desc: "Real-time voice with persistent context. Candidates can call any AI stakeholder mid-task and get a coherent, character-consistent conversation.",
      tag: "Released 2024",
    },
    {
      title: "Gemini Multimodal",
      desc: "Reliably analyzes hour-long screen recordings. Sees how candidates think, when they got stuck, what they searched, when they used AI.",
      tag: "Reliable since 2025",
    },
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-5">
      {unlocks.map((u) => (
        <div
          key={u.title}
          className="relative bg-gradient-to-r from-slate-800/80 to-slate-800/30 backdrop-blur border border-slate-700/50 rounded-2xl p-7 overflow-hidden flex-1"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-3xl" />
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold text-white">{u.title}</h4>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-full border border-slate-700/50">
                {u.tag}
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed text-base">{u.desc}</p>
          </div>
        </div>
      ))}

      <div className="bg-primary/10 border border-primary/30 rounded-xl p-5 text-center">
        <p className="text-white font-semibold text-base">
          12 months ago this was sci-fi. <span className="text-primary">Now it ships.</span>
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   MARKET
   ============================================================ */

function MarketVisual() {
  const tiers = [
    { label: "Today · Beachhead", value: "$3B", desc: "Pre-hire assessments, growing 16% CAGR", width: "30%" },
    { label: "Expand · 3 years", value: "$20B+", desc: "Full talent acq software (ATS, sourcing, intelligence)", width: "60%" },
    { label: "Vision · 5+ years", value: "$250B+", desc: "Global recruitment spend with verified work data as the matching layer", width: "100%" },
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-6">
      <div className="flex flex-col gap-7 flex-1 justify-center">
        {tiers.map((t, i) => (
          <div key={t.label}>
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{t.label}</div>
                <div className="text-5xl font-black text-white leading-none">{t.value}</div>
              </div>
              <div className="text-sm text-slate-400 max-w-[260px] text-right leading-snug">{t.desc}</div>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  i === 0 ? "bg-primary" : i === 1 ? "bg-gradient-to-r from-primary to-blue-400" : "bg-gradient-to-r from-primary via-blue-400 to-purple-400"
                }`}
                style={{ width: t.width }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
          Comparables in the space
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { name: "Mercor", value: "$10B" },
            { name: "Juicebox", value: "$850M" },
            { name: "HackerRank", value: "$500M" },
          ].map((c) => (
            <div key={c.name} className="bg-slate-900/60 border border-slate-700/50 rounded-lg px-4 py-2">
              <span className="text-sm font-bold text-white">{c.name}</span>
              <span className="text-sm text-primary font-semibold ml-2">{c.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BUSINESS + GTM
   ============================================================ */

function BusinessGTMVisual() {
  const tiers = [
    { name: "Free", price: "$0", desc: "1 sim/month", highlight: false },
    { name: "Pro", price: "$79", per: "/mo", desc: "Small teams", highlight: false },
    { name: "Enterprise", price: "Custom", desc: "5+ hires/month", highlight: true },
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-5">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
          SaaS · Land cheap, expand to enterprise
        </div>
        <div className="grid grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl p-6 ${
                tier.highlight
                  ? "bg-primary/10 border-2 border-primary/50"
                  : "bg-slate-800/40 border border-slate-700/50"
              }`}
            >
              <div className="text-sm font-bold text-slate-300 mb-2">{tier.name}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className={`text-4xl font-black leading-none ${tier.highlight ? "text-primary" : "text-white"}`}>{tier.price}</span>
                {tier.per && <span className="text-sm text-slate-400">{tier.per}</span>}
              </div>
              <div className="text-xs text-slate-500">{tier.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 flex-1 flex flex-col justify-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
          Beachhead
        </div>
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Code2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-base font-bold text-white">Enterprise eng teams hiring 5+ devs/month</div>
            <div className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Hardest roles to evaluate. Highest cost of a bad hire ($200K+ all-in). Highest willingness to pay.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm flex-wrap">
          <div className="bg-slate-900/60 px-3.5 py-2 rounded-lg text-slate-300 font-medium">Engineering</div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="bg-slate-900/60 px-3.5 py-2 rounded-lg text-slate-300 font-medium">Design</div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="bg-slate-900/60 px-3.5 py-2 rounded-lg text-slate-300 font-medium">Product</div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="bg-primary/20 border border-primary/40 px-3.5 py-2 rounded-lg text-primary font-semibold">All white-collar</div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MOAT + COMPETITION — 2x2
   ============================================================ */

function MoatCompetitionVisual() {
  return (
    <div className="h-full flex flex-col justify-center gap-5">
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 flex-1 flex flex-col">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
          Positioning
        </div>
        <div className="relative aspect-square max-w-sm mx-auto flex-1 w-full">
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-0 right-0 border-t border-slate-700" />
            <div className="absolute left-1/2 top-0 bottom-0 border-l border-slate-700" />
          </div>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-semibold">AI-native</div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 font-semibold">AI-blind</div>
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-400 font-semibold whitespace-nowrap">Trivia tests</div>
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 rotate-90 text-[10px] text-slate-400 font-semibold whitespace-nowrap">Real work</div>

          <div className="absolute top-[12%] right-[12%]">
            <div className="bg-primary text-white rounded-full px-4 py-2 text-sm font-black shadow-lg shadow-primary/50">
              Skillvee
            </div>
          </div>

          <div className="absolute top-[25%] left-[20%]">
            <div className="bg-slate-700 text-slate-200 rounded-full px-3 py-1.5 text-xs font-bold">
              Mercor
            </div>
          </div>

          <div className="absolute bottom-[20%] right-[35%]">
            <div className="bg-slate-700 text-slate-300 rounded-full px-3 py-1.5 text-xs font-bold">
              CodeSignal
            </div>
          </div>

          <div className="absolute bottom-[15%] left-[15%]">
            <div className="bg-slate-700 text-slate-300 rounded-full px-3 py-1.5 text-xs font-bold">
              HackerRank
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
          <Database className="w-6 h-6 text-primary mb-3" />
          <div className="text-base font-bold text-white mb-1.5">Proprietary data</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Every sim adds behavioral signal incumbents don&apos;t have.
          </div>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5">
          <Repeat className="w-6 h-6 text-primary mb-3" />
          <div className="text-base font-bold text-white mb-1.5">Outcome flywheel</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            We track which hires succeed → predictions sharpen over time.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TEAM + TRACTION
   ============================================================ */

function TeamTractionVisual() {
  const team = [
    {
      name: "German Reyes",
      role: "CEO",
      img: "/germanreyes.png",
      highlights: [
        "2 HR Tech exits (acq. by Buk)",
        "Built startup $0 → $1.4M ARR",
        "ex-GPM, Walmart eCommerce",
        "Berkeley MBA",
      ],
    },
    {
      name: "Matias Hoyl",
      role: "CTO",
      img: "/matiashoyl.jpeg",
      highlights: [
        "Meta GenAI",
        "Built Zapien (35K users)",
        "Stanford MS",
        "2x Stanford Learning Design winner",
      ],
    },
  ];

  const traction = [
    { icon: Rocket, label: "Working prototype", sub: "Built & launched" },
    { icon: Trophy, label: "DeepMind + Stanford", sub: "Hackathon winners" },
    { icon: Building2, label: "Accelerated by StartX", sub: "Stanford-affiliated" },
    { icon: Users, label: "2 committed pilots", sub: "Engineering teams" },
  ];

  return (
    <div className="h-full flex flex-col justify-center gap-5">
      <div className="grid grid-cols-2 gap-4">
        {team.map((m) => (
          <div
            key={m.name}
            className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <Image
                src={m.img}
                alt={m.name}
                width={72}
                height={72}
                style={{ width: 72, height: 72 }}
                className="rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
              />
              <div className="min-w-0">
                <div className="text-lg font-bold text-white">{m.name}</div>
                <div className="text-sm text-primary font-semibold">{m.role}</div>
              </div>
            </div>
            <ul className="space-y-2">
              {m.highlights.map((h) => (
                <li key={h} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
          Traction & Validation
        </div>
        <div className="grid grid-cols-2 gap-3">
          {traction.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white">{t.label}</div>
                  <div className="text-xs text-slate-400">{t.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ASK — full-bleed
   ============================================================ */

function AskSlide() {
  const milestones = [
    { label: "$1M ARR", sub: "20-30 enterprise customers" },
    { label: "50K+ simulations", sub: "Proprietary data moat" },
    { label: "Outcome data", sub: "Hire quality vs. control" },
    { label: "Series A ready", sub: "Strong leading indicators" },
  ];

  const useOfFunds = [
    { pct: 60, label: "Engineering", desc: "Core team of 4-5", icon: Code2, color: "bg-primary" },
    { pct: 25, label: "GTM", desc: "Founder-led + early sales", icon: Briefcase, color: "bg-blue-400" },
    { pct: 15, label: "Data infra", desc: "Eval pipeline + content", icon: Database, color: "bg-purple-400" },
  ];

  return (
    <div className="h-full w-full flex items-center justify-center px-24 py-12 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] bg-primary/25 rounded-full blur-[180px]" />
      </div>

      <div className="relative z-10 max-w-6xl w-full flex flex-col gap-8 justify-center">
        <div className="text-center">
          <div className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-4">
            The Vision
          </div>
          <h2 className="text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white">
            Every white-collar hire backed by{" "}
            <span className="text-primary">verified work data.</span>
          </h2>
        </div>

        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/50 rounded-3xl p-10">
          <div className="grid grid-cols-3 gap-8 items-center">
            <div className="col-span-1">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-3">
                The Ask
              </div>
              <div className="text-6xl font-black text-white leading-none">$1.5M</div>
              <div className="text-base text-slate-300 font-semibold mt-2">SAFE · No cap set</div>
              <div className="text-sm text-slate-500 mt-1">18 months runway</div>
            </div>

            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                What we hit in 18 months
              </div>
              <div className="grid grid-cols-2 gap-3">
                {milestones.map((m) => (
                  <div
                    key={m.label}
                    className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-base font-bold text-white">{m.label}</div>
                        <div className="text-xs text-slate-400">{m.sub}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">
              Use of funds
            </div>
            <div className="h-3.5 bg-slate-900 rounded-full overflow-hidden flex mb-4">
              {useOfFunds.map((f) => (
                <div
                  key={f.label}
                  className={f.color}
                  style={{ width: `${f.pct}%` }}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {useOfFunds.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-start gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${f.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">
                        {f.pct}% <span className="text-slate-300">{f.label}</span>
                      </div>
                      <div className="text-xs text-slate-500">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 flex flex-col justify-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Let&apos;s talk
            </div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <Mail className="w-5 h-5 text-primary" />
              <a href="mailto:german@skillvee.com" className="text-base font-bold text-white hover:text-primary transition-colors">
                german@skillvee.com
              </a>
            </div>
            <div className="text-sm text-slate-400">German Reyes · CEO</div>
            <div className="text-xs text-slate-500 mt-2">www.skillvee.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function PresentationV2Page() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slides = useMemo(() => SLIDES, []);
  const slide = slides[currentSlide];

  const goToSlide = useCallback(
    (i: number) => {
      if (i >= 0 && i < slides.length) setCurrentSlide(i);
    },
    [slides.length],
  );
  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handle = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextSlide, prevSlide, toggleFullscreen]);

  const renderVisual = (kind: SlideKind) => {
    switch (kind) {
      case "problem": return <ProblemVisual />;
      case "solution": return <SolutionVisual />;
      case "product-build": return <ProductBuildVisual />;
      case "product-evaluate": return <ProductEvaluateVisual />;
      case "why-now": return <WhyNowVisual />;
      case "market": return <MarketVisual />;
      case "business-gtm": return <BusinessGTMVisual />;
      case "moat-competition": return <MoatCompetitionVisual />;
      case "team-traction": return <TeamTractionVisual />;
      default: return null;
    }
  };

  return (
    <div className="h-screen bg-[#020617] text-white font-sans overflow-hidden flex flex-col">
      <div className="flex-1 flex relative">
        {slide.layout === "full" ? (
          <div className="w-full h-full">
            {slide.kind === "cover" && <CoverSlide />}
            {slide.kind === "insight" && <InsightSlide />}
            {slide.kind === "ask" && <AskSlide />}
          </div>
        ) : (
          <div className="flex w-full">
            <div className="w-1/2 pl-16 pr-10 lg:pl-24 lg:pr-14 py-12 flex flex-col justify-center relative">
              <div className="absolute top-[-20%] left-[-20%] w-full h-full bg-primary/15 rounded-full blur-[150px] pointer-events-none" />
              <div className="relative z-10">
                {slide.eyebrow && (
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                    {slide.eyebrow}
                  </div>
                )}
                <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.95] text-white mb-6">
                  {slide.title.split("\n").map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </h1>
                {slide.subtitle && (
                  <p className="text-lg lg:text-xl text-slate-400 font-medium max-w-lg leading-relaxed">
                    {slide.subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="w-1/2 pl-10 pr-16 lg:pl-14 lg:pr-24 py-12 flex items-center justify-center">
              <div className="w-full h-full">{renderVisual(slide.kind)}</div>
            </div>
          </div>
        )}
      </div>

      <div className="h-16 border-t border-slate-800/50 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/skillvee-logo.png"
            alt="SkillVee"
            width={100}
            height={30}
            style={{ width: "auto", height: 24 }}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Pitch · v2
          </span>
        </div>

        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === currentSlide
                  ? "bg-primary w-8"
                  : i < currentSlide
                    ? "bg-slate-500 w-1.5"
                    : "bg-slate-700 w-1.5"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-2">
            {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </span>
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="w-9 h-9 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
