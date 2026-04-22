"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, MessageSquare, BookOpen, Users, Shield, ArrowRight } from "lucide-react";
import Navigation from "@/components/landing/navigation";
import Footer from "@/components/landing/footer";

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
          <div className="pl-12 text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.answer }} />
        </div>
      )}
    </motion.div>
  );
}

export default function FAQPageContent() {
  const t = useTranslations("faqPage");

  const faqSections: FAQSection[] = [
    {
      title: t("categories.gettingStarted.title"),
      icon: <BookOpen className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: t("categories.gettingStarted.questions.q1.question"),
          answer: t("categories.gettingStarted.questions.q1.answer")
        },
        {
          question: t("categories.gettingStarted.questions.q2.question"),
          answer: t("categories.gettingStarted.questions.q2.answer")
        },
        {
          question: t("categories.gettingStarted.questions.q3.question"),
          answer: t("categories.gettingStarted.questions.q3.answer")
        },
        {
          question: t("categories.gettingStarted.questions.q4.question"),
          answer: t("categories.gettingStarted.questions.q4.answer")
        }
      ]
    },
    {
      title: t("categories.howAssessmentsWork.title"),
      icon: <MessageSquare className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: t("categories.howAssessmentsWork.questions.q1.question"),
          answer: t("categories.howAssessmentsWork.questions.q1.answer")
        },
        {
          question: t("categories.howAssessmentsWork.questions.q2.question"),
          answer: t("categories.howAssessmentsWork.questions.q2.answer")
        },
        {
          question: t("categories.howAssessmentsWork.questions.q3.question"),
          answer: t("categories.howAssessmentsWork.questions.q3.answer")
        },
        {
          question: t("categories.howAssessmentsWork.questions.q4.question"),
          answer: t("categories.howAssessmentsWork.questions.q4.answer")
        },
        {
          question: t("categories.howAssessmentsWork.questions.q5.question"),
          answer: t("categories.howAssessmentsWork.questions.q5.answer")
        }
      ]
    },
    {
      title: t("categories.resultsEvaluation.title"),
      icon: <Users className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: t("categories.resultsEvaluation.questions.q1.question"),
          answer: t("categories.resultsEvaluation.questions.q1.answer")
        },
        {
          question: t("categories.resultsEvaluation.questions.q2.question"),
          answer: t("categories.resultsEvaluation.questions.q2.answer")
        },
        {
          question: t("categories.resultsEvaluation.questions.q3.question"),
          answer: t("categories.resultsEvaluation.questions.q3.answer")
        },
        {
          question: t("categories.resultsEvaluation.questions.q4.question"),
          answer: t("categories.resultsEvaluation.questions.q4.answer")
        }
      ]
    },
    {
      title: t("categories.integrationTechnical.title"),
      icon: <Shield className="w-6 h-6 text-primary" />,
      color: "blue",
      items: [
        {
          question: t("categories.integrationTechnical.questions.q1.question"),
          answer: t("categories.integrationTechnical.questions.q1.answer")
        },
        {
          question: t("categories.integrationTechnical.questions.q2.question"),
          answer: t("categories.integrationTechnical.questions.q2.answer")
        },
        {
          question: t("categories.integrationTechnical.questions.q3.question"),
          answer: t("categories.integrationTechnical.questions.q3.answer")
        },
        {
          question: t("categories.integrationTechnical.questions.q4.question"),
          answer: t("categories.integrationTechnical.questions.q4.answer")
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
                {t("hero.label")}
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4">
                {t("hero.title")}
              </h1>

              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                {t("hero.subtitle")}
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
              {t("cta.label")}
            </p>
            <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
              {t("cta.title")}
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/demo">
                <Button className="h-14 px-10 rounded-full bg-white text-slate-900 font-bold text-lg shadow-xl hover:bg-slate-100 group">
                  {t("cta.requestDemo")}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <a href="mailto:hi@skillvee.com">
                <Button variant="ghost" className="h-14 px-6 rounded-full text-white hover:bg-white/10 font-semibold">
                  {t("cta.emailUs")}
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
