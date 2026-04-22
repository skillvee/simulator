"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pricing");
  const [isAnnual, setIsAnnual] = useState(true);

  const starterPrice = isAnnual ? PRICING.starter.annual : PRICING.starter.monthly;
  const proPrice = isAnnual ? PRICING.pro.annual : PRICING.pro.monthly;

  const tiers = [
    {
      name: t("tiers.free.name"),
      price: t("tiers.free.price"),
      description: t("tiers.free.description"),
      highlight: false,
      features: [
        { text: t("tiers.free.features.1") },
        { text: t("tiers.free.features.2") },
        { text: t("tiers.free.features.3") },
        { text: t("tiers.free.features.4") },
        { text: t("tiers.free.features.5") },
      ],
      cta: t("tiers.free.cta"),
      ctaVariant: "outline" as const,
    },
    {
      name: t("tiers.starter.name"),
      price: `$${starterPrice}`,
      description: t("tiers.starter.description"),
      highlight: false,
      features: [
        { text: t("tiers.starter.features.1", {
          count: isAnnual ? "180" : "15",
          period: isAnnual ? t("perYear").replace("/", "") : t("perMonth").replace("/", "")
        }) },
        { text: t("tiers.starter.features.2") },
        { text: t("tiers.starter.features.3") },
        { text: t("tiers.starter.features.4") },
        { text: t("tiers.starter.features.5") },
      ],
      cta: t("tiers.starter.cta"),
      ctaVariant: "outline" as const,
    },
    {
      name: t("tiers.pro.name"),
      price: `$${proPrice}`,
      description: t("tiers.pro.description"),
      highlight: true,
      badge: t("tiers.pro.badge"),
      features: [
        { text: t("tiers.pro.features.1", {
          count: isAnnual ? "600" : "50",
          period: isAnnual ? t("perYear").replace("/", "") : t("perMonth").replace("/", "")
        }) },
        { text: t("tiers.pro.features.2") },
        { text: t("tiers.pro.features.3") },
        { text: t("tiers.pro.features.4") },
        { text: t("tiers.pro.features.5") },
      ],
      cta: t("tiers.pro.cta"),
      ctaVariant: "primary" as const,
    },
    {
      name: t("tiers.enterprise.name"),
      price: t("tiers.enterprise.price"),
      description: t("tiers.enterprise.description"),
      highlight: false,
      features: [
        { text: t("tiers.enterprise.features.1") },
        { text: t("tiers.enterprise.features.2") },
        { text: t("tiers.enterprise.features.3") },
        { text: t("tiers.enterprise.features.4") },
        { text: t("tiers.enterprise.features.5") },
      ],
      cta: t("tiers.enterprise.cta"),
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
            {t("billing.monthly")}
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${
              isAnnual
                ? "bg-white text-slate-900 shadow-md"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("billing.annual")}
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {t("billing.save")}
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
                {tier.price !== t("tiers.enterprise.price") && (
                  <span className="text-slate-500 text-sm ml-1">{t("perMonth")}</span>
                )}
              </div>
              <p className="text-slate-600 text-sm">{tier.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              {tier.features.map((feature, i) => (
                <div key={i} className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-slate-700 text-sm">
                    {feature.text}
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
