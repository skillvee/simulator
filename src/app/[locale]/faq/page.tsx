import { type Metadata } from "next";
import FAQPageContent from "./FAQPageContent";

export const metadata: Metadata = {
  title: "FAQ - Work Simulation Assessments for Technical Hiring",
  description:
    "Get answers about Skillvee's work simulation platform. Learn how to assess candidates with realistic job tasks, pricing, integration, and more.",
  keywords: [
    "work simulation FAQ",
    "technical assessment questions",
    "hiring assessment help",
    "pre-hire evaluation FAQ",
    "candidate assessment platform",
  ],
};

export default function FAQPage() {
  return <FAQPageContent />;
}
