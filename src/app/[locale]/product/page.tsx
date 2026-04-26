"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Code,
  Globe,
  Hash,
  Lock,
  MessageSquare,
  Phone,
  PhoneOff,
  Send,
  Shield,
  Sparkles,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";

import Footer from "@/components/landing/footer";
import Navigation from "@/components/landing/navigation";
import { CurveDivider } from "@/components/landing/section-divider";
import { SectionReveal } from "@/components/landing/section-reveal";

/* ============================================================
   MOCKUP: Voice call (Sarah Chen) — used in hero composite and step 1
   ============================================================ */
function VoiceCallMock({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("product");
  const sizeCls = compact ? "max-w-[300px]" : "max-w-md";
  const avatarCls = compact ? "w-16 h-16 text-2xl" : "w-24 h-24 text-3xl";
  const ringSmall = compact ? "w-24 h-24" : "w-32 h-32";
  const ringLarge = compact ? "w-32 h-32" : "w-40 h-40";

  return (
    <div className={`w-full ${sizeCls}`}>
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-center shadow-2xl ring-1 ring-white/10">
        {/* Animated rings */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className={`${ringLarge} rounded-full border-2 border-primary/30`} />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className={`${ringSmall} rounded-full border-2 border-primary/50`} />
        </motion.div>

        {/* Avatar */}
        <div className="relative z-10 mb-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`${avatarCls} mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 font-bold text-white shadow-xl shadow-emerald-500/30`}
          >
            S
          </motion.div>
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute bottom-1 right-1/2 h-4 w-4 translate-x-8 rounded-full border-2 border-slate-900 bg-green-500"
          />
        </div>

        <h3 className="text-xl font-bold text-white">Sarah Chen</h3>
        <p className="mb-2 text-sm text-slate-400">{t("voiceCall.role")}</p>

        {/* Voice indicator — fixed height reserves max bar size so layout stays stable */}
        <div className="mb-6 flex h-5 items-center justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: [8, 20, 8] }}
              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
              className="w-1 rounded-full bg-primary"
              style={{ height: 8 }}
            />
          ))}
        </div>

        <p className="mb-6 text-xs text-slate-500">{t("voiceCall.callInProgress")}</p>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-slate-800">
            <Phone className="h-5 w-5 text-slate-400" />
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30"
          >
            <PhoneOff className="h-6 w-6 text-white" />
          </motion.div>
          <div className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-slate-800">
            <Sparkles className="h-5 w-5 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
        <div className="h-4 w-4 rounded bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500" />
        {t("voiceCall.poweredBy")}
      </div>
    </div>
  );
}

/* ============================================================
   MOCKUP: IDE with recording (step 2)
   ============================================================ */
type Tok = { t: string; c?: string };

