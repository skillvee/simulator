"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  Bot,
  Target,
  Sparkles,
  TrendingUp,
  Phone,
  PhoneOff,
  Send,
  Hash,
  Circle,
  CheckCircle2,
  AlertCircle,
  Play,
  BarChart3,
  Eye,
  Maximize2,
  Minimize2,
} from "lucide-react";

// Slide data
const slides = [
  {
    id: "title",
    title: "Watch them work.\nThen hire.",
    subtitle: "See exactly how candidates communicate, collaborate, and solve problems—before you make the offer. No more expensive hiring mistakes.",
    visual: "logo",
  },
  {
    id: "problem",
    title: "The Problem",
    subtitle: "Enterprise engineering teams are drowning in AI-enhanced candidates.",
    visual: "stats",
    stats: [
      { value: "1000s/day", label: "Applications per role", icon: FileText },
      { value: "74%", label: "AI-generated resumes", icon: Bot },
      { value: "+42%", label: "Interview rounds since 2021", icon: TrendingUp },
      { value: "45%", label: "Use AI in interviews", icon: Sparkles },
    ],
    footnote: "HackerRank bans AI and tests trivia. Take-homes get AI submissions. None of it works anymore.",
  },
  {
    id: "solution",
    title: "Our Solution",
    subtitle: "45-minute work simulation with AI coworkers",
    visual: "simulation",
    features: [
      { title: "Voice Calls", desc: "Real-time conversations with AI stakeholders" },
      { title: "Real Deliverables", desc: "Candidates produce actual work artifacts" },
      { title: "Screen Recorded", desc: "See exactly how they work and problem-solve" },
      { title: "Side-by-Side", desc: "Compare candidates on actual work output" },
    ],
  },
  // DEMO SLIDES - Recruiter creates scenario
  {
    id: "demo-builder",
    title: "Create Simulation",
    subtitle: "Recruiters build scenarios through natural conversation with AI. No forms - just describe what you want.",
    visual: "demo-builder",
  },
  // DEMO SLIDES - Candidate Flow
  {
    id: "demo-join",
    title: "Candidate Joins",
    subtitle: "Recruiter shares a unique link. Candidate sees the role and signs up.",
    visual: "demo-join",
  },
  {
    id: "demo-chat",
    title: "Slack-like Workspace",
    subtitle: "Candidates collaborate with AI coworkers via chat and voice calls",
    visual: "demo-chat",
  },
  {
    id: "demo-call",
    title: "Voice Calls",
    subtitle: "Real-time conversations with AI stakeholders powered by Gemini Live",
    visual: "demo-call",
  },
  {
    id: "demo-analysis",
    title: "AI Analysis",
    subtitle: "Screen recording is sent to Gemini multimodal to evaluate how candidates actually work",
    visual: "demo-analysis",
    dimensions: [
      "Problem Solving",
      "Communication",
      "AI Tool Usage",
      "Code Quality",
      "Time Management",
      "Collaboration",
      "Technical Skills",
      "Autonomy",
    ],
  },
  // DEMO SLIDES - Recruiter Flow
  {
    id: "demo-dashboard",
    title: "Recruiter Dashboard",
    subtitle: "Track all simulations and candidates in one place",
    visual: "demo-dashboard",
  },
  {
    id: "demo-scorecard",
    title: "AI Scorecard",
    subtitle: "Detailed analysis across 8 dimensions with observable behaviors",
    visual: "demo-scorecard",
  },
  {
    id: "demo-compare",
    title: "Compare Candidates",
    subtitle: "Side-by-side comparison on actual work output",
    visual: "demo-compare",
  },
  // Back to pitch
  {
    id: "whynow",
    title: "Why Now?",
    subtitle: "The 10X unlock powered by Gemini",
    visual: "gemini",
    unlocks: [
      {
        title: "Gemini Live",
        desc: "Real-time voice conversations with AI stakeholders (PM, manager, tech lead) that remember context across the session",
      },
      {
        title: "Gemini Multimodal",
        desc: "Accurately analyzes hour-long screen recordings to evaluate how candidates work, use AI, and problem-solve",
      },
    ],
  },
  {
    id: "market",
    title: "Market",
    subtitle: "$3B pre-hire assessment market growing 16%/yr",
    visual: "market",
    marketData: {
      tam: "$3B",
      growth: "16%/yr",
      competitors: ["HackerRank", "CodeSignal"],
      beachhead: "Enterprise teams hiring 5+ engineers/month",
      moat: "Every simulation generates behavioral data → prediction engine competitors can't replicate",
    },
  },
  {
    id: "team",
    title: "Team",
    subtitle: "HR Tech exits + Meta GenAI + we ship fast",
    visual: "team",
    members: [
      {
        name: "German Reyes",
        role: "CEO",
        highlights: [
          "2 HR Tech exits (acquired by Buk)",
          "Grew startup $0→$1.4M ARR",
          "GPM at Walmart eCommerce",
          "Berkeley MBA",
        ],
      },
      {
        name: "Matias Hoyl",
        role: "CTO",
        highlights: [
          "Meta GenAI",
          "Stanford MS",
          "Built Zapien (35K users)",
          "2x Stanford Learning Design winner",
        ],
      },
    ],
    whyUs: "HR Tech exits (we know the buyer) + Meta GenAI (we can build this) + this prototype (we ship fast)",
  },
];

