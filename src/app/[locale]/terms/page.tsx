"use client";

import { useTranslations } from "next-intl";
import Navigation from "@/components/landing/navigation";
import Footer from "@/components/landing/footer";

export default function TermsOfServicePage() {
  const t = useTranslations("terms");
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

          {/* Acceptance of Terms */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.acceptance.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.acceptance.content")}
            </p>
          </section>

          {/* Use of Service */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.useOfService.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.useOfService.content")}
            </p>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.useOfService.items.1")}</li>
              <li>{t("sections.useOfService.items.2")}</li>
              <li>{t("sections.useOfService.items.3")}</li>
              <li>{t("sections.useOfService.items.4")}</li>
              <li>{t("sections.useOfService.items.5")}</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.accounts.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.accounts.content")}
            </p>
            <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
              <li>{t("sections.accounts.items.1")}</li>
              <li>{t("sections.accounts.items.2")}</li>
              <li>{t("sections.accounts.items.3")}</li>
              <li>{t("sections.accounts.items.4")}</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.intellectualProperty.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.intellectualProperty.content")}
            </p>
          </section>

          {/* User Content */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.userContent.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.userContent.content")}
            </p>
          </section>

          {/* Privacy */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.privacy.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.privacy.content")}
            </p>
          </section>

          {/* Termination */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.termination.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.termination.content")}
            </p>
          </section>

          {/* Disclaimers */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.disclaimers.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.disclaimers.content")}
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.limitation.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.limitation.content")}
            </p>
          </section>

          {/* Governing Law */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.governing.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.governing.content")}
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-stone-900">
              {t("sections.changes.title")}
            </h2>
            <p className="mb-4 text-stone-700">
              {t("sections.changes.content")}
            </p>
          </section>

          {/* Contact Information */}
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