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

  const starterPrice = isAnnual
    ? PRICING.starter.annual
    : PRICING.starter.monthly;
  const proPrice = isAnnual ? PRICING.pro.annual : PRICING.pro.monthly;

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Try before you commit",
      highlight: false,
      features: [
        { text: "3 assessments", bold: true, suffix: " per month" },
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
        {
          text: isAnnual ? "180 assessments" : "15 assessments",
          bold: true,
          suffix: ` per ${isAnnual ? "year" : "month"}`,
        },
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
        {
          text: isAnnual ? "600 assessments" : "50 assessments",
          bold: true,
          suffix: ` per ${isAnnual ? "year" : "month"}`,
        },
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
        className="mb-12 flex justify-center"
      >
        <div className="inline-flex items-center rounded-full bg-slate-100 p-1.5">
          <button
            onClick={() => setIsAnnual(false)}
            className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
              !isAnnual
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
              isAnnual
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Annual
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
              Save 17%
            </span>
          </button>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {tiers.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            className={`relative rounded-2xl bg-white p-6 transition-all duration-300 hover:shadow-xl ${
              tier.highlight
                ? "border-2 border-primary shadow-lg shadow-primary/10"
                : "border border-slate-200 hover:border-primary/30"
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
                  {tier.badge}
                </span>
              </div>
            )}

            <div className="mb-6 text-center">
              <h3 className="mb-3 text-2xl font-black text-slate-900">
                {tier.name}
              </h3>
              <div className="mb-3">
                <span className="text-4xl font-black text-slate-900">
                  {tier.price}
                </span>
                {tier.price !== "Custom" && (
                  <span className="ml-1 text-sm text-slate-500">/month</span>
                )}
              </div>
              <p className="text-sm text-slate-600">{tier.description}</p>
            </div>

            <div className="mb-6 space-y-3">
              {tier.features.map((feature, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span className="text-sm text-slate-700">
                    {feature.bold ? (
                      <strong>{feature.text}</strong>
                    ) : (
                      feature.text
                    )}
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
                    ? "bg-primary text-white hover:bg-primary/90"
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
