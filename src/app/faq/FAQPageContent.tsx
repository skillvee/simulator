"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BookOpen,
  Users,
  Shield,
  ArrowRight,
} from "lucide-react";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: FAQItem[];
}

function FAQAccordion({ item }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-slate-100/50"
      >
        <div className="flex flex-1 items-start space-x-4">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <span className="text-sm font-bold text-primary">Q</span>
          </div>
          <h3 className="pr-4 text-lg font-semibold text-slate-900">
            {item.question}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300" />
        ) : (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-300" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 duration-200 animate-in fade-in">
          <div className="pl-12 leading-relaxed text-slate-600">
            {item.answer}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function FAQPageContent() {
  const faqSections: FAQSection[] = [
    {
      title: "Getting Started",
      icon: <BookOpen className="h-6 w-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "How does Skillvee work?",
          answer:
            "Paste your job description. We generate a realistic work simulation. Send the link to candidates. They complete a 30-45 minute simulation on their own time. You review how they actually performed—their communication, execution, and problem-solving approach.",
        },
        {
          question: "How long does it take to get started?",
          answer:
            "About 5 minutes. Paste your JD, review the generated simulation, and you're ready to send links to candidates. No lengthy onboarding or training required.",
        },
        {
          question: "What roles does Skillvee support?",
          answer:
            "Any role where you want to see how candidates actually work. We support technical roles (Software Engineers, Data Scientists), business roles (Product Managers, Program Managers), and customer-facing roles (Sales, Contact Center, Customer Success). Each simulation is tailored to your specific job description—not pulled from a generic test library.",
        },
        {
          question: "Can I customize the simulation scenarios?",
          answer:
            "Yes. We generate simulations based on your job description. Enterprise customers can work with us to create fully custom scenarios that match your team's specific challenges and tech stack.",
        },
      ],
    },
    {
      title: "How Assessments Work",
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "What do candidates actually do in a simulation?",
          answer:
            'They experience a realistic first day: meet their "manager," gather requirements from AI-powered stakeholders, complete a work task, and defend their approach. It\'s 30-45 minutes of real work—not algorithm puzzles that nobody uses after the interview.',
        },
        {
          question: "Can candidates use AI tools like ChatGPT?",
          answer:
            "Yes—we encourage it. In real work, people use AI tools. We want to see how candidates use them: thoughtfully or blindly? Do they verify the output? Can they explain what the AI generated? This is the skill that actually matters now.",
        },
        {
          question: "How do you prevent cheating?",
          answer:
            "We flip the model. Traditional tests try to ban AI and hope no one cheats. With live stakeholder conversations and 30-45 minutes of continuous work, there's nothing to cheat on. You can't fake real work with real-time interactions.",
        },
        {
          question: "What's the candidate experience like?",
          answer:
            "Candidates consistently prefer work simulations to algorithm tests. They get to show actual skills instead of memorized trivia. And they walk away understanding what the job would actually be like—a better experience for everyone.",
        },
        {
          question: "How long do assessments take?",
          answer:
            "30-45 minutes. Long enough to see real work, short enough to respect everyone's time. Candidates complete it asynchronously—no scheduling coordination needed.",
        },
      ],
    },
    {
      title: "Results & Evaluation",
      icon: <Users className="h-6 w-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "What do I see in the results?",
          answer:
            "You see how candidates actually worked: how they gathered requirements, used AI tools, executed the task, communicated their approach, and handled pushback. Not just a score—actual evidence of how they'll perform on day one.",
        },
        {
          question: "How does AI-powered evaluation work?",
          answer:
            "Our AI analyzes the full simulation—conversations, work output, and decision defense. It scores on communication, technical execution, problem-solving approach, and fit. Every candidate gets the same criteria, removing human reviewer inconsistency.",
        },
        {
          question: "Can I compare candidates easily?",
          answer:
            "Yes. Same scenario for every candidate means you can directly compare how different people approached the same problem. Apples to apples—not apples to algorithm test scores.",
        },
        {
          question: "How do you reduce bias in hiring?",
          answer:
            "Same scenario for every candidate. AI-powered scoring removes human reviewer inconsistency. We measure what people actually do, not what their resume says or where they went to school. Work speaks for itself.",
        },
      ],
    },
    {
      title: "Integration & Technical",
      icon: <Shield className="h-6 w-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "Does Skillvee integrate with our ATS?",
          answer:
            "Enterprise customers get ATS integration with major platforms including Greenhouse, Lever, and Ashby. Contact us for specific integration requirements.",
        },
        {
          question: "Is candidate data secure?",
          answer:
            "Yes. We're SOC 2 compliant. Assessment data is encrypted at rest and in transit. We don't sell candidate data to third parties. You control who sees results.",
        },
        {
          question: "Can we use our own branding?",
          answer:
            "Enterprise customers can white-label the candidate experience with their company logo and branding.",
        },
        {
          question: "What browsers and devices work?",
          answer:
            "Skillvee works on all modern browsers (Chrome, Safari, Firefox, Edge) on desktop. We recommend desktop for the best candidate experience during simulations.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Dark Hero Section */}
      <div className="relative overflow-hidden bg-[#020617]">
        <Navigation variant="dark" currentPage="faq" />

        {/* Subtle animated background */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/30 blur-[200px]"
        />

        {/* Hero Section */}
        <section className="relative pb-20 pt-32">
          <div className="relative z-10 mx-auto max-w-7xl px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                Got Questions?
              </p>

              <h1 className="mb-4 text-3xl font-black text-white sm:text-4xl lg:text-5xl">
                Frequently Asked Questions
              </h1>

              <p className="mx-auto max-w-2xl text-xl text-slate-400">
                Everything you need to know about using Skillvee to hire better
              </p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* FAQ Content */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-16">
            {faqSections.map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: sectionIndex * 0.1 }}
                id={
                  section.title === "Getting Started"
                    ? "getting-started"
                    : section.title === "Pricing & Plans"
                      ? "pricing"
                      : section.title === "Integration & Technical"
                        ? "integration"
                        : section.title
                            .toLowerCase()
                            .replace(/ & /g, "-")
                            .replace(/ /g, "-")
                }
              >
                <div className="mb-8 flex items-center">
                  <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                    {section.title}
                  </h2>
                </div>

                <div className="space-y-4">
                  {section.items.map((item, itemIndex) => (
                    <FAQAccordion
                      key={itemIndex}
                      item={item}
                      index={itemIndex}
                    />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Dark theme matching homepage */}
      <section className="relative overflow-hidden bg-[#020617] py-32">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[200px]"
        />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Still Have Questions?
            </p>
            <h2 className="mb-6 text-4xl font-black text-white lg:text-6xl">
              LET&apos;S TALK.
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-slate-400">
              Can&apos;t find what you&apos;re looking for? We&apos;ll answer
              your questions and show you how it works.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/demo">
                <Button className="group h-14 rounded-full bg-white px-10 text-lg font-bold text-slate-900 shadow-xl hover:bg-slate-100">
                  Request Demo
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="mailto:hi@skillvee.com">
                <Button
                  variant="ghost"
                  className="h-14 rounded-full px-6 font-semibold text-white hover:bg-white/10"
                >
                  Email Us
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
