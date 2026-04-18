"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupportedLanguage, SUPPORTED_LANGUAGES } from "@/lib/core/language";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
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
    // Extract locale from pathname
    const pathSegments = pathname.split("/");
    const locale = pathSegments[1];
    if (locale === "en" || locale === "es") {
      setCurrentLocale(locale);
    }
  }, [pathname]);

  // Check if we should hide the switcher (assessments or invite pages)
  const shouldHide = pathname.match(/\/assessments\/[^/]+\/|\/invite\/[^/]+\//);
  if (shouldHide) {
    return null;
  }

  const handleLanguageChange = async (newLocale: string) => {
    if (!SUPPORTED_LANGUAGES.includes(newLocale as SupportedLanguage)) {
      return;
    }

    if (newLocale === currentLocale || isChanging) {
      return;
    }

    setIsChanging(true);

    try {
      // If authenticated, update user preference
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
        // For anonymous users, set cookie
        document.cookie = `locale=${newLocale};Path=/;Max-Age=31536000`;
      }

      // Update the URL locale segment
      const pathSegments = pathname.split("/");
      pathSegments[1] = newLocale;
      const newPath = pathSegments.join("/");

      // Use replace to avoid adding to history
      router.replace(newPath);
    } catch (error) {
      console.error("Error changing language:", error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Select
      value={currentLocale}
      onValueChange={handleLanguageChange}
      disabled={isChanging}
    >
      <SelectTrigger
        className={`w-[120px] h-9 rounded-lg shadow-sm focus:ring-2 focus:ring-primary/20 ${
          variant === "dark"
            ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
            : "bg-white border-stone-200 hover:bg-stone-50"
        }`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}