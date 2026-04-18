"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/landing/navigation";
import Footer from "@/components/landing/footer";

export default function PrivacyPolicyPage() {
  const t = useTranslations("privacy");
  const lastUpdated = "February 1, 2024";

  return (
    <div className="min-h-screen bg-white">
      <Navigation variant="light" />

      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="mb-8 text-4xl font-bold text-stone-900">
            {t("title")}
          </h1>
          <p className="mb-8 text-sm text-stone-500">
            {t("lastUpdated", { date: lastUpdated })}
          </p>

          {/* Introduction */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.intro.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.intro.content")}
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.informationWeCollect.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.informationWeCollect.content")}
            </p>

            {/* Personal Information */}
            <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
              {t("sections.informationWeCollect.personalInfo.title")}
            </h3>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.informationWeCollect.personalInfo.items.1")}</li>
              <li>{t("sections.informationWeCollect.personalInfo.items.2")}</li>
              <li>{t("sections.informationWeCollect.personalInfo.items.3")}</li>
              <li>{t("sections.informationWeCollect.personalInfo.items.4")}</li>
            </ul>

            {/* Usage Information */}
            <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
              {t("sections.informationWeCollect.usageInfo.title")}
            </h3>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.informationWeCollect.usageInfo.items.1")}</li>
              <li>{t("sections.informationWeCollect.usageInfo.items.2")}</li>
              <li>{t("sections.informationWeCollect.usageInfo.items.3")}</li>
              <li>{t("sections.informationWeCollect.usageInfo.items.4")}</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.howWeUse.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.howWeUse.content")}
            </p>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.howWeUse.items.1")}</li>
              <li>{t("sections.howWeUse.items.2")}</li>
              <li>{t("sections.howWeUse.items.3")}</li>
              <li>{t("sections.howWeUse.items.4")}</li>
              <li>{t("sections.howWeUse.items.5")}</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.dataSharing.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.dataSharing.content")}
            </p>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.dataSharing.items.1")}</li>
              <li>{t("sections.dataSharing.items.2")}</li>
              <li>{t("sections.dataSharing.items.3")}</li>
              <li>{t("sections.dataSharing.items.4")}</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.dataSecurity.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.dataSecurity.content")}
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.yourRights.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.yourRights.content")}
            </p>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.yourRights.items.1")}</li>
              <li>{t("sections.yourRights.items.2")}</li>
              <li>{t("sections.yourRights.items.3")}</li>
              <li>{t("sections.yourRights.items.4")}</li>
              <li>{t("sections.yourRights.items.5")}</li>
            </ul>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.contact.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.contact.content")}
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}