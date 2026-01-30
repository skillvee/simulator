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
    <div className="bg-white border-2 border-gray-100 hover:border-blue-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-blue-50/50 transition-colors"
      >
        <div className="flex items-start space-x-4 flex-1">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary font-bold text-sm">Q</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-lg pr-4">{item.question}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 animate-fade-in">
          <div className="pl-12 text-gray-600 leading-relaxed">{item.answer}</div>
        </div>
      )}
    </div>
  );
}

export default function HomeFAQ() {
  const faqItems: FAQItem[] = [
    {
      question: "How long does the assessment take candidates?",
      answer: "30-45 minutes. Candidates complete the simulation in one sitting—no scheduling required. They get a link, complete the work, and you get results."
    },
    {
      question: "Can candidates cheat with AI?",
      answer: (
        <>
          We encourage AI use—that&apos;s how people actually work. What matters is <em>how</em> they use it. Live voice conversations with stakeholders can&apos;t be faked, and screen recordings show their actual process. You see the real person, not just the output.
        </>
      )
    },
    {
      question: "Can we customize the simulation for our role?",
      answer: "Yes. Paste your job description and we generate a simulation tailored to your specific role, tech stack, and company context. No generic tests—candidates work on scenarios that match what they'd actually do on day one."
    },
    {
      question: "What ATS integrations do you support?",
      answer: (
        <>
          We integrate with major ATS platforms including Greenhouse, Lever, Ashby, and Workday. Results sync automatically to candidate profiles. Don&apos;t see yours? <Link href="/demo" className="text-blue-600 hover:underline">Contact us</Link>—we&apos;re adding new integrations regularly.
        </>
      )
    },
    {
      question: "Is this fair for all candidates?",
      answer: (
        <>
          More fair than traditional interviews. Every candidate gets the identical scenario—no interviewer mood swings, no &ldquo;culture fit&rdquo; bias, no advantage for people who interview well but work poorly. We measure what people actually do, not what their resume claims.
        </>
      )
    }
  ];

  return (
    <section className="relative py-20 sm:py-24 bg-slate-50">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-6">
        <SectionReveal className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
        </SectionReveal>

        <StaggerReveal className="space-y-4" staggerMs={100}>
          {faqItems.map((item, index) => (
            <FAQAccordion key={index} item={item} />
          ))}
        </StaggerReveal>

        <SectionReveal className="text-center mt-8">
          <Link
            href="/faq"
            className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors"
          >
            View all questions →
          </Link>
        </SectionReveal>
      </div>
    </section>
  );
}
