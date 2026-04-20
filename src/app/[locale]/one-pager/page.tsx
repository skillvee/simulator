"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("onePager");
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
              {t("tagline")}
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
            <SectionLabel>{t("problem.label")}</SectionLabel>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              {t("problem.title")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { metric: "72%", text: t("problem.stat1") },
                { metric: "45%", text: t("problem.stat2") },
                { metric: "<1%", text: t("problem.stat3") },
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
              {t("problem.callout")}{" "}
              <em>{t("problem.calloutEmphasis")}</em>
            </div>
          </div>

          {/* SOLUTION */}
          <div>
            <SectionLabel>{t("solution.label")}</SectionLabel>
            <h3
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              {t("solution.title")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <SolutionItem
                icon={<MessageSquare size={16} color="#237CF1" />}
                title={t("solution.item1Title")}
                desc={t("solution.item1Desc")}
              />
              <SolutionItem
                icon={<FileCode size={16} color="#237CF1" />}
                title={t("solution.item2Title")}
                desc={t("solution.item2Desc")}
              />
              <SolutionItem
                icon={<Video size={16} color="#237CF1" />}
                title={t("solution.item3Title")}
                desc={t("solution.item3Desc")}
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
              {t("solution.footer")}
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
              <SectionLabel style={{ marginBottom: 0 }}>{t("whyNow.label")}</SectionLabel>
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
                  {t("whyNow.item1Title")}
                </p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                  {t("whyNow.item1Desc")}
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
                  {t("whyNow.item2Title")}
                </p>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                  {t("whyNow.item2Desc")}
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
              {t("whyNow.footer")}
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
                {t("keyInsight.label")}
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
              {t("keyInsight.headline")}
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                margin: "12px 0 0",
                lineHeight: 1.6,
              }}
            >
              {t("keyInsight.detail")}
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
              <SectionLabel style={{ marginBottom: 0 }}>{t("market.label")}</SectionLabel>
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
                {t("market.tamLabel")}
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#334155", fontWeight: 700, margin: "0 0 16px" }}>
              {t("market.growth")}
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
                {t("market.comparablesLabel")}
              </span>{" "}
              {t("market.comparablesText")}
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
              <SectionLabel style={{ marginBottom: 0 }}>{t("moat.label")}</SectionLabel>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              {t("moat.introPre")}
              <span style={{ fontWeight: 700 }}>{t("moat.introHighlight")}</span>
              {t("moat.introPost")}
            </p>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 8,
                padding: "12px 16px",
              }}
            >
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                {t("moat.footer")}
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
            <SectionLabel>{t("businessModel.label")}</SectionLabel>
            <p
              style={{
                fontSize: 13,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              {t("businessModel.intro")}
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
                {t("businessModel.beachheadLabel")}
              </span>{" "}
              {t("businessModel.beachheadText")}
            </div>
          </div>

          {/* PROGRESS */}
          <div>
            <SectionLabel>{t("progress.label")}</SectionLabel>
            <p
              style={{
                fontSize: 13,
                color: "#334155",
                margin: "0 0 12px",
                lineHeight: 1.6,
              }}
            >
              {t("progress.intro")}
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
                {t("progress.stackLabel")}
              </span>{" "}
              {t("progress.hackathon")}
              {" · "}
              {t("progress.startx")}
            </div>
          </div>
        </div>

        {/* ── TEAM ── */}
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>{t("team.label")}</SectionLabel>
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
                    {t("team.germanRole")}
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
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.germanItem1")}</li>
                  <li>
                    <span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.germanItem2Pre")}
                    <span style={{ fontWeight: 600 }}>{t("team.germanItem2Highlight")}</span>
                  </li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.germanItem3")}</li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.germanItem4")}</li>
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
                    {t("team.matiasRole")}
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
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.matiasItem1")}</li>
                  <li>
                    <span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.matiasItem2Pre")}
                    <span style={{ fontWeight: 600 }}>{t("team.matiasItem2Highlight")}</span>
                    {t("team.matiasItem2Post")}
                  </li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.matiasItem3")}</li>
                  <li><span style={{ color: "#cbd5e1", marginRight: 8, fontSize: 8 }}>&#9679;</span>{t("team.matiasItem4")}</li>
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
              { label: t("team.pill1Label"), detail: t("team.pill1Detail") },
              { label: t("team.pill2Label"), detail: t("team.pill2Detail") },
              { label: t("team.pill3Label"), detail: t("team.pill3Detail") },
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
              {t("footer.title")}
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
