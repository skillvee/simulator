import { type Metadata } from "next";
import { getTranslations } from "next-intl/server";
import FAQPageContent from "./FAQPageContent";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faqPage.metadata" });
  return {
    title: t("title"),
    description: t("description"),
    keywords: [
      "work simulation FAQ",
      "technical assessment questions",
      "hiring assessment help",
      "pre-hire evaluation FAQ",
      "candidate assessment platform",
    ],
  };
}

export default function FAQPage() {
  return <FAQPageContent />;
}
