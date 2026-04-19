"use client";

import { Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";

export function HowToThinkSection() {
  const t = useTranslations("results.howToThink");
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-transparent to-transparent px-6 py-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Lightbulb className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{t("title")}</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-foreground/75">
            {t("body")}
          </p>
        </div>
      </div>
    </div>
  );
}
