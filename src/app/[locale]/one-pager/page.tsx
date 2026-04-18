"use client";

import Image from "next/image";
import {
  MessageSquare,
  FileCode,
  Video,
  Zap,
  Shield,
  TrendingUp,
  Globe,
  Lightbulb,
} from "lucide-react";

export default function OnePageInvestorPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div
        style={{ maxWidth: 960, margin: "0 auto", padding: "48px 32px" }}
      >
        {/* ── HEADER ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 24,
            marginBottom: 40,
            borderBottom: "3px solid #237CF1",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Image
              src="/skillvee-logo.png"
              alt="SkillVee"
              width={747}
              height={226}
              style={{ width: 180, height: "auto" }}
            />
            <p
              style={{
                fontSize: 16,
                color: "#475569",
                fontWeight: 600,
                margin: 0,
              }}
            >
              Work simulations that show who can actually do the job
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
            <Globe size={14} />
            <span>www.skillvee.com</span>
          </div>
        </header>

        {/* ── PROBLEM + SOLUTION ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginBottom: 40,
          }}
        >
          {/* PROBLEM */}
          <div>
            <SectionLabel>The Problem</SectionLabel>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              Hiring is broken in the AI era
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { metric: "72%", text: "of resumes are now AI-written and look alike" },
                {
                  metric: "45%",
                  text: "of candidates use AI during interviews",
                },
                {
                  metric: "<1%",
                  text: "of applicants are truly qualified",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      color: "#237CF1",
                      minWidth: 80,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.metric}
                  </span>
                  <span style={{ fontSize: 14, color: "#475569" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 13,
                fontWeight: 600,
                color: "#1e293b",
                background: "#f8fafc",
                borderLeft: "4px solid #237CF1",
                padding: "12px 16px",
                borderRadius: "0 8px 8px 0",
              }}
            >
              The key question remains:{" "}
              <em>Can this person actually do the job?</em>
            </div>
          </div>

          {/* SOLUTION */}
          <div>
            <SectionLabel>The Solution</SectionLabel>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              A 45-min simulation of the real job
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SolutionItem
                icon={<MessageSquare size={16} color="#237CF1" />}
                title="Live AI stakeholders"
                desc="Voice conversations with PM, manager, and tech lead — with memory and context"
              />
              <SolutionItem
                icon={<FileCode size={16} color="#237CF1" />}
                title="Real deliverables, not trivia"
                desc="Candidates produce actual work output — code, PRs, and decisions"
              />
              <SolutionItem
                icon={<Video size={16} color="#237CF1" />}
                title="Full capture & structured evaluation"
                desc="Screen + voice recorded end-to-end, with scorecards, transcripts, and artifacts"
              />
            </div>
            <p
              style={{
                marginTop: 20,
                fontSize: 13,
                fontWeight: 600,
                color: "#334155",
              }}
            >
              Compare candidates side-by-side on real work.
            </p>
          </div>
        </div>

        {/* ── WHY NOW + KEY INSIGHT ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginBottom: 40,
          }}
        >
          {/* WHY NOW */}
          <div
            style={{
              background: "rgba(35, 124, 241, 0.04)",
              border: "1px solid rgba(35, 124, 241, 0.2)",
              borderRadius: 12,
              padding: "24px 28px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Zap size={18} color="#237CF1" />
              <SectionLabel style={{ marginBottom: 0 }}>Why Now</SectionLabel>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px",
                  }}
                >
                  Live AI models
                </p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                  Real-time voice + context make realistic stakeholder
                  conversations possible at scale.
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: "0 0 4px",
                  }}
                >
                  Multimodal AI
                </p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                  Analyze hour-long work sessions reliably — see how candidates
                  actually work.
                </p>
              </div>
            </div>
            <p
              style={{
                marginTop: 16,
                marginBottom: 0,
                fontSize: 13,
                fontWeight: 700,
                color: "#237CF1",
              }}
            >
              This was impossible 6 months ago. Now it works.
            </p>
          </div>

          {/* KEY INSIGHT */}
          <div
            style={{
              background: "rgba(35, 124, 241, 0.04)",
              border: "1px solid rgba(35, 124, 241, 0.2)",
              borderRadius: 12,
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Lightbulb size={18} color="#237CF1" />
              <SectionLabel style={{ marginBottom: 0 }}>
                Key Insight
              </SectionLabel>
            </div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Interviews are going away. The future of hiring is watching people
              work.
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                margin: "12px 0 0",
                lineHeight: 1.6,
              }}
            >
              Resumes, take-homes, and interviews are all gameable now. Watching
              real work isn&apos;t.
            </p>
          </div>
        </div>

        {/* ── MARKET + MOAT ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginBottom: 40,
          }}
        >
          {/* MARKET */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <TrendingUp size={16} color="#237CF1" />
              <SectionLabel style={{ marginBottom: 0 }}>Market</SectionLabel>
            </div>
            <div
              style={{
                fontSize: 14,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              <span
                style={{ fontSize: 40, fontWeight: 900, color: "#0f172a" }}
              >
                $3B
              </span>
              <span style={{ fontSize: 13, color: "#64748b" }}>
                pre-hire assessment market
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#334155", fontWeight: 700, margin: "0 0 16px" }}>
              Growing 16% CAGR
            </p>
            <div
              style={{
                fontSize: 13,
                color: "#475569",
                background: "#f8fafc",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 12,
              }}
            >
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                Comparables:
              </span>{" "}
              Mercor ($10B), Juicebox ($850M) — AI solved sourcing.
              HackerRank ($500M, $221M rev) — the incumbent we replace.
              Evaluation is the missing layer.
            </div>
          </div>

          {/* MOAT */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <Shield size={16} color="#237CF1" />
              <SectionLabel style={{ marginBottom: 0 }}>Moat</SectionLabel>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              Every simulation teaches us what &quot;good&quot; looks like{" "}
              <span style={{ fontWeight: 700 }}>for each company</span>. As we
              track which hires succeed, we can predict who will thrive where —
              not generically, but for each team specifically.
            </p>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                Competitors can copy the product. They can&apos;t copy the data.
                Starting with engineering, expanding to every white-collar role.
              </p>
            </div>
          </div>
        </div>

        {/* ── BUSINESS MODEL + PROGRESS ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginBottom: 40,
          }}
        >
          {/* BUSINESS MODEL */}
          <div>
            <SectionLabel>Business Model</SectionLabel>
            <p
              style={{
                fontSize: 13,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              SaaS with freemium. Paid plans from $79/month to enterprise
              custom pricing.
            </p>
            <div
              style={{
                fontSize: 13,
                color: "#475569",
                background: "#f8fafc",
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                Beachhead:
              </span>{" "}
              Engineering teams hiring 5+ developers/month — hardest roles to
              evaluate, highest cost of a bad hire. Expands to design, product,
              and all white-collar roles.
            </div>
          </div>

          {/* PROGRESS */}
          <div>
            <SectionLabel>Progress</SectionLabel>
            <p
              style={{
                fontSize: 13,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              Working prototype built. 2 committed pilots. Full simulation flow
              live — AI voice conversations, real coding environment, screen
              capture, and automated scorecards.
            </p>
            <div
              style={{
                fontSize: 13,
                color: "#475569",
                background: "#f8fafc",
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                Stack:
              </span>{" "}
              Next.js, Supabase, Gemini Live (voice), Gemini Flash
              (evaluation). Built and shipping fast.
            </div>
          </div>
        </div>

        {/* ── TEAM ── */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>Team</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              marginTop: 20,
            }}
          >
            {/* German */}
            <div style={{ display: "flex", gap: 16 }}>
              <Image
                src="/germanreyes.png"
                alt="German Reyes"
                width={100}
                height={100}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(35, 124, 241, 0.2)",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  German Reyes{" "}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "#94a3b8",
                      marginLeft: 4,
                    }}
                  >
                    CEO
                  </span>
                </p>
                <ul
                  style={{
                    fontSize: 13,
                    color: "#475569",
                    margin: "4px 0 0",
                    paddingLeft: 0,
                    lineHeight: 1.7,
                    listStyle: "none",
                  }}
                >
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>2 HR Tech exits (acq. by Buk)</li>
                  <li>
                    <span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>Built to{" "}
                    <span style={{ fontWeight: 600 }}>$1.4M ARR</span>
                  </li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>ex-GPM, Walmart eCommerce</li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>Berkeley MBA</li>
                </ul>
              </div>
            </div>

            {/* Matias */}
            <div style={{ display: "flex", gap: 16 }}>
              <Image
                src="/matiashoyl.jpeg"
                alt="Matias Hoyl"
                width={100}
                height={100}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(35, 124, 241, 0.2)",
                  flexShrink: 0,
                }}
              />
              <div>
                <p style={{ fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Matias Hoyl{" "}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 400,
                      color: "#94a3b8",
                      marginLeft: 4,
                    }}
                  >
                    CTO
                  </span>
                </p>
                <ul
                  style={{
                    fontSize: 13,
                    color: "#475569",
                    margin: "4px 0 0",
                    paddingLeft: 0,
                    lineHeight: 1.7,
                    listStyle: "none",
                  }}
                >
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>Meta GenAI</li>
                  <li>
                    <span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>Built Zapien (
                    <span style={{ fontWeight: 600 }}>35K users</span>)
                  </li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>Stanford MS</li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>2x Stanford Learning Design winner</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Why Us pills */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginTop: 24,
            }}
          >
            {[
              { label: "We know the buyer", detail: "HR Tech exits" },
              { label: "We can build this", detail: "Meta GenAI" },
              { label: "We move fast", detail: "Working prototype" },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "12px 16px",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    margin: 0,
                  }}
                >
                  {item.label}
                </p>
                <p
                  style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}
                >
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER / CTA ── */}
        <footer
          style={{
            borderTop: "3px solid #237CF1",
            paddingTop: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Currently raising seed
            </p>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>
              german@skillvee.com
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── Helper components ── */

function SectionLabel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        color: "#237CF1",
        marginBottom: 16,
        marginTop: 0,
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

function SolutionItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "rgba(35, 124, 241, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {icon}
      </div>
      <div>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          {title}
        </span>
        <p style={{ fontSize: 13, color: "#64748b", margin: "2px 0 0" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}
