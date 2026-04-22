"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert } from "lucide-react";

export function ForbiddenError() {
  const t = useTranslations("recruiter.assessments.compare.errors");
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="rounded-full bg-red-100 p-4 mb-4">
        <ShieldAlert className="h-12 w-12 text-red-600" />
      </div>
      <h1 className="text-2xl font-semibold text-stone-900 mb-2">{t("accessDenied")}</h1>
      <p className="text-stone-500 text-center mb-6 max-w-md">
        {t("accessDeniedDescription")}
      </p>
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/recruiter/assessments">{t("backToCandidates")}</Link>
      </Button>
    </div>
  );
}

export function ErrorState({ error }: { error: string }) {
  const t = useTranslations("recruiter.assessments.compare.errors");
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <AlertCircle className="h-12 w-12 text-stone-400 mb-4" />
      <h1 className="text-xl font-semibold text-stone-900 mb-2">{t("unableToLoad")}</h1>
      <p className="text-stone-500 mb-6 text-center max-w-md">{error}</p>
      <Button asChild variant="outline">
        <Link href="/recruiter/assessments">{t("backToCandidates")}</Link>
      </Button>
    </div>
  );
}
