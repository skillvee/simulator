"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default function CandidateTermsPage() {
  const t = useTranslations("candidateTerms");

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-stone-200 px-6 py-4 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
            {t("nav.backToTerms")}
          </Link>
          <Link href="/">
            <Button variant="outline">{t("nav.home")}</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-stone-900 mb-8">
            {t("title")}
          </h1>

          <p className="text-stone-600 mb-8">
            {t("intro")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.platformUsage.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.platformUsage.intro")}
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.platformUsage.bullets.0")}</li>
            <li>{t("sections.platformUsage.bullets.1")}</li>
            <li>{t("sections.platformUsage.bullets.2")}</li>
            <li>{t("sections.platformUsage.bullets.3")}</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.assessmentConduct.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.assessmentConduct.intro")}
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.assessmentConduct.bullets.0")}</li>
            <li>{t("sections.assessmentConduct.bullets.1")}</li>
            <li>{t("sections.assessmentConduct.bullets.2")}</li>
            <li>{t("sections.assessmentConduct.bullets.3")}</li>
            <li>{t("sections.assessmentConduct.bullets.4")}</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.platformExclusive.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.platformExclusive.body1")}
          </p>
          <p className="text-stone-700 mb-6">
            {t("sections.platformExclusive.body2")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.nonCircumvention.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.nonCircumvention.body1")}
          </p>
          <p className="text-stone-700 mb-4">
            {t.rich("sections.nonCircumvention.body2", {
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.nonCircumvention.bullets.0")}</li>
            <li>{t("sections.nonCircumvention.bullets.1")}</li>
            <li>{t("sections.nonCircumvention.bullets.2")}</li>
          </ul>
          <p className="text-stone-700 mb-6">
            {t("sections.nonCircumvention.body3")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.dataPrivacy.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.dataPrivacy.intro")}
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.dataPrivacy.bullets.0")}</li>
            <li>{t("sections.dataPrivacy.bullets.1")}</li>
            <li>{t("sections.dataPrivacy.bullets.2")}</li>
            <li>{t("sections.dataPrivacy.bullets.3")}</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.dataRights.title")}</h2>
          <p className="text-stone-700 mb-4">{t("sections.dataRights.intro")}</p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.dataRights.bullets.0")}</li>
            <li>{t("sections.dataRights.bullets.1")}</li>
            <li>{t("sections.dataRights.bullets.2")}</li>
            <li>{t("sections.dataRights.bullets.3")}</li>
            <li>{t("sections.dataRights.bullets.4")}</li>
          </ul>
          <p className="text-stone-700 mb-6">
            {t("sections.dataRights.note")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.intellectualProperty.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.intellectualProperty.intro")}
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.intellectualProperty.bullets.0")}</li>
            <li>{t("sections.intellectualProperty.bullets.1")}</li>
            <li>{t("sections.intellectualProperty.bullets.2")}</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.freeServices.title")}</h2>
          <p className="text-stone-700 mb-6">
            {t("sections.freeServices.body")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.prohibitedConduct.title")}</h2>
          <p className="text-stone-700 mb-4">{t("sections.prohibitedConduct.intro")}</p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.prohibitedConduct.bullets.0")}</li>
            <li>{t("sections.prohibitedConduct.bullets.1")}</li>
            <li>{t("sections.prohibitedConduct.bullets.2")}</li>
            <li>{t("sections.prohibitedConduct.bullets.3")}</li>
            <li>{t("sections.prohibitedConduct.bullets.4")}</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.termination.title")}</h2>
          <p className="text-stone-700 mb-4">
            {t("sections.termination.intro")}
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>{t("sections.termination.bullets.0")}</li>
            <li>{t("sections.termination.bullets.1")}</li>
            <li>{t("sections.termination.bullets.2")}</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.liability.title")}</h2>
          <p className="text-stone-700 mb-6">
            {t("sections.liability.body")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.modification.title")}</h2>
          <p className="text-stone-700 mb-6">
            {t("sections.modification.body")}
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">{t("sections.governingLaw.title")}</h2>
          <p className="text-stone-700 mb-6">
            {t("sections.governingLaw.body")}
          </p>

          <hr className="my-8 border-stone-300" />

          <p className="text-sm text-stone-500 italic">
            <strong>{t("footer.lastUpdatedLabel")}</strong> {t("footer.lastUpdatedDate")}<br/>
            {t("footer.acknowledgement")}
          </p>
        </div>
      </div>
    </div>
  );
}
