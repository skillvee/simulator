"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const PRICING = {
  starter: {
    monthly: 95,
    annual: 79,
  },
  pro: {
    monthly: 239,
    annual: 199,
  },
};

export default function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(true);

  const starterPrice = isAnnual ? PRICING.starter.annual : PRICING.starter.monthly;
  const proPrice = isAnnual ? PRICING.pro.annual : PRICING.pro.monthly;

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Try before you commit",
      highlight: false,
      features: [
        { text: isAnnual ? "36 assessments" : "3 assessments", bold: true, suffix: ` per ${isAnnual ? "year" : "month"}` },
        { text: "Role-specific work simulations" },
        { text: "AI-powered evaluation" },
        { text: "Shareable assessment links" },
        { text: "Community support" },
      ],
      cta: "Get Started Free",
      ctaVariant: "outline" as const,
    },
    {
      name: "Starter",
      price: `$${starterPrice}`,
      description: "For small hiring teams",
      highlight: false,
      features: [
        { text: isAnnual ? "180 assessments" : "15 assessments", bold: true, suffix: ` per ${isAnnual ? "year" : "month"}` },
        { text: "Everything in Free" },
        { text: "Candidate comparison dashboard" },
        { text: "Assessment analytics" },
        { text: "Email support" },
      ],
      cta: "Start Trial",
      ctaVariant: "outline" as const,
    },
    {
      name: "Pro",
      price: `$${proPrice}`,
      description: "For growing teams",
      highlight: true,
      badge: "Best Value",
      features: [
        { text: isAnnual ? "600 assessments" : "50 assessments", bold: true, suffix: ` per ${isAnnual ? "year" : "month"}` },
        { text: "Everything in Starter" },
        { text: "Custom simulation scenarios" },
        { text: "Team collaboration tools" },
        { text: "Priority support" },
      ],
      cta: "Start Trial",
      ctaVariant: "primary" as const,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For teams hiring at scale",
      highlight: false,
      features: [
        { text: "Unlimited", bold: true, suffix: " assessments" },
        { text: "Everything in Pro" },
        { text: "ATS integration" },
        { text: "Dedicated success manager" },
        { text: "SSO & advanced security" },
      ],
      cta: "Talk to Sales",
      ctaVariant: "outline" as const,
    },
  ];

  return (
    <>
      {/* Billing Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center mb-12"
      >
        <div className="inline-flex items-center bg-slate-100 rounded-full p-1.5">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
              !isAnnual
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              isAnnual
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Annual
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
              Save 17%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className={`relative bg-white rounded-2xl p-6 transition-all duration-300 hover:shadow-xl ${
              tier.highlight
                ? "border-2 border-primary shadow-lg shadow-primary/10"
                : "border border-slate-200 hover:border-primary/30"
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {tier.badge}
                </span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 mb-3">{tier.name}</h3>
              <div className="mb-3">
                <span className="text-4xl font-black text-slate-900">{tier.price}</span>
                {tier.price !== "Custom" && (
                  <span className="text-slate-500 text-sm ml-1">/month</span>
                )}
              </div>
              <p className="text-slate-600 text-sm">{tier.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              {tier.features.map((feature, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700 text-sm">
                    {feature.bold ? <strong>{feature.text}</strong> : feature.text}
                    {feature.suffix}
                  </span>
                </div>
              ))}
            </div>

            <Link href="/demo">
              <Button
                size="lg"
                variant={tier.ctaVariant === "primary" ? "default" : "outline"}
                className={`w-full rounded-full font-semibold ${
                  tier.ctaVariant === "primary"
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "hover:border-primary/50"
                }`}
              >
                {tier.cta}
              </Button>
            </Link>
          </motion.div>
        ))}
      </div>
    </>
  );
}
