"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SupportedLanguage, SUPPORTED_LANGUAGES } from "@/lib/core/language";

const LANGUAGE_OPTIONS: {
  value: SupportedLanguage;
  label: string;
  flag: string;
}[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "es", label: "Español", flag: "🇪🇸" },
];

interface LanguageSwitcherProps {
  variant?: "light" | "dark";
}

export function LanguageSwitcher({ variant = "light" }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [currentLocale, setCurrentLocale] = useState<SupportedLanguage>("en");
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    const pathSegments = pathname.split("/");
    const locale = pathSegments[1];
    if (locale === "en" || locale === "es") {
      setCurrentLocale(locale);
    }
  }, [pathname]);

  const shouldHide = pathname.match(/\/assessments\/[^/]+\/|\/invite\/[^/]+\//);
  if (shouldHide) {
    return null;
  }

  const handleLanguageChange = async (newLocale: SupportedLanguage) => {
    if (!SUPPORTED_LANGUAGES.includes(newLocale)) {
      return;
    }

    if (newLocale === currentLocale || isChanging) {
      return;
    }

    setIsChanging(true);

    try {
      if (session?.user) {
        const response = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ preferredLanguage: newLocale }),
        });

        if (!response.ok) {
          console.error("Failed to update language preference");
        }
      } else {
        document.cookie = `locale=${newLocale};Path=/;Max-Age=31536000`;
      }

      const pathSegments = pathname.split("/");
      pathSegments[1] = newLocale;
      const newPath = pathSegments.join("/");

      router.replace(newPath);
    } catch (error) {
      console.error("Error changing language:", error);
    } finally {
      setIsChanging(false);
    }
  };

  const current = LANGUAGE_OPTIONS.find((o) => o.value === currentLocale) ?? LANGUAGE_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isChanging}
        aria-label="Change language"
        className={`inline-flex items-center justify-center h-9 w-9 rounded-full text-base transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60 ${
          variant === "dark"
            ? "text-white/80 hover:text-white hover:bg-white/10"
            : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
        }`}
      >
        <span className="leading-none" aria-hidden>
          {current.flag}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = option.value === currentLocale;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => handleLanguageChange(option.value)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-base leading-none" aria-hidden>
                {option.flag}
              </span>
              <span className="flex-1">{option.label}</span>
              {isActive && <Check className="w-4 h-4 text-primary" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}