function IdeRecordingMock() {
  const t = useTranslations("product");
  const K = "text-purple-400";  // keywords
  const F = "text-sky-300";     // function names
  const S = "text-emerald-300"; // strings
  const N = "text-amber-300";   // numbers
  const T = "text-cyan-300";    // types
  const C = "text-slate-500 italic"; // comments
  const P = "text-slate-300";   // plain

  const code: Tok[][] = [
    [{ t: "// Fix: guard against expired cart sessions", c: C }],
    [
      { t: "export ", c: K },
      { t: "async function ", c: K },
      { t: "checkout", c: F },
      { t: "(" },
      { t: "cartId", c: P },
      { t: ": " },
      { t: "string", c: T },
      { t: ") {" },
    ],
    [
      { t: "  const ", c: K },
      { t: "cart", c: P },
      { t: " = ", c: P },
      { t: "await ", c: K },
      { t: "redis", c: P },
      { t: ".", c: P },
      { t: "get", c: F },
      { t: "(" },
      { t: "`cart:${cartId}`", c: S },
      { t: ");" },
    ],
    [
      { t: "  if ", c: K },
      { t: "(!cart || cart.", c: P },
      { t: "expiresAt", c: P },
      { t: " < ", c: P },
      { t: "Date", c: T },
      { t: ".", c: P },
      { t: "now", c: F },
      { t: "()) {" },
    ],
    [
      { t: "    throw new ", c: K },
      { t: "CartExpiredError", c: T },
      { t: "(", c: P },
      { t: "cartId", c: P },
      { t: ");" },
    ],
    [{ t: "  }" }],
    [
      { t: "  return ", c: K },
      { t: "stripe", c: P },
      { t: ".", c: P },
      { t: "charge", c: F },
      { t: "(cart.", c: P },
      { t: "total", c: P },
      { t: ", ", c: P },
      { t: "3000", c: N },
      { t: ");" },
    ],
    [{ t: "}" }],
  ];

  return (
    <div className="relative w-full max-w-xl">
      {/* Main IDE window */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10"
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          </div>
          <div className="ml-3 text-xs text-slate-500">checkout.ts — skillvee</div>
          <div className="ml-auto flex items-center gap-1.5 rounded bg-red-500/90 px-2 py-1">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-white"
            />
            <span className="text-[10px] font-bold text-white">REC</span>
          </div>
        </div>

        {/* Editor area */}
        <div className="flex font-mono text-[12px] leading-[1.7]">
          {/* Line numbers */}
          <div className="flex flex-col border-r border-slate-800 bg-slate-950 px-3 py-4 text-right text-[11px] text-slate-600">
            {code.map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          {/* Code */}
          <div className="flex-1 overflow-hidden py-4 pl-4 pr-3">
            {code.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.25 }}
                className="whitespace-pre"
              >
                {line.map((tok, j) => (
                  <span key={j} className={tok.c ?? P}>
                    {tok.t}
                  </span>
                ))}
                {/* Cursor on the last non-empty line */}
                {i === code.length - 2 && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="inline-block h-3.5 w-0.5 translate-y-0.5 bg-primary align-middle"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 border-t border-slate-800 bg-slate-950 px-4 py-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            main
          </span>
          <span>TypeScript</span>
          <span className="ml-auto">{t("ide.recordingStatus")}</span>
        </div>
      </motion.div>

      {/* Floating call bar (lower-right) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="absolute -bottom-6 -right-2 flex items-center gap-3 rounded-full bg-slate-900 py-2.5 pl-2.5 pr-5 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-sm font-bold text-white">
          S
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">Sarah Chen</span>
          <div className="flex items-center gap-1">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [4, 10, 4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                className="w-0.5 rounded-full bg-primary"
                style={{ height: 4 }}
              />
            ))}
            <span className="ml-1 text-[10px] text-slate-400">{t("ide.onCall")}</span>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
          <PhoneOff className="h-3.5 w-3.5 text-white" />
        </div>
      </motion.div>
    </div>
  );
}

/* ============================================================
   MOCKUP: Slack-thread (step 3 — present and defend)
   ============================================================ */
function DefendThreadMock() {
  const t = useTranslations("product");
  const youLabel = t("defendThread.you");
  const messages = [
    { from: "Sarah Chen", isYou: false, text: t("defendThread.msg1") },
    { from: youLabel, isYou: true, text: t("defendThread.msg2") },
    { from: "Sarah Chen", isYou: false, text: t("defendThread.msg3") },
    { from: youLabel, isYou: true, text: t("defendThread.msg4") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex h-12 items-center gap-2 border-b border-slate-200 px-4">
        <Hash className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-semibold text-slate-900">sarah-chen</span>
        <span className="text-xs text-slate-400">· {t("defendThread.role")}</span>
        <div className="ml-auto flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {t("defendThread.defendingDecisions")}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3 p-4">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 + i * 0.15 }}
            className={`flex gap-2.5 ${msg.isYou ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${
                msg.isYou ? "bg-primary" : "bg-emerald-500"
              }`}
            >
              {msg.isYou ? youLabel[0] : "S"}
            </div>
            <div className={`max-w-[75%] ${msg.isYou ? "text-right" : ""}`}>
              <div className="mb-0.5 text-[10px] font-semibold text-slate-900">{msg.from}</div>
              <div
                className={`inline-block rounded-lg p-2.5 text-xs leading-relaxed text-slate-700 ${
                  msg.isYou ? "bg-primary/10 text-left" : "bg-slate-100"
                }`}
              >
                {msg.text}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="flex h-14 items-center gap-2 border-t border-slate-200 px-4">
        <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">
          {t("defendThread.replyPlaceholder")}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Send className="h-4 w-4 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   MOCKUP: Hiring-manager dashboard — ranked candidates + evidence
   ============================================================ */
function HiringManagerMock() {
  const t = useTranslations("product");
  const candidates = [
    { name: "Priya Patel", overall: 4.4, selected: true, tag: t("hiringManagers.mock.topMatch") },
    { name: "John Smith", overall: 4.1 },
    { name: "Emma Wong", overall: 3.8 },
    { name: "Mike Liu", overall: 3.5 },
  ];

  const dimensions = [
    { name: t("hiringManagers.mock.dimensions.problemSolving"), score: 4.6, color: "bg-emerald-500" },
    { name: t("hiringManagers.mock.dimensions.aiLeverage"), score: 4.5, color: "bg-emerald-500" },
    { name: t("hiringManagers.mock.dimensions.communication"), score: 4.3, color: "bg-blue-500" },
    { name: t("hiringManagers.mock.dimensions.technicalDepth"), score: 4.1, color: "bg-blue-500" },
    { name: t("hiringManagers.mock.dimensions.collaboration"), score: 4.4, color: "bg-blue-500" },
    { name: t("hiringManagers.mock.dimensions.timeManagement"), score: 3.9, color: "bg-amber-500" },
  ];

  const evidence = [
    {
      dim: t("hiringManagers.mock.dimensions.problemSolving"),
      ts: "02:14",
      quote: t("hiringManagers.mock.evidence1"),
    },
    {
      dim: t("hiringManagers.mock.dimensions.technicalDepth"),
      ts: "18:42",
      quote: t("hiringManagers.mock.evidence2"),
    },
    {
      dim: t("hiringManagers.mock.dimensions.communication"),
      ts: "24:50",
      quote: t("hiringManagers.mock.evidence3"),
    },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[320px,1fr]">
      {/* LEFT: ranked list */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex items-center justify-between px-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900">{t("hiringManagers.mock.role")}</h4>
            <div className="text-[10px] text-slate-500">{t("hiringManagers.mock.rankedByOverall")}</div>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {t("hiringManagers.mock.completed")}
          </span>
        </div>
        <div className="space-y-1.5">
          {candidates.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className={`flex items-center gap-3 rounded-xl p-2.5 ${
                c.selected ? "bg-primary/5 ring-2 ring-primary/30" : ""
              }`}
            >
              <span className="w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-[11px] font-bold text-white">
                {c.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-slate-900">{c.name}</span>
                  {c.tag && (
                    <span className="flex-shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      {c.tag}
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${c.selected ? "bg-primary" : "bg-slate-300"}`}
                    style={{ width: `${(c.overall / 5) * 100}%` }}
                  />
                </div>
              </div>
              <div
                className={`text-sm font-black ${c.selected ? "text-primary" : "text-slate-700"}`}
              >
                {c.overall.toFixed(1)}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* RIGHT: scorecard + evidence */}
      <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 text-base font-bold text-white">
                P
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">Priya Patel</div>
                <div className="text-xs text-slate-500">{t("hiringManagers.mock.candidateRoleTime")}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black leading-none text-primary">4.4</div>
              <div className="mt-0.5 text-[10px] text-slate-500">{t("hiringManagers.mock.overall")}</div>
            </div>
          </div>

          <div className="space-y-2.5">
            {dimensions.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, x: -6 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.07 }}
                className="flex items-center gap-3"
              >
                <div className="w-32 flex-shrink-0 text-xs font-medium text-slate-700">
                  {d.name}
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(d.score / 5) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.07, duration: 0.6 }}
                    className={`h-full rounded-full ${d.color}`}
                  />
                </div>
                <div className="w-8 text-right text-xs font-bold text-slate-700">{d.score}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Evidence card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {t("hiringManagers.mock.observedEvidence")}
            </span>
          </div>
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45 + i * 0.1 }}
                className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <span className="flex-shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {e.ts}
                </span>
                <div className="flex-1">
                  <div className="mb-0.5 text-[10px] font-semibold text-slate-500">{e.dim}</div>
                  <div className="text-xs leading-relaxed text-slate-700">{e.quote}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ============================================================
   MOCKUP: Hero composite — layered chat + voice call + IDE peek
   ============================================================ */
function HeroComposite() {
  const t = useTranslations("product");
  return (
    <div className="relative mx-auto h-[520px] w-full max-w-4xl">
      {/* Back: IDE peek (top-left, rotated) */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -6 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="absolute left-0 top-6 w-72 origin-bottom-right overflow-hidden rounded-xl bg-slate-900 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-950 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <div className="h-2 w-2 rounded-full bg-yellow-500" />
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="ml-2 text-[10px] text-slate-500">checkout.ts</span>
          <div className="ml-auto flex items-center gap-1 rounded bg-red-500/90 px-1.5 py-0.5">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="h-1 w-1 rounded-full bg-white"
            />
            <span className="text-[8px] font-bold text-white">REC</span>
          </div>
        </div>
        <div className="space-y-1.5 p-3">
          {[60, 40, 75, 50, 65].map((w, i) => (
            <div
              key={i}
              className={`h-1.5 rounded ${
                i === 0 ? "bg-purple-500/60" : i === 2 ? "bg-emerald-500/60" : "bg-slate-700"
              }`}
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      </motion.div>

      {/* Middle: Slack chat (center-left, focal) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="absolute left-24 top-28 z-10 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex h-10 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4">
          <Hash className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-900">sarah-chen</span>
          <span className="text-[10px] text-slate-400">{t("hero.chatRole")}</span>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="flex gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-bold text-white">
              S
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold text-slate-900">Sarah Chen</div>
              <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-xs text-slate-700">
                {t("hero.chatMsg1")}
              </div>
            </div>
          </div>
          <div className="flex flex-row-reverse gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-white">
              {t("hero.chatYou")[0]}
            </div>
            <div className="flex-1 text-right">
              <div className="text-[10px] font-semibold text-slate-900">{t("hero.chatYou")}</div>
              <div className="mt-0.5 inline-block rounded-lg bg-primary/10 p-2 text-left text-xs text-slate-700">
                {t("hero.chatMsg2")}
              </div>
            </div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-xs font-bold text-white"
          >
            <Phone className="h-3.5 w-3.5" /> {t("hero.startCall")}
          </motion.div>
        </div>
      </motion.div>

      {/* Front: Voice call (bottom-right) */}
      <motion.div
        initial={{ opacity: 0, y: 20, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: 4 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="absolute bottom-4 right-0 z-20 w-[280px] origin-top-left"
      >
        <VoiceCallMock compact />
      </motion.div>
    </div>
  );
}

/* ============================================================
   FEATURES GRID CARD
   ============================================================ */
const FeatureCard = ({
  icon: Icon,
  title,
  text,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  iconBg: string;
  iconColor: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4 }}
    className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-primary/30 hover:shadow-lg"
  >
    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
      <Icon className={`h-6 w-6 ${iconColor}`} />
    </div>
    <h3 className="mb-2 text-lg font-bold text-slate-900">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-600">{text}</p>
  </motion.div>
);

/* ============================================================
   FAQ
   ============================================================ */
function ProductFAQ() {
  const t = useTranslations("product");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { question: t("faq.q1.question"), answer: t("faq.q1.answer") },
    { question: t("faq.q5.question"), answer: t("faq.q5.answer") },
    { question: t("faq.q6.question"), answer: t("faq.q6.answer") },
    { question: t("faq.q2.question"), answer: t("faq.q2.answer") },
    { question: t("faq.q7.question"), answer: t("faq.q7.answer") },
    { question: t("faq.q8.question"), answer: t("faq.q8.answer") },
    { question: t("faq.q3.question"), answer: t("faq.q3.answer") },
    { question: t("faq.q4.question"), answer: t("faq.q4.answer") },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
        >
          <button
            className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-50"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <div className="flex flex-1 items-start space-x-4">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-bold text-primary">Q</span>
              </div>
              <h3 className="pr-4 text-lg font-semibold text-slate-900">{faq.question}</h3>
            </div>
            <ChevronDown
              className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300 ${
                openIndex === index ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === index && (
            <div className="animate-in fade-in px-6 pb-5 duration-200">
              <div className="pl-12 leading-relaxed text-slate-600">{faq.answer}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function ProductV2Page() {
  const t = useTranslations("product");
  const [activeStep, setActiveStep] = useState(0);

  const stepMocks = [<VoiceCallMock key="call" />, <IdeRecordingMock key="ide" />, <DefendThreadMock key="defend" />];

  const timelineSteps = [
    {
      icon: Users,
      title: t("timeline.step1.title"),
      description: t("timeline.step1.description"),
      tags: [t("timeline.step1.tag1"), t("timeline.step1.tag2")],
    },
    {
      icon: Code,
      title: t("timeline.step2.title"),
      description: t("timeline.step2.description"),
      tags: [t("timeline.step2.tag1"), t("timeline.step2.tag2"), t("timeline.step2.tag3")],
    },
    {
      icon: MessageSquare,
      title: t("timeline.step3.title"),
      description: t("timeline.step3.description"),
      tags: [t("timeline.step3.tag1"), t("timeline.step3.tag2")],
    },
  ];

  const comparisonData = [
    {
      feature: t("comparison.signalQuality.title"),
      oldWay: t("comparison.signalQuality.oldWay"),
      skillveeWay: t("comparison.signalQuality.skillveeWay"),
    },
    {
      feature: t("comparison.candidateExperience.title"),
      oldWay: t("comparison.candidateExperience.oldWay"),
      skillveeWay: t("comparison.candidateExperience.skillveeWay"),
    },
    {
      feature: t("comparison.timeToHire.title"),
      oldWay: t("comparison.timeToHire.oldWay"),
      skillveeWay: t("comparison.timeToHire.skillveeWay"),
    },
    {
      feature: t("comparison.bias.title"),
      oldWay: t("comparison.bias.oldWay"),
      skillveeWay: t("comparison.bias.skillveeWay"),
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ============================================
          HERO — dark with composite mockup
          ============================================ */}
      <div className="relative overflow-hidden bg-[#020617]">
        <Navigation variant="dark" currentPage="product" />

        {/* Ambient glows */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/30 blur-[200px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-indigo-500/20 blur-[200px]"
        />

        <section className="relative pb-24 pt-32">
          <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <h1 className="mb-6 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                {t("hero.title")}
                <br />
                <span className="text-primary">{t("hero.titleHighlight")}</span>
              </h1>

              <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-400">{t("hero.subtitle")}</p>

              {/* Roles signal — makes it clear this isn't engineering-only */}
              <div className="mx-auto mb-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs sm:text-sm text-slate-400">
                <span className="text-slate-500">{t("hero.rolesLabel")}</span>
                {[
                  t("hero.roles.engineering"),
                  t("hero.roles.product"),
                  t("hero.roles.dataScience"),
                  t("hero.roles.sales"),
                  t("hero.roles.customerSuccess"),
                ].map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-medium text-slate-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </motion.div>

            <HeroComposite />
          </div>
        </section>
      </div>

      {/* ============================================
          TIMELINE — 3 steps, each with a mockup
          ============================================ */}
      <section className="relative bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("timeline.title")}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600">{t("timeline.subtitle")}</p>
          </SectionReveal>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Step selector */}
            <div className="lg:col-span-1">
              <div className="flex flex-col gap-4">
                {timelineSteps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`rounded-xl border p-6 text-left transition-all duration-300 ${
                      activeStep === index
                        ? "border-primary/50 bg-primary/10"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          activeStep === index ? "bg-primary/20" : "bg-slate-100"
                        }`}
                      >
                        <step.icon
                          className={`h-5 w-5 ${
                            activeStep === index ? "text-primary" : "text-slate-500"
                          }`}
                        />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step detail */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-2xl border border-slate-200 bg-white p-8"
                >
                  <div className="mb-8 flex min-h-[380px] items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 p-8">
                    {stepMocks[activeStep]}
                  </div>
                  <h3 className="mb-4 text-2xl font-bold text-slate-900">
                    {timelineSteps[activeStep].title}
                  </h3>
                  <p className="mb-6 text-slate-600">{timelineSteps[activeStep].description}</p>
                  <div className="flex flex-wrap gap-2">
                    {timelineSteps[activeStep].tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-primary/10 px-2 py-1 text-xs text-primary/80"
                      >
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

      {/* ============================================
          HIRING-MANAGER VIEW — pick the right hire
          ============================================ */}
      <section className="relative bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-14 text-center">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              {t("hiringManagers.badge")}
            </p>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("hiringManagers.title")}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600">
              {t("hiringManagers.subtitle")}
            </p>
          </SectionReveal>

          <SectionReveal className="mx-auto max-w-6xl">
            <div className="rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 p-6 ring-1 ring-slate-200 sm:p-10">
              <HiringManagerMock />
            </div>
          </SectionReveal>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { title: t("hiringManagers.card1.title"), desc: t("hiringManagers.card1.desc") },
              { title: t("hiringManagers.card2.title"), desc: t("hiringManagers.card2.desc") },
              { title: t("hiringManagers.card3.title"), desc: t("hiringManagers.card3.desc") },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-black text-primary">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{v.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* ============================================
          FEATURES GRID
          ============================================ */}
      <section className="relative bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("features.title")}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600">{t("features.subtitle")}</p>
          </SectionReveal>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={BarChart3}
              title={t("features.scorecard.title")}
              text={t("features.scorecard.text")}
              iconBg="bg-blue-500/10"
              iconColor="text-blue-600"
            />
            <FeatureCard
              icon={MessageSquare}
              title={t("features.transcripts.title")}
              text={t("features.transcripts.text")}
              iconBg="bg-purple-500/10"
              iconColor="text-purple-600"
            />
            <FeatureCard
              icon={Video}
              title={t("features.recording.title")}
              text={t("features.recording.text")}
              iconBg="bg-emerald-500/10"
              iconColor="text-emerald-600"
            />
            <FeatureCard
              icon={Brain}
              title={t("features.aiUsage.title")}
              text={t("features.aiUsage.text")}
              iconBg="bg-amber-500/10"
              iconColor="text-amber-600"
            />
            <FeatureCard
              icon={CheckCircle2}
              title={t("features.feedback.title")}
              text={t("features.feedback.text")}
              iconBg="bg-rose-500/10"
              iconColor="text-rose-600"
            />
            <FeatureCard
              icon={Users}
              title={t("features.communication.title")}
              text={t("features.communication.text")}
              iconBg="bg-indigo-500/10"
              iconColor="text-indigo-600"
            />
          </div>
        </div>
        <CurveDivider fillColor="fill-white" />
      </section>

      {/* ============================================
          COMPARISON
          ============================================ */}
      <section className="relative bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("comparison.title")}
            </h2>
          </SectionReveal>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="mb-6 text-center text-2xl font-bold text-red-600">
                {t("comparison.oldWayLabel")}
              </h3>
              <div className="space-y-6">
                {comparisonData.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <h3 className="mb-2 font-bold text-slate-900">{item.feature}</h3>
                    <div className="flex items-start gap-3">
                      <XCircle className="mt-1 h-5 w-5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-slate-600">{item.oldWay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="mb-6 text-center text-2xl font-bold text-emerald-600">
                {t("comparison.skillveeWayLabel")}
              </h3>
              <div className="space-y-6">
                {comparisonData.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-6"
                  >
                    <h3 className="mb-2 font-bold text-slate-900">{item.feature}</h3>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-500" />
                      <p className="text-sm text-slate-600">{item.skillveeWay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
        <CurveDivider fillColor="fill-slate-50" />
      </section>

      {/* ============================================
          FITS YOUR WORKFLOW — setup speed + ATS logos
          ============================================ */}
      <section className="relative bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-14 text-center">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              {t("workflow.badge")}
            </p>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("workflow.title")}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-600">
              {t("workflow.subtitle")}
            </p>
          </SectionReveal>

          {/* 3-step setup flow */}
          <div className="mx-auto mb-20 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: t("workflow.step1.title"),
                desc: t("workflow.step1.desc"),
                visual: (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      <span className="text-[9px] font-semibold text-slate-500">{t("workflow.step1.label")}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full rounded bg-slate-200" />
                      <div className="h-1.5 w-11/12 rounded bg-slate-200" />
                      <div className="h-1.5 w-4/5 rounded bg-slate-200" />
                      <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                    </div>
                  </div>
                ),
              },
              {
                step: "2",
                title: t("workflow.step2.title"),
                desc: t("workflow.step2.desc"),
                visual: (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <div className="h-6 w-6 flex-shrink-0 rounded-lg bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center">S</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-semibold text-slate-900">{t("workflow.step2.persona1")}</div>
                      </div>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <div className="h-6 w-6 flex-shrink-0 rounded-lg bg-purple-500 text-[10px] font-bold text-white flex items-center justify-center">D</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-semibold text-slate-900">{t("workflow.step2.persona2")}</div>
                      </div>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <div className="h-6 w-6 flex-shrink-0 rounded-lg bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center">T</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-semibold text-slate-900">{t("workflow.step2.persona3")}</div>
                      </div>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                  </div>
                ),
              },
              {
                step: "3",
                title: t("workflow.step3.title"),
                desc: t("workflow.step3.desc"),
                visual: (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[9px] font-semibold text-slate-500">{t("workflow.step3.linkLabel")}</span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                        {t("workflow.step3.ready")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded border border-slate-200 bg-white p-1.5">
                      <Globe className="h-3 w-3 text-slate-400" />
                      <span className="truncate font-mono text-[10px] text-slate-700">
                        skillvee.com/s/a8f2-backend
                      </span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <div className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white">
                        <Send className="h-2.5 w-2.5" /> {t("workflow.step3.copyLink")}
                      </div>
                    </div>
                  </div>
                ),
              },
            ].map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-black text-white shadow-lg shadow-primary/20">
                    {s.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                </div>
                <div className="mb-4">{s.visual}</div>
                <p className="text-sm leading-relaxed text-slate-600">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* ATS integrations */}
          <SectionReveal className="mx-auto max-w-5xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                {t("ats.badge")}
              </div>
              <p className="mx-auto mb-6 max-w-xl text-sm text-slate-600">
                {t("ats.description")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
                {[
                  "Greenhouse",
                  "Lever",
                  "Ashby",
                  "Workday",
                  "Rippling",
                  "Teamtailor",
                  "SmartRecruiters",
                ].map((ats) => (
                  <span
                    key={ats}
                    className="text-lg font-bold tracking-tight text-slate-400 transition-colors hover:text-slate-700"
                  >
                    {ats}
                  </span>
                ))}
              </div>
              <div className="mt-6 text-xs text-slate-500">
                {t("ats.footer")}
              </div>
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ============================================
          SECURITY
          ============================================ */}
      <section className="relative bg-slate-900 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              {t("security.title")}
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-400">{t("security.subtitle")}</p>
          </SectionReveal>

          <SectionReveal>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/30">
                  <Shield className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{t("security.soc2.title")}</h3>
                <p className="text-sm text-slate-400">{t("security.soc2.description")}</p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/30">
                  <Lock className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{t("security.gdpr.title")}</h3>
                <p className="text-sm text-slate-400">{t("security.gdpr.description")}</p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/30">
                  <Globe className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-white">{t("security.sso.title")}</h3>
                <p className="text-sm text-slate-400">{t("security.sso.description")}</p>
              </div>
            </div>
          </SectionReveal>

          <SectionReveal className="mt-12 text-center">
            <Link href="/demo">
              <Button
                variant="outline"
                className="border-white/50 bg-transparent text-white hover:border-white hover:bg-white/10"
              >
                {t("security.contactCta")}
              </Button>
            </Link>
          </SectionReveal>
        </div>
      </section>

      {/* ============================================
          FAQ
          ============================================ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-6 sm:px-8 lg:px-6">
          <SectionReveal className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900 sm:text-4xl">
              {t("faq.title")}
            </h2>
          </SectionReveal>
          <ProductFAQ />
        </div>
      </section>

      {/* ============================================
          FINAL CTA
          ============================================ */}
      <section className="relative overflow-hidden bg-[#020617] py-32">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
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
              {t("cta.title")}
              <br />
              <span className="text-primary">{t("cta.titleHighlight")}</span>
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">{t("cta.subtitle")}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/demo">
                <Button className="group h-14 rounded-full bg-white px-10 text-lg font-bold text-slate-900 shadow-xl hover:bg-slate-100">
                  {t("cta.requestDemo")}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/demo#sample">
                <Button
                  variant="ghost"
                  className="h-14 rounded-full border border-white/30 bg-transparent px-8 font-semibold text-white hover:border-white/50 hover:bg-white/10 hover:text-white"
                >
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
