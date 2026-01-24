/**
 * Email Service Module
 *
 * Handles transactional email delivery using Resend.
 * Primary use case: sending assessment report notifications to candidates.
 */

import { Resend } from "resend";
import { env } from "@/lib/core";
import type {
  AssessmentReport,
  SkillCategory,
} from "@/lib/analysis";

// ============================================================================
// Resend Client
// ============================================================================

/**
 * Creates a Resend client if API key is configured.
 * Returns null if email service is not set up.
 */
function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(env.RESEND_API_KEY);
}

// ============================================================================
// Email Constants
// ============================================================================

/**
 * Default sender email for Skillvee notifications.
 * Note: Must be verified in Resend dashboard for production.
 * During development, Resend allows sending to verified emails only
 * or use "onboarding@resend.dev" for testing.
 */
export const DEFAULT_FROM_EMAIL = "Skillvee <noreply@skillvee.com>";
export const FALLBACK_FROM_EMAIL = "onboarding@resend.dev"; // Resend's test sender

// ============================================================================
// Email Types
// ============================================================================

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendReportEmailParams {
  to: string;
  candidateName?: string;
  assessmentId: string;
  report: AssessmentReport;
  appBaseUrl: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps skill category enum to display name
 */
function formatSkillCategory(category: SkillCategory): string {
  const categoryNames: Record<SkillCategory, string> = {
    communication: "Communication",
    problem_decomposition: "Problem Decomposition",
    ai_leverage: "AI Leverage",
    code_quality: "Code Quality",
    xfn_collaboration: "Cross-Functional Collaboration",
    time_management: "Time Management",
    technical_decision_making: "Technical Decision-Making",
    presentation: "Presentation",
  };
  return categoryNames[category];
}

/**
 * Maps performance level to display text and emoji
 */
function formatLevel(level: string): { text: string; emoji: string } {
  const levelInfo: Record<string, { text: string; emoji: string }> = {
    exceptional: { text: "Exceptional", emoji: "🌟" },
    strong: { text: "Strong", emoji: "✓" },
    adequate: { text: "Adequate", emoji: "○" },
    developing: { text: "Developing", emoji: "→" },
    needs_improvement: { text: "Needs Improvement", emoji: "!" },
  };
  return levelInfo[level] || { text: level, emoji: "○" };
}

/**
 * Generates a score bar visualization for emails (text-based)
 */
function generateScoreBar(score: number): string {
  const filled = Math.round(score);
  const empty = 5 - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

// ============================================================================
// Email Template Functions
// ============================================================================

/**
 * Generates HTML email content for assessment report
 */
export function generateReportEmailHtml(params: SendReportEmailParams): string {
  const { candidateName, report, assessmentId, appBaseUrl } = params;
  const reportUrl = `${appBaseUrl}/assessment/${assessmentId}/results`;
  const levelInfo = formatLevel(report.overallLevel);

  // Get top 3 skill scores sorted by score descending
  const topSkills = [...report.skillScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Get top recommendations (high priority first)
  const topRecommendations = [...report.recommendations]
    .filter((r) => r.priority === "high" || r.priority === "medium")
    .slice(0, 2);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Assessment Report is Ready</title>
  <style>
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #000000;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #000000;
      color: #ffffff;
      padding: 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 24px;
    }
    .score-box {
      background-color: #237CF1;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
      border-radius: 12px;
    }
    .score-value {
      font-size: 48px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .score-label {
      font-size: 14px;
      color: #ffffff;
      margin-top: 8px;
      font-weight: 500;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #000000;
    }
    .skill-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .skill-name {
      font-weight: 500;
    }
    .skill-score {
      font-family: monospace;
      font-size: 14px;
    }
    .summary-text {
      font-size: 15px;
      color: #333333;
    }
    .strength-item, .improvement-item {
      padding: 8px 12px;
      margin-bottom: 8px;
      border-left: 3px solid;
    }
    .strength-item {
      background-color: #f0fff0;
      border-color: #22c55e;
    }
    .improvement-item {
      background-color: #fffbeb;
      border-color: #f59e0b;
    }
    .cta-button {
      display: inline-block;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 32px;
      font-weight: 600;
      font-size: 16px;
      margin-top: 24px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .footer {
      background-color: #f5f5f5;
      padding: 24px 32px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .footer a {
      color: #000000;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SKILLVEE</h1>
    </div>

    <div class="content">
      <p class="greeting">
        ${candidateName ? `Hi ${candidateName},` : "Hi,"}
      </p>

      <p>
        Your developer assessment is complete! Here's a summary of your performance.
      </p>

      <div class="score-box">
        <p class="score-value">${report.overallScore.toFixed(1)}/5</p>
        <p class="score-label">${levelInfo.emoji} ${levelInfo.text} Performance</p>
      </div>

      <div class="section">
        <h2 class="section-title">Top Skills</h2>
        ${topSkills
          .map(
            (skill) => `
          <div class="skill-row">
            <span class="skill-name">${formatSkillCategory(skill.category)}</span>
            <span class="skill-score">${generateScoreBar(skill.score)} ${skill.score.toFixed(1)}</span>
          </div>
        `
          )
          .join("")}
      </div>

      <div class="section">
        <h2 class="section-title">Summary</h2>
        <p class="summary-text">${report.narrative.overallSummary.slice(0, 500)}${report.narrative.overallSummary.length > 500 ? "..." : ""}</p>
      </div>

      ${
        report.narrative.strengths.length > 0
          ? `
      <div class="section">
        <h2 class="section-title">Key Strengths</h2>
        ${report.narrative.strengths
          .slice(0, 3)
          .map((s) => `<div class="strength-item">${s}</div>`)
          .join("")}
      </div>
      `
          : ""
      }

      ${
        topRecommendations.length > 0
          ? `
      <div class="section">
        <h2 class="section-title">Recommendations</h2>
        ${topRecommendations
          .map(
            (r) => `
          <div class="improvement-item">
            <strong>${r.title}</strong><br>
            ${r.description}
          </div>
        `
          )
          .join("")}
      </div>
      `
          : ""
      }

      <div class="cta-container">
        <a href="${reportUrl}" class="cta-button">View Full Report</a>
      </div>

      <p style="font-size: 13px; color: #666666; margin-top: 32px;">
        Your full report includes detailed skill breakdowns, evidence-based scores,
        and actionable steps to improve. Click the button above to view it all.
      </p>
    </div>

    <div class="footer">
      <p>
        This email was sent by <a href="${appBaseUrl}">Skillvee</a>.<br>
        You received this because you completed a developer assessment.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates plain text version of assessment report email
 */
export function generateReportEmailText(params: SendReportEmailParams): string {
  const { candidateName, report, assessmentId, appBaseUrl } = params;
  const reportUrl = `${appBaseUrl}/assessment/${assessmentId}/results`;
  const levelInfo = formatLevel(report.overallLevel);

  // Get top 3 skill scores
  const topSkills = [...report.skillScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const lines: string[] = [
    "SKILLVEE - Assessment Report",
    "=".repeat(40),
    "",
    candidateName ? `Hi ${candidateName},` : "Hi,",
    "",
    "Your developer assessment is complete!",
    "",
    "OVERALL SCORE",
    "-".repeat(20),
    `${report.overallScore.toFixed(1)}/5 - ${levelInfo.text} Performance`,
    "",
    "TOP SKILLS",
    "-".repeat(20),
  ];

  topSkills.forEach((skill) => {
    lines.push(
      `• ${formatSkillCategory(skill.category)}: ${skill.score.toFixed(1)}/5`
    );
  });

  lines.push(
    "",
    "SUMMARY",
    "-".repeat(20),
    report.narrative.overallSummary,
    ""
  );

  if (report.narrative.strengths.length > 0) {
    lines.push("KEY STRENGTHS", "-".repeat(20));
    report.narrative.strengths.slice(0, 3).forEach((s) => {
      lines.push(`✓ ${s}`);
    });
    lines.push("");
  }

  lines.push(
    "VIEW FULL REPORT",
    "-".repeat(20),
    `Visit: ${reportUrl}`,
    "",
    "Your full report includes detailed skill breakdowns, evidence-based scores,",
    "and actionable steps to improve.",
    "",
    "-".repeat(40),
    "Skillvee - Developer Assessment Platform",
    appBaseUrl
  );

  return lines.join("\n");
}

// ============================================================================
// Email Sending Functions
// ============================================================================

/**
 * Sends a generic email via Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const resend = getResendClient();

  if (!resend) {
    console.warn("Email service not configured (RESEND_API_KEY not set)");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    // Use fallback sender during development if primary isn't verified
    const fromEmail = env.RESEND_API_KEY?.startsWith("re_")
      ? DEFAULT_FROM_EMAIL
      : FALLBACK_FROM_EMAIL;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      console.error("Resend API error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sends an assessment report notification email
 */
export async function sendReportEmail(
  params: SendReportEmailParams
): Promise<EmailResult> {
  const { candidateName, to } = params;

  // Validate email
  if (!to || !to.includes("@")) {
    return {
      success: false,
      error: "Invalid email address",
    };
  }

  const html = generateReportEmailHtml(params);
  const text = generateReportEmailText(params);

  const subject = candidateName
    ? `${candidateName}, your Skillvee assessment report is ready!`
    : "Your Skillvee assessment report is ready!";

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Checks if the email service is configured and ready
 */
export function isEmailServiceConfigured(): boolean {
  return !!env.RESEND_API_KEY;
}
