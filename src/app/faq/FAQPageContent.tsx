"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, MessageSquare, BookOpen, Users, Shield } from "lucide-react";
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

export default function FAQPageContent() {
  const faqSections: FAQSection[] = [
    {
      title: "Getting Started",
      icon: <BookOpen className="w-6 h-6 text-blue-600" />,
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
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
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
      icon: <Users className="w-6 h-6 text-blue-600" />,
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
      icon: <Shield className="w-6 h-6 text-blue-600" />,
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
      <Navigation currentPage="faq" />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6 py-16 sm:py-20 relative z-10">
          <div className="text-center">
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 w-fit mx-auto mb-6 hover:scale-105 transition-transform duration-300">
              📚 Frequently Asked Questions
            </Badge>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              <span className="text-gray-900">Questions about </span>
              <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">work simulations?</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto">
              Everything you need to know about using Skillvee to hire better
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-6">
          <div className="space-y-16">
            {faqSections.map((section, sectionIndex) => (
              <div
                key={sectionIndex}
                id={
                  section.title === "Getting Started" ? "getting-started" :
                  section.title === "Pricing & Plans" ? "pricing" :
                  section.title === "Integration & Technical" ? "integration" :
                  section.title.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')
                }
              >
                <div className="flex items-center mb-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border border-white rounded-full"></div>
          <div className="absolute top-32 right-20 w-16 h-16 bg-white rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-24 h-24 border border-white rounded-full"></div>
        </div>

        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-6 text-center relative z-10">
          <Badge className="bg-yellow-400 text-yellow-900 mb-6 sm:mb-8 text-sm font-semibold">
            💡 Still have questions?
          </Badge>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Let&apos;s <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">talk</span>
          </h2>

          <p className="text-lg sm:text-xl lg:text-2xl text-blue-100 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed">
            Can&apos;t find what you&apos;re looking for? We&apos;ll answer your questions and show you how it works.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              size="lg"
              variant="outline"
              asChild
              className="bg-white/10 border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300 hover:scale-105"
            >
              <Link href="mailto:hi@skillvee.com">
                Email Us
              </Link>
            </Button>
            <Button
              size="lg"
              asChild
              className="bg-white text-blue-600 hover:bg-gray-50 shadow-xl font-semibold transform hover:scale-105 transition-all duration-300"
            >
              <Link href="/demo">
                Request Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
