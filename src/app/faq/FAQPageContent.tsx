"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageSquare, BookOpen, Users, Shield, ArrowRight } from "lucide-react";
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
      className="bg-slate-50 border border-slate-200 hover:border-primary/30 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-100/50 transition-colors"
      >
        <div className="flex items-start space-x-4 flex-1">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary font-bold text-sm">Q</span>
          </div>
          <h3 className="font-semibold text-slate-900 text-lg pr-4">{item.question}</h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 pb-5 animate-in fade-in duration-200">
          <div className="pl-12 text-slate-600 leading-relaxed">{item.answer}</div>
        </div>
      )}
    </motion.div>
  );
}

export default function FAQPageContent() {
  const faqSections: FAQSection[] = [
    {
      title: "Getting Started",
      icon: <BookOpen className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "How does Skillvee work?",
          answer: "Paste your job description. We generate a realistic work simulation. Send the link to candidates. They complete a 30-45 minute simulation on their own time. You review how they actually performed—their communication, execution, and problem-solving approach."
        },
        {
          question: "How long does it take to get started?",
          answer: "About 5 minutes. Paste your JD, review the generated simulation, and you're ready to send links to candidates. No lengthy onboarding or training required."
        },
        {
          question: "What roles does Skillvee support?",
          answer: "Any role where you want to see how candidates actually work. We support technical roles (Software Engineers, Data Scientists), business roles (Product Managers, Program Managers), and customer-facing roles (Sales, Contact Center, Customer Success). Each simulation is tailored to your specific job description—not pulled from a generic test library."
        },
        {
          question: "Can I customize the simulation scenarios?",
          answer: "Yes. We generate simulations based on your job description. Enterprise customers can work with us to create fully custom scenarios that match your team's specific challenges and tech stack."
        }
      ]
    },
    {
      title: "How Assessments Work",
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "What do candidates actually do in a simulation?",
          answer: "They experience a realistic first day: meet their \"manager,\" gather requirements from AI-powered stakeholders, complete a work task, and defend their approach. It's 30-45 minutes of real work—not algorithm puzzles that nobody uses after the interview."
        },
        {
          question: "Can candidates use AI tools like ChatGPT?",
          answer: "Yes—we encourage it. In real work, people use AI tools. We want to see how candidates use them: thoughtfully or blindly? Do they verify the output? Can they explain what the AI generated? This is the skill that actually matters now."
        },
        {
          question: "How do you prevent cheating?",
          answer: "We flip the model. Traditional tests try to ban AI and hope no one cheats. With live stakeholder conversations and 30-45 minutes of continuous work, there's nothing to cheat on. You can't fake real work with real-time interactions."
        },
        {
          question: "What's the candidate experience like?",
          answer: "Candidates consistently prefer work simulations to algorithm tests. They get to show actual skills instead of memorized trivia. And they walk away understanding what the job would actually be like—a better experience for everyone."
        },
        {
          question: "How long do assessments take?",
          answer: "30-45 minutes. Long enough to see real work, short enough to respect everyone's time. Candidates complete it asynchronously—no scheduling coordination needed."
        }
      ]
    },
    {
      title: "Results & Evaluation",
      icon: <Users className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "What do I see in the results?",
          answer: "You see how candidates actually worked: how they gathered requirements, used AI tools, executed the task, communicated their approach, and handled pushback. Not just a score—actual evidence of how they'll perform on day one."
        },
        {
          question: "How does AI-powered evaluation work?",
          answer: "Our AI analyzes the full simulation—conversations, work output, and decision defense. It scores on communication, technical execution, problem-solving approach, and fit. Every candidate gets the same criteria, removing human reviewer inconsistency."
        },
        {
          question: "Can I compare candidates easily?",
          answer: "Yes. Same scenario for every candidate means you can directly compare how different people approached the same problem. Apples to apples—not apples to algorithm test scores."
        },
        {
          question: "How do you reduce bias in hiring?",
          answer: "Same scenario for every candidate. AI-powered scoring removes human reviewer inconsistency. We measure what people actually do, not what their resume says or where they went to school. Work speaks for itself."
        }
      ]
    },
    {
      title: "Integration & Technical",
      icon: <Shield className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: "Does Skillvee integrate with our ATS?",
          answer: "Enterprise customers get ATS integration with major platforms including Greenhouse, Lever, and Ashby. Contact us for specific integration requirements."
        },
        {
          question: "Is candidate data secure?",
          answer: "Yes. We're SOC 2 compliant. Assessment data is encrypted at rest and in transit. We don't sell candidate data to third parties. You control who sees results."
        },
        {
          question: "Can we use our own branding?",
          answer: "Enterprise customers can white-label the candidate experience with their company logo and branding."
        },
        {
          question: "What browsers and devices work?",
          answer: "Skillvee works on all modern browsers (Chrome, Safari, Firefox, Edge) on desktop. We recommend desktop for the best candidate experience during simulations."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Dark Hero Section */}
      <div className="bg-[#020617] relative overflow-hidden">
        <Navigation variant="dark" currentPage="faq" />

        {/* Subtle animated background */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/30 rounded-full blur-[200px] pointer-events-none"
        />

        {/* Hero Section */}
        <section className="relative pt-32 pb-20">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
                Got Questions?
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
                Frequently Asked Questions
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Everything you need to know about using Skillvee to hire better
              </p>
            </motion.div>
          </div>
        </section>
      </div>

      {/* FAQ Content */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="space-y-16">
            {faqSections.map((section, sectionIndex) => (
              <motion.div
                key={sectionIndex}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: sectionIndex * 0.1 }}
                id={
                  section.title === "Getting Started" ? "getting-started" :
                  section.title === "Pricing & Plans" ? "pricing" :
                  section.title === "Integration & Technical" ? "integration" :
                  section.title.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')
                }
              >
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mr-4">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
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
      <section className="py-32 bg-[#020617] relative overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[200px] pointer-events-none"
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
              Still Have Questions?
            </p>
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
              LET&apos;S TALK.
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              Can&apos;t find what you&apos;re looking for? We&apos;ll answer your questions and show you how it works.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                  Request Demo
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="mailto:hi@skillvee.com">
                <Button variant="ghost" className="h-14 px-6 rounded-full text-white hover:bg-white/10 font-semibold">
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
