"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AuthButton, useAuth } from "@/components/auth";

interface NavigationProps {
  currentPage?: string;
  variant?: "light" | "dark";
}

export default function Navigation({ currentPage, variant = "light" }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);
  const isDark = variant === "dark";

  // Get sign-in URL with callback (skip for homepage)
  const getSignInUrl = () => {
    if (pathname === '/') return '/sign-in';
    return `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`;
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md ${
      isDark
        ? "bg-[#020617]/80 border-b border-white/5"
        : "bg-white/95 border-b border-stone-200"
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <Image
            src="/skillvee-logo.png"
            alt="Skillvee"
            width={120}
            height={32}
            className={`object-contain ${isDark ? "brightness-0 invert" : ""}`}
            style={{ height: "auto" }}
            priority
          />
        </Link>

        {/* Desktop Navigation & Auth - Right Aligned */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="/product"
            className={`text-base font-medium transition-colors ${
              currentPage === "product"
                ? "text-primary"
                : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Product
          </Link>

          <Link
            href="/pricing"
            className={`text-base font-medium transition-colors ${
              currentPage === "pricing"
                ? "text-primary"
                : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/faq"
            className={`text-base font-medium transition-colors ${
              currentPage === "faq"
                ? "text-primary"
                : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-stone-600 hover:text-stone-900"
            }`}
          >
            FAQ
          </Link>

          <div className="flex items-center gap-4">
            {isSignedIn ? (
              <>
                <Link href="/recruiter/dashboard">
                  <Button variant={isDark ? "ghost" : "outline"} className={isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : ""}>
                    Dashboard
                  </Button>
                </Link>
                <AuthButton
                  variant={variant}
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonTrigger: "focus:shadow-none",
                    },
                  }}
                />
              </>
            ) : (
              <>
                <Link href={getSignInUrl()}>
                  <Button
                    variant="outline"
                    className={`rounded-full px-6 ${
                      isDark
                        ? "border-white/30 text-white bg-transparent hover:bg-white/10 hover:border-white/50"
                        : "text-stone-700 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    Sign in
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                    Request Demo
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className={`p-2 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg ${
              isDark
                ? "text-slate-400 hover:text-white"
                : "text-stone-600 hover:text-stone-900"
            }`}
            aria-label="Toggle mobile menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className={`md:hidden ${isDark ? "bg-[#020617] border-t border-white/5" : "bg-white border-t border-stone-200"}`}>
          <div className="px-6 py-4 space-y-4">
            <Link
              href="/product"
              className={`block py-2 px-2 text-lg rounded-lg transition-colors ${
                currentPage === "product"
                  ? "text-primary font-medium bg-primary/5"
                  : isDark
                    ? "text-slate-400 hover:text-white hover:bg-white/5"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Product
            </Link>

            <Link
              href="/pricing"
              className={`block py-2 px-2 text-lg rounded-lg transition-colors ${
                currentPage === "pricing"
                  ? "text-primary font-medium bg-primary/5"
                  : isDark
                    ? "text-slate-400 hover:text-white hover:bg-white/5"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>

            <Link
              href="/faq"
              className={`block py-2 px-2 text-lg rounded-lg transition-colors ${
                currentPage === "faq"
                  ? "text-primary font-medium bg-primary/5"
                  : isDark
                    ? "text-slate-400 hover:text-white hover:bg-white/5"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </Link>

            <div className={`pt-4 space-y-4 ${isDark ? "border-t border-white/10" : "border-t border-stone-200"}`}>
              {isSignedIn ? (
                <div className="space-y-4">
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className={`w-full ${isDark ? "border-white/20 text-white hover:bg-white/10" : ""}`}>
                      Dashboard
                    </Button>
                  </Link>
                  <AuthButton
                    variant={variant}
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                        userButtonTrigger: "focus:shadow-none",
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Link href={getSignInUrl()} onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className={`w-full ${isDark ? "border-white/20 text-white hover:bg-white/10" : ""}`}>
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/demo" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-full">
                      Request Demo
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
