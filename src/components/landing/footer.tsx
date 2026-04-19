import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function Footer() {
  const t = useTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-slate-900 text-slate-300 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="mb-4">
              <Image
                src="/skillvee-logo.png"
                alt="Skillvee"
                width={120}
                height={32}
                className="object-contain brightness-0 invert"
                style={{ width: "auto", height: "auto" }}
              />
            </div>
            <p className="text-blue-200/80 mb-4">
              {t("tagline")}
            </p>
            <p className="text-blue-200/80">
              <a href="mailto:hi@skillvee.com" className="hover:text-white transition-colors">
                hi@skillvee.com
              </a>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">{t("productHeading")}</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link href="/product" className="hover:text-white transition-colors">
                  {t("howItWorks")}
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors">
                  {t("requestDemo")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  {t("pricing")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">{t("resourcesHeading")}</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link href="/interview-questions" className="hover:text-white transition-colors">
                  {t("questionBank")}
                </Link>
              </li>
              <li>
                <Link href="/interview-guides" className="hover:text-white transition-colors">
                  {t("interviewGuides")}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">{t("legalHeading")}</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {t("termsOfService")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/50 pt-8 text-center">
          <p className="text-slate-400/60">
            {t("copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
