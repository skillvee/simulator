/**
 * YC Outreach Email Generator
 *
 * Generates personalized cold emails to YC founders who are actively hiring.
 * Pitch: Use SkillVee for free in exchange for feedback.
 *
 * Usage: npx tsx scripts/yc-outreach/generate-emails.ts
 *
 * After running:
 * 1. Open each founder's LinkedIn in Apollo Chrome extension to find email
 * 2. Copy the generated email from output/emails/
 * 3. Paste into your email client, review, and send
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Founder {
  name: string;
  title: string;
  linkedin: string;
  email?: string;
  phone?: string;
}

interface Company {
  company: string;
  batch: string;
  description: string;
  job_posted: string;
  founders: Founder[];
}

const companies: Company[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "companies.json"), "utf-8")
);

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

function generateSubject(company: string, jobTitle: string): string {
  return `Better way to assess your ${jobTitle} candidates — free for ${company}`;
}

function generateEmail(company: Company, founder: Founder): string {
  const firstName = getFirstName(founder.name);
  const subject = generateSubject(company.company, company.job_posted);

  return `Subject: ${subject}

Hi ${firstName},

I saw ${company.company} is hiring a ${company.job_posted} — congrats on the growth.

I'm building SkillVee, a developer assessment platform that simulates a realistic "day at work." Instead of leetcode or take-home tests, candidates go through an HR interview, manager kickoff, a coding task, and a PR defense — all AI-powered, with screen recording. It measures HOW developers work (communication, problem-solving, AI leverage, collaboration), not just what they produce.

We're offering free access to YC founders who are actively hiring in exchange for honest feedback. No strings, no credit card — just use it for your ${company.job_posted} search and tell us what works and what doesn't.

Would you be open to a 10-minute call this week, or should I just send you the link to try it?

Best,
German

P.S. Here's a 2-min demo if you want to see it first: [DEMO_LINK]
`;
}

function generateEmailsForCompany(company: Company): string[] {
  // Only email the CEO/first founder to avoid spamming
  const primaryFounder = company.founders.find(
    (f) =>
      f.title.includes("CEO") ||
      f.title.includes("Co-founder") ||
      f.title.includes("Founder")
  ) || company.founders[0];

  return [generateEmail(company, primaryFounder)];
}

// Create output directory
const outputDir = path.join(__dirname, "output", "emails");
fs.mkdirSync(outputDir, { recursive: true });

// Generate tracking sheet
const trackingRows: string[] = [
  "Company,Batch,Job Posted,Founder,Title,LinkedIn,Email,Status,Notes",
];

// Generate all emails
let totalEmails = 0;

for (const company of companies) {
  const primaryFounder = company.founders.find(
    (f) =>
      f.title.includes("CEO") ||
      f.title.includes("Co-founder") ||
      f.title.includes("Founder")
  ) || company.founders[0];

  const emails = generateEmailsForCompany(company);

  for (const email of emails) {
    const filename = `${company.company.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${primaryFounder.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
    fs.writeFileSync(path.join(outputDir, filename), email);
    totalEmails++;
  }

  // Add to tracking sheet
  trackingRows.push(
    [
      company.company,
      company.batch,
      company.job_posted,
      primaryFounder.name,
      primaryFounder.title,
      primaryFounder.linkedin,
      primaryFounder.email || "FIND_VIA_APOLLO",
      "pending",
      "",
    ].join(",")
  );
}

// Write tracking CSV
fs.writeFileSync(
  path.join(__dirname, "output", "tracking.csv"),
  trackingRows.join("\n")
);

// Print summary
console.log(`\n✅ Generated ${totalEmails} emails for ${companies.length} companies`);
console.log(`📁 Emails saved to: scripts/yc-outreach/output/emails/`);
console.log(`📊 Tracking sheet: scripts/yc-outreach/output/tracking.csv`);
console.log(`\n--- APOLLO WORKFLOW ---`);
console.log(`\nFor each founder below, open their LinkedIn and use Apollo extension to find email:\n`);

for (const company of companies) {
  const primaryFounder = company.founders.find(
    (f) =>
      f.title.includes("CEO") ||
      f.title.includes("Co-founder") ||
      f.title.includes("Founder")
  ) || company.founders[0];

  console.log(
    `  ${primaryFounder.name.padEnd(25)} | ${company.company.padEnd(20)} | ${primaryFounder.linkedin}`
  );
}

console.log(`\n--- NEXT STEPS ---`);
console.log(`1. Open each LinkedIn URL above in Chrome (Apollo extension active)`);
console.log(`2. Click Apollo icon → get email/phone`);
console.log(`3. Update tracking.csv with found emails`);
console.log(`4. Open each email file in output/emails/, paste into Gmail`);
console.log(`5. Replace [DEMO_LINK] with your actual demo URL`);
console.log(`6. Review and hit Send!\n`);