// Visual Components
function LogoVisual() {
  return (
    <div className="relative flex items-center justify-center h-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10"
      >
        <Image
          src="/skillvee-logo.png"
          alt="SkillVee"
          width={400}
          height={120}
          style={{ width: "auto", height: "auto" }}
          priority
        />
      </motion.div>
    </div>
  );
}

function StatsVisual({ stats }: { stats: typeof slides[1]["stats"] }) {
  return (
    <div className="grid grid-cols-2 gap-6 h-full items-center">
      {stats?.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.15 }}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="text-4xl font-black text-white mb-2">{stat.value}</div>
            <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

function SimulationVisual({ features }: { features: typeof slides[2]["features"] }) {
  const icons = [Phone, FileText, Eye, Users];

  return (
    <div className="h-full flex items-center justify-center">
      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {features?.map((feature, index) => {
          const Icon = icons[index];
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
              className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-5 relative overflow-hidden group"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="relative z-10">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-white font-bold text-base mb-1">{feature.title}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{feature.desc}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function GeminiVisual({ unlocks }: { unlocks: typeof slides[3]["unlocks"] }) {
  return (
    <div className="flex flex-col gap-6 h-full justify-center">
      {unlocks?.map((unlock, index) => (
        <motion.div
          key={unlock.title}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.2 }}
          className="relative bg-gradient-to-r from-slate-800/80 to-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-6 overflow-hidden"
        >
          {/* Gemini gradient accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-xl font-bold text-white">{unlock.title}</h4>
            </div>
            <p className="text-slate-300 leading-relaxed">{unlock.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MarketVisual({ marketData }: { marketData: typeof slides[4]["marketData"] }) {
  return (
    <div className="h-full flex flex-col justify-center gap-6">
      {/* TAM visualization */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-slate-400 text-sm font-medium mb-1">Total Addressable Market</div>
            <div className="text-5xl font-black text-white">{marketData?.tam}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-sm font-medium mb-1">Growth Rate</div>
            <div className="text-3xl font-bold text-primary">{marketData?.growth}</div>
          </div>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={{ delay: 0.5, duration: 1 }}
            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
          />
        </div>
        <div className="mt-3 text-xs text-slate-500">Competitors: {marketData?.competitors?.join(", ")}</div>
      </motion.div>

      {/* Beachhead */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-primary/10 border border-primary/30 rounded-2xl p-5"
      >
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-5 h-5 text-primary" />
          <span className="text-primary font-bold">Beachhead</span>
        </div>
        <p className="text-white font-medium">{marketData?.beachhead}</p>
      </motion.div>

      {/* Moat */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4"
      >
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Moat</div>
        <p className="text-slate-300 text-sm">{marketData?.moat}</p>
      </motion.div>
    </div>
  );
}

function TeamVisual({ members, whyUs }: { members: typeof slides[5]["members"]; whyUs: string }) {
  return (
    <div className="h-full flex flex-col justify-center gap-8">
      <div className="grid grid-cols-2 gap-8">
        {members?.map((member, index) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-3xl p-8"
          >
            {/* Avatar placeholder */}
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mb-5 text-3xl font-black text-white shadow-lg shadow-primary/30">
              {member.name.charAt(0)}
            </div>
            <h4 className="text-2xl font-bold text-white">{member.name}</h4>
            <div className="text-primary font-semibold text-base mb-4">{member.role}</div>
            <ul className="space-y-2">
              {member.highlights.map((h) => (
                <li key={h} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Why us */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-primary/10 border border-primary/30 rounded-2xl p-5 text-center"
      >
        <p className="text-white font-medium">{whyUs}</p>
      </motion.div>
    </div>
  );
}

// ============ DEMO VISUAL COMPONENTS ============

function DemoBuilderVisual() {
  const chatMessages = [
    { from: "ai", text: "Hi! I'll help you create a simulation. What role are you hiring for?" },
    { from: "user", text: "Senior backend engineer at Acme Corp. They'll build a REST API." },
    { from: "ai", text: "Got it! What tech stack should they use?" },
    { from: "user", text: "Node.js, TypeScript, PostgreSQL" },
  ];

  const previewData = {
    name: "Backend API Challenge",
    company: "Acme Corp",
    task: "Build a REST API...",
    techStack: ["Node.js", "TypeScript", "PostgreSQL"],
    coworkers: [
      { name: "Sarah Chen", role: "Engineering Manager" },
    ],
  };

  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="flex h-80">
          {/* Left - Chat panel */}
          <div className="flex-1 flex flex-col border-r border-slate-200">
            {/* Header */}
            <div className="h-10 border-b border-slate-200 flex items-center px-4 gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-slate-900">Simulation Builder</span>
            </div>
            {/* Messages */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto bg-slate-50">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.3 }}
                  className={`flex gap-2 ${msg.from === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${msg.from === "user" ? "bg-primary" : "bg-gradient-to-br from-purple-500 to-pink-500"}`}>
                    {msg.from === "user" ? "R" : "AI"}
                  </div>
                  <div className={`max-w-[75%] text-[10px] p-2 rounded-lg ${msg.from === "user" ? "bg-primary/10 text-slate-700" : "bg-white border border-slate-200 text-slate-700"}`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {/* Typing indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="flex gap-2"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-slate-400 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            </div>
            {/* Input */}
            <div className="h-10 border-t border-slate-200 flex items-center px-3 gap-2">
              <input
                type="text"
                placeholder="Describe your simulation..."
                className="flex-1 text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1"
                disabled
              />
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Send className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          {/* Right - Preview panel */}
          <div className="w-44 bg-slate-50 p-3 flex flex-col">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">Preview</div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="space-y-2 flex-1"
            >
              <div className="bg-white rounded-lg p-2 border border-slate-200">
                <div className="text-[8px] text-slate-400 uppercase">Name</div>
                <div className="text-[10px] font-semibold text-slate-900">{previewData.name}</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-slate-200">
                <div className="text-[8px] text-slate-400 uppercase">Company</div>
                <div className="text-[10px] font-semibold text-slate-900">{previewData.company}</div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-slate-200">
                <div className="text-[8px] text-slate-400 uppercase">Tech Stack</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {previewData.techStack.map((tech) => (
                    <span key={tech} className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-slate-200">
                <div className="text-[8px] text-slate-400 uppercase">Coworkers</div>
                {previewData.coworkers.map((cw) => (
                  <div key={cw.name} className="flex items-center gap-1 mt-1">
                    <div className="w-4 h-4 bg-emerald-500 rounded text-white text-[8px] flex items-center justify-center font-bold">S</div>
                    <div className="text-[9px] text-slate-700">{cw.name}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Save button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-2"
            >
              <div className="bg-primary text-white text-[10px] font-bold py-1.5 rounded text-center">
                Save Simulation
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DemoJoinVisual() {
  return (
    <div className="h-full flex items-center justify-center">
      {/* Mock join page - split screen */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50"
      >
        <div className="flex h-80">
          {/* Left - Dark panel */}
          <div className="w-1/2 bg-[#020617] p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-primary/20 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <Image src="/skillvee-logo.png" alt="SkillVee" width={100} height={30} style={{ width: "auto", height: "auto" }} />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-white leading-tight">YOUR<br />NEXT ROLE.</h3>
              <p className="text-xs text-slate-400 mt-2">Acme Corp is looking for a Senior Engineer</p>
            </div>
            <div className="relative z-10 flex gap-4 text-[8px] text-slate-500">
              <span className="flex items-center gap-1"><Bot className="w-3 h-3 text-primary" /> AI Teammates</span>
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> Use Any AI</span>
            </div>
          </div>
          {/* Right - Light panel */}
          <div className="w-1/2 bg-white p-6 flex flex-col justify-center">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i <= 1 ? "bg-primary" : "bg-slate-200"}`} />
              ))}
            </div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-slate-400 mb-1">Step 01</div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Welcome</h4>
            <p className="text-xs text-slate-500 mb-4">Experience a day at Acme Corp. This simulation assesses how you work.</p>
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-full text-center"
            >
              Continue →
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DemoChatVisual() {
  const coworkers = [
    { name: "Sarah Chen", role: "Engineering Manager", color: "bg-emerald-500", online: true },
    { name: "Alex Kim", role: "Product Manager", color: "bg-purple-500", online: true },
    { name: "Jordan Lee", role: "Senior Engineer", color: "bg-orange-500", online: false },
  ];

  const messages = [
    { from: "Sarah Chen", text: "Hey! Welcome to the team. I have a task for you today.", time: "9:00 AM", isManager: true },
    { from: "You", text: "Thanks! Excited to get started. What's the project?", time: "9:01 AM", isYou: true },
    { from: "Sarah Chen", text: "We need to add a new feature to the checkout flow. I'll send over the requirements.", time: "9:02 AM", isManager: true },
  ];

  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="flex h-96">
          {/* Sidebar */}
          <div className="w-48 bg-slate-50 border-r border-slate-200 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Team</div>
            {coworkers.map((cw, i) => (
              <motion.div
                key={cw.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 cursor-pointer mb-1"
              >
                <div className="relative">
                  <div className={`w-8 h-8 ${cw.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>
                    {cw.name.charAt(0)}
                  </div>
                  {cw.online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">{cw.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{cw.role}</div>
                </div>
              </motion.div>
            ))}
            {/* Call button */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mt-4 bg-primary text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-3 h-3" /> Start Call
            </motion.div>
          </div>
          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="h-12 border-b border-slate-200 flex items-center px-4 gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900">sarah-chen</span>
            </div>
            {/* Messages */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.2 }}
                  className={`flex gap-2 ${msg.isYou ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${msg.isYou ? "bg-primary" : "bg-emerald-500"}`}>
                    {msg.isYou ? "Y" : "S"}
                  </div>
                  <div className={`max-w-[70%] ${msg.isYou ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-semibold text-slate-900">{msg.from}</span>
                      <span className="text-[9px] text-slate-400">{msg.time}</span>
                    </div>
                    <div className={`text-xs text-slate-700 p-2 rounded-lg ${msg.isYou ? "bg-primary/10" : "bg-slate-100"}`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            {/* Input */}
            <div className="h-14 border-t border-slate-200 flex items-center px-4 gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                disabled
              />
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Send className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DemoCallVisual() {
  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Call interface */}
        <div className="bg-slate-900 rounded-3xl p-8 text-center relative overflow-hidden">
          {/* Animated rings */}
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-40 h-40 border-2 border-primary/30 rounded-full" />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-32 h-32 border-2 border-primary/50 rounded-full" />
          </motion.div>

          {/* Avatar */}
          <div className="relative z-10 mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-emerald-500/30"
            >
              S
            </motion.div>
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute bottom-1 right-1/2 translate-x-8 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"
            />
          </div>

          <h3 className="text-xl font-bold text-white mb-1">Sarah Chen</h3>
          <p className="text-slate-400 text-sm mb-2">Engineering Manager</p>

          {/* Voice indicator */}
          <div className="flex items-center justify-center gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 20, 8] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-primary rounded-full"
                style={{ height: 8 }}
              />
            ))}
          </div>

          <p className="text-xs text-slate-500 mb-6">Call in progress • 2:34</p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Phone className="w-5 h-5 text-slate-400" />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center cursor-pointer shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-slate-400" />
            </motion.div>
          </div>
        </div>

        {/* Gemini badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500"
        >
          <div className="w-4 h-4 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded" />
          Powered by Gemini Live
        </motion.div>
      </motion.div>
    </div>
  );
}

function DemoAnalysisVisual({ dimensions }: { dimensions: string[] }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-2xl flex gap-6">
        {/* Left - Screen recording */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <div className="bg-slate-900 rounded-2xl p-4 relative overflow-hidden">
            {/* Fake screen recording */}
            <div className="aspect-video bg-slate-800 rounded-lg relative overflow-hidden">
              {/* Code editor mockup */}
              <div className="absolute inset-0 p-3">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="space-y-1.5">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ width: 0 }}
                      animate={{ width: `${40 + Math.random() * 50}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                      className="h-2 bg-slate-700 rounded"
                    />
                  ))}
                </div>
              </div>
              {/* Recording indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-500/90 px-2 py-1 rounded">
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-white rounded-full"
                />
                <span className="text-[9px] text-white font-bold">REC</span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="text-xs text-slate-400">45 min screen recording</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-4">
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-primary"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>

          {/* Gemini badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center justify-center gap-3"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="text-sm font-bold text-white">Gemini Multimodal Analysis</div>
          </motion.div>
        </motion.div>

        {/* Right - Dimensions assessed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">8 Dimensions Assessed</div>
          <div className="grid grid-cols-2 gap-2">
            {dimensions.map((dim, i) => (
              <motion.div
                key={dim}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex items-center gap-2"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                  className="w-5 h-5 bg-primary/20 rounded flex items-center justify-center"
                >
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                </motion.div>
                <span className="text-xs text-white font-medium">{dim}</span>
              </motion.div>
            ))}
          </div>

          {/* Output preview */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-4 bg-slate-800/30 border border-slate-700/30 rounded-lg p-3"
          >
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-2">AI Output</div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Observable behaviors</span>
                <span className="text-[10px] text-primary font-bold">24 found</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Timestamps linked</span>
                <span className="text-[10px] text-primary font-bold">12 moments</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Hiring signals</span>
                <span className="text-[10px] text-emerald-400 font-bold">3 green, 1 red</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function DemoDashboardVisual() {
  const stats = [
    { label: "Simulations", value: "12", icon: FileText },
    { label: "Candidates", value: "156", icon: Users },
    { label: "Completed", value: "89", icon: CheckCircle2 },
    { label: "Completion Rate", value: "57%", icon: BarChart3 },
  ];

  const candidates = [
    { name: "John Smith", score: 4.2, status: "completed", date: "Today" },
    { name: "Emma Wilson", score: 3.8, status: "completed", date: "Yesterday" },
    { name: "Mike Chen", score: null, status: "in_progress", date: "2h ago" },
  ];

  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Dashboard</h3>
            <p className="text-xs text-slate-500">Welcome back, Recruiter</p>
          </div>
          <div className="bg-primary text-white text-xs font-bold py-2 px-4 rounded-lg">
            + New Simulation
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 rounded-xl p-3 text-center"
              >
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-[10px] text-slate-500">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Recent candidates */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recent Activity</div>
          <div className="space-y-2">
            {candidates.map((c, i) => (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-bold">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                    <div className="text-[10px] text-slate-500">{c.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.score ? (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Circle
                          key={n}
                          className={`w-2 h-2 ${n <= Math.floor(c.score) ? "fill-primary text-primary" : "text-slate-300"}`}
                        />
                      ))}
                      <span className="text-xs font-bold text-slate-700 ml-1">{c.score}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-full">In Progress</span>
                  )}
                  <Eye className="w-4 h-4 text-slate-400 cursor-pointer" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DemoScorecardVisual() {
  const dimensions = [
    { name: "Problem Solving", score: 4.5, level: "Exceptional" },
    { name: "Communication", score: 4.0, level: "Strong" },
    { name: "Technical Skills", score: 3.5, level: "Proficient" },
    { name: "AI Leverage", score: 4.2, level: "Strong" },
  ];

  const signals = {
    green: ["Asked clarifying questions", "Used AI tools effectively", "Clear code structure"],
    red: ["Took long on edge cases"],
  };

  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white text-xl font-bold">J</div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">John Smith</h3>
              <p className="text-xs text-slate-500">Senior Engineer • Completed Jan 15</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-primary">4.2</div>
            <div className="text-[10px] text-slate-500">Overall Score</div>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Dimensions */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Skill Dimensions</div>
            <div className="space-y-2">
              {dimensions.map((d, i) => (
                <motion.div
                  key={d.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-slate-50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-900">{d.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      d.level === "Exceptional" ? "bg-emerald-100 text-emerald-700" :
                      d.level === "Strong" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-700"
                    }`}>{d.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(d.score / 5) * 100}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-6">{d.score}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Signals */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Hiring Signals</div>
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-emerald-50 border border-emerald-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Strengths</span>
                </div>
                <ul className="space-y-1">
                  {signals.green.map((s) => (
                    <li key={s} className="text-[10px] text-emerald-700 flex items-center gap-1">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full" />
                      {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-700">Areas to Probe</span>
                </div>
                <ul className="space-y-1">
                  {signals.red.map((s) => (
                    <li key={s} className="text-[10px] text-red-700 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full" />
                      {s}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>

            {/* Video evidence */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-3 bg-slate-900 rounded-lg p-3 flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Screen Recording</div>
                <div className="text-[10px] text-slate-400">45 min • Watch full session</div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function DemoCompareVisual() {
  const candidates = [
    { name: "John Smith", score: 4.2, percentile: 92, level: "Strong", color: "bg-primary" },
    { name: "Emma Wilson", score: 3.8, percentile: 75, level: "Proficient", color: "bg-purple-500" },
    { name: "Alex Johnson", score: 4.5, percentile: 98, level: "Exceptional", color: "bg-emerald-500" },
  ];

  const dimensions = ["Problem Solving", "Communication", "Technical", "AI Leverage"];

  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 p-6"
      >
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Compare Candidates</div>

        {/* Candidate headers */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div></div>
          {candidates.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className={`w-12 h-12 ${c.color} rounded-xl mx-auto flex items-center justify-center text-white text-lg font-bold mb-2`}>
                {c.name.charAt(0)}
              </div>
              <div className="text-sm font-bold text-slate-900">{c.name}</div>
              <div className="text-2xl font-black text-slate-900">{c.score}</div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full inline-block mt-1 ${
                c.percentile >= 90 ? "bg-emerald-100 text-emerald-700" :
                c.percentile >= 75 ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-700"
              }`}>
                Top {100 - c.percentile}%
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dimension comparison */}
        <div className="space-y-3">
          {dimensions.map((dim, di) => (
            <motion.div
              key={dim}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + di * 0.1 }}
              className="grid grid-cols-4 gap-3 items-center"
            >
              <div className="text-xs font-medium text-slate-600">{dim}</div>
              {candidates.map((c, ci) => {
                const score = 3 + Math.random() * 2; // Random for demo
                return (
                  <div key={`${c.name}-${dim}`} className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(score / 5) * 100}%` }}
                        transition={{ delay: 0.5 + di * 0.1 + ci * 0.05, duration: 0.5 }}
                        className={`h-full rounded-full ${c.color}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 w-6">{score.toFixed(1)}</span>
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>

        {/* Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          <div>
            <div className="text-sm font-bold text-emerald-800">Recommended: Alex Johnson</div>
            <div className="text-xs text-emerald-600">Top 2% overall, exceptional problem solving skills</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevSlide();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        // Escape is handled by browser for fullscreen, but we track state
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextSlide, prevSlide, toggleFullscreen, isFullscreen]);

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden flex flex-col">
      {/* Main slide area */}
      <div className="flex-1 flex">
        {/* Left: Text content */}
        <div className="w-1/2 p-12 lg:p-20 flex flex-col justify-center relative">
          {/* Animated background */}
          <motion.div
            key={`bg-${currentSlide}`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-20%] w-full h-full bg-primary/20 rounded-full blur-[150px] pointer-events-none"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="relative z-10"
            >
              {/* Slide number */}
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4">
                {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
              </div>

              {/* Title */}
              <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-[0.9] text-white mb-6">
                {slide.title.includes("\n") ? (
                  slide.title.split("\n").map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {i === slide.title.split("\n").length - 1 ? (
                        <span className="text-primary">{line}</span>
                      ) : (
                        line
                      )}
                    </span>
                  ))
                ) : (
                  slide.title.split(" ").map((word, i) => (
                    <span key={i}>
                      {i === 0 ? <span className="text-primary">{word}</span> : word}
                      {i < slide.title.split(" ").length - 1 ? " " : ""}
                    </span>
                  ))
                )}
              </h1>

              {/* Subtitle */}
              <p className="text-xl lg:text-2xl text-slate-400 font-medium max-w-lg leading-relaxed">
                {slide.subtitle}
              </p>

              {/* Footnote if exists */}
              {"footnote" in slide && slide.footnote && (
                <p className="mt-8 text-sm text-slate-500 max-w-md italic">
                  {slide.footnote}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Visual */}
        <div className={`w-1/2 p-12 lg:p-16 flex items-center justify-center ${slide.visual === "logo" ? "bg-white" : ""}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`visual-${slide.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full max-h-[600px]"
            >
              {slide.visual === "logo" && <LogoVisual />}
              {slide.visual === "stats" && "stats" in slide && <StatsVisual stats={slide.stats} />}
              {slide.visual === "simulation" && "features" in slide && <SimulationVisual features={slide.features} />}
              {slide.visual === "gemini" && "unlocks" in slide && <GeminiVisual unlocks={slide.unlocks} />}
              {slide.visual === "market" && "marketData" in slide && <MarketVisual marketData={slide.marketData} />}
              {slide.visual === "team" && "members" in slide && <TeamVisual members={slide.members} whyUs={slide.whyUs || ""} />}
              {/* Demo visuals */}
              {slide.visual === "demo-builder" && <DemoBuilderVisual />}
              {slide.visual === "demo-join" && <DemoJoinVisual />}
              {slide.visual === "demo-chat" && <DemoChatVisual />}
              {slide.visual === "demo-call" && <DemoCallVisual />}
              {slide.visual === "demo-analysis" && "dimensions" in slide && slide.dimensions && <DemoAnalysisVisual dimensions={slide.dimensions} />}
              {slide.visual === "demo-dashboard" && <DemoDashboardVisual />}
              {slide.visual === "demo-scorecard" && <DemoScorecardVisual />}
              {slide.visual === "demo-compare" && <DemoCompareVisual />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="h-20 border-t border-slate-800/50 flex items-center justify-between px-12">
        {/* Logo */}
        <div className="flex items-center">
          <Image src="/skillvee-logo.png" alt="SkillVee" width={120} height={36} style={{ width: "auto", height: "auto" }} />
        </div>

        {/* Progress dots */}
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goToSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide
                  ? "bg-primary w-8"
                  : i < currentSlide
                    ? "bg-slate-500"
                    : "bg-slate-700"
              }`}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 items-center">
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all mr-2"
            title={isFullscreen ? "Exit fullscreen (F)" : "Enter fullscreen (F)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="w-10 h-10 rounded-full border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
