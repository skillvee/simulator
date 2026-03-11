"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SectionReveal, StaggerReveal } from "./SectionReveal";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

function FAQAccordion({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-stone-100 bg-white transition-all duration-300 hover:border-blue-200 hover:shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-blue-50/50"
      >
        <div className="flex flex-1 items-start space-x-4">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
            <span className="text-sm font-bold text-primary">Q</span>
          </div>
          <h3 className="pr-4 text-lg font-semibold text-stone-900">
            {item.question}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-stone-400 transition-transform duration-300" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-stone-400 transition-transform duration-300" />
        )}
      </button>
      {isOpen && (
        <div className="animate-fade-in px-6 pb-5">
          <div className="pl-12 leading-relaxed text-stone-600">
            {item.answer}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeFAQ() {
  const faqItems: FAQItem[] = [
    {
      question: "How long does the assessment take candidates?",
      answer:
        "30-45 minutes. Candidates complete the simulation in one sitting—no scheduling required. They get a link, complete the work, and you get results.",
    },
    {
      question: "Can candidates cheat with AI?",
      answer: (
        <>
          We encourage AI use—that&apos;s how people actually work. What matters
          is <em>how</em> they use it. Live voice conversations with
          stakeholders can&apos;t be faked, and screen recordings show their
          actual process. You see the real person, not just the output.
        </>
      ),
    },
    {
      question: "Can we customize the simulation for our role?",
      answer:
        "Yes. Paste your job description and we generate a simulation tailored to your specific role, tech stack, and company context. No generic tests—candidates work on scenarios that match what they'd actually do on day one.",
    },
    {
      question: "What ATS integrations do you support?",
      answer: (
        <>
          We integrate with major ATS platforms including Greenhouse, Lever,
          Ashby, and Workday. Results sync automatically to candidate profiles.
          Don&apos;t see yours?{" "}
          <Link href="/demo" className="text-blue-600 hover:underline">
            Contact us
          </Link>
          —we&apos;re adding new integrations regularly.
        </>
      ),
    },
    {
      question: "Is this fair for all candidates?",
      answer: (
        <>
          More fair than traditional interviews. Every candidate gets the
          identical scenario—no interviewer mood swings, no &ldquo;culture
          fit&rdquo; bias, no advantage for people who interview well but work
          poorly. We measure what people actually do, not what their resume
          claims.
        </>
      ),
    },
  ];

  return (
    <section className="relative bg-stone-50 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-6">
        <SectionReveal className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-stone-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </SectionReveal>

        <StaggerReveal className="space-y-4" staggerMs={100}>
          {faqItems.map((item, index) => (
            <FAQAccordion key={index} item={item} />
          ))}
        </StaggerReveal>

        <SectionReveal className="mt-8 text-center">
          <Link
            href="/faq"
            className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            View all questions →
          </Link>
        </SectionReveal>
      </div>
    </section>
  );
}
