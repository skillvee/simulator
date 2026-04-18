import Link from "next/link";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("common.notFound");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>
      <Link
        href="/"
        className="mt-4 text-sm text-blue-600 hover:underline"
      >
        {t("goHome")}
      </Link>
    </div>
  );
